import { useMemo, useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { decodeCsv, parseCsv, toCsv, type CsvEncoding } from '../domain/csv';
import { dayOf } from '../domain/days';
import { liveSelection } from '../domain/filter';
import { fold } from '../domain/fold';
import { live, own, type DirectoryDoc } from '../domain/schema';

import {
  applyImport,
  conflicts,
  defaultChoice,
  exportRows,
  mergeChanges,
  planImport,
  type ImportChoice,
  type ImportPlan,
  type ImportRow,
  type MergeChanges,
  type SingleField,
} from '../domain/transfer';
import type { EditErrorCode } from '../domain/edits';
import { useI18n } from '../i18n';
import { LabelChip } from './LabelChip';
import { FACET_WORDS, facetName } from './labelText';
import { href, type Route } from './route';
import type { Apply } from './types';
import { useProviderSearch } from './useProviderSearch';
import { visibleProviders } from './visible';

/** Today on this device, for the export's file name. */
const today = () => dayOf(new Date());

/** Saves text as a file in the browser's downloads. */
function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * FR-21..24: CSV export of all providers or of those the list shows, and CSV import with a
 * preview of every change; nothing is saved until Import, and every possible duplicate waits for
 * the owner's choice (D-12, NFR-09).
 */
export function DataPage({ doc, apply, route }: { doc: DirectoryDoc; apply: Apply; route: Route }) {
  const { t, plural } = useI18n();
  const query = useMemo(() => ({ ...route.query, selection: liveSelection(doc, route.query.selection) }), [doc, route.query]);
  const all = live(doc.providers);
  const find = useProviderSearch(doc);
  const shown = useMemo(() => visibleProviders(doc, query, find), [doc, query, find]);
  const narrowed = shown.length !== all.length;
  const exportCsv = (providers: typeof all) =>
    download(`providers-${today()}.csv`, toCsv(exportRows(doc, providers, (f) => facetName(f, t))));

  return (
    <div className="data-page">
      <a className="back" href={href({ page: 'list' }, route.query)}>
        {t('detail.back')}
      </a>
      <h2>{t('data.heading')}</h2>

      <section aria-labelledby="export-heading">
        <h3 id="export-heading">{t('data.exportHeading')}</h3>
        <p className="help">{t('data.exportHelp')}</p>
        <div className="actions">
          <button type="button" disabled={!all.length} onClick={() => exportCsv(all)}>
            {t('data.exportAll', { providers: plural('providers', all.length) })}
          </button>
          {narrowed && (
            <button type="button" className="secondary" disabled={!shown.length} onClick={() => exportCsv(shown)}>
              {t('data.exportShown', { providers: plural('providers', shown.length) })}
            </button>
          )}
        </div>
      </section>

      <ImportSection doc={doc} apply={apply} />
    </div>
  );
}

function ImportSection({ doc, apply }: { doc: DirectoryDoc; apply: Apply }) {
  const { t, plural, list } = useI18n();
  const [file, setFile] = useState('');
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [choices, setChoices] = useState<(ImportChoice | null)[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<EditErrorCode | null>(null);
  /** The file's rows and how its bytes were read, kept to plan again if the directory changes. */
  const [csv, setCsv] = useState<{ rows: string[][]; encoding: CsvEncoding } | null>(null);

  const preview = (rows: string[][], against: DirectoryDoc) => {
    const next = planImport(against, rows, FACET_WORDS);
    setPlan(next);
    setChoices(next.rows.map(defaultChoice));
    setFolded(new Set());
  };
  const read = async (f: File | undefined) => {
    setDone(null);
    setError(null);
    if (!f) return;
    const { text, encoding } = decodeCsv(new Uint8Array(await f.arrayBuffer()));
    const rows = parseCsv(text);
    setFile(f.name);
    setCsv({ rows, encoding });
    preview(rows, doc);
  };
  const choose = (i: number, c: ImportChoice) => setChoices((cs) => cs.map((x, j) => (j === i ? c : x)));
  /** Rows decided together with "Merge all": they fold into one line and stay there when changed. */
  const [folded, setFolded] = useState<ReadonlySet<number>>(() => new Set());
  const foldSummary = useRef<HTMLElement>(null);
  /**
   * Rows still waiting whose only look-alike in the directory is one provider with the same name:
   * updating providers from a file (new labels, more contacts) is then one click. A row that
   * repeats an earlier one of the file goes into the same provider, after it.
   */
  const sameName = plan
    ? plan.rows.flatMap((r, i) =>
        choices[i] === null && r.duplicates.length === 1 && r.duplicates[0]!.reasons.includes('name')
          ? [{ i, into: r.duplicates[0]!.provider.id }]
          : [],
      )
    : [];
  /** Decides rows at once; they fold into one line, which takes the focus their buttons had. */
  const decide = (decided: Map<number, ImportChoice>) => {
    flushSync(() => {
      setChoices((cs) => cs.map((c, i) => decided.get(i) ?? c));
      setFolded((f) => new Set([...f, ...decided.keys()]));
    });
    foldSummary.current?.focus();
  };
  const mergeSameName = () => decide(new Map(sameName.map((s) => [s.i, { kind: 'merge', into: s.into, keep: {} }])));
  const openRows = choices.flatMap((c, i) => (c === null ? [i] : []));
  const decideOpen = (choice: ImportChoice) => decide(new Map(openRows.map((i) => [i, choice])));
  const open = openRows.length;
  const kept = plan ? plan.rows.filter((r, i) => !r.problem && choices[i] && choices[i]!.kind !== 'skip').length : 0;

  const run = () => {
    if (!plan) return;
    let summary = '';
    const code = apply((d, ctx) => {
      const r = applyImport(d, plan, choices, ctx);
      summary = t('import.done', {
        added: plural('providers', r.added),
        merged: plural('providers', r.merged),
        skipped: plural('rows', r.skipped),
        labels: plural('labels', r.labelsCreated),
        addedCount: r.added,
        mergedCount: r.merged,
        skippedCount: r.skipped,
        labelsCount: r.labelsCreated,
      });
      return r.doc;
    });
    setError(code);
    if (code) {
      // The preview went stale (a provider to merge into was deleted elsewhere): plan again.
      if (code === 'importStale' && csv) preview(csv.rows, doc);
      return;
    }
    setPlan(null);
    setCsv(null);
    setFile('');
    setDone(summary);
  };

  const groups = plan
    ? {
        doubt: plan.rows.map((r, i) => [r, i] as const).filter(([r]) => !r.problem && (r.duplicates.length || r.sameAsRow)),
        add: plan.rows.map((r, i) => [r, i] as const).filter(([r]) => !r.problem && !r.duplicates.length && !r.sameAsRow),
        problem: plan.rows.map((r, i) => [r, i] as const).filter(([r]) => r.problem),
      }
    : null;

  return (
    <section aria-labelledby="import-heading">
      <h3 id="import-heading">{t('data.importHeading')}</h3>
      <p className="help">{t('data.importHelp')}</p>
      {/* The browser's own file button speaks the system's language and looks unlike the app's
          buttons: the input is hidden (still focusable), and its label is the button. */}
      <label className="file-field button secondary">
        <input
          className="sr-only"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            void read(e.target.files?.[0]);
            e.target.value = ''; // choosing the same file again reads it again
          }}
        />
        {t('data.chooseFile')}
      </label>
      {file && <span className="muted file-name">{file}</span>}
      {done && (
        <div className="notice" role="status">
          <p>{done}</p>
        </div>
      )}

      {plan && groups && (
        <div className="import-preview" aria-label={t('import.previewOf', { file })}>
          {plan.noNameColumn ? (
            <p className="error" role="alert">
              {t('import.noNameColumn')}
            </p>
          ) : (
            <>
              <p>
                {t('import.summary', {
                  rows: plural('rows', plan.rows.length),
                  parts: [
                    groups.add.length && t('import.partAdd', { n: groups.add.length }),
                    groups.doubt.length && t('import.partDoubt', { n: groups.doubt.length }),
                    groups.problem.length && t('import.partProblem', { n: groups.problem.length }),
                  ]
                    .filter(Boolean)
                    .join(', '),
                })}
              </p>
              {error && (
                <p className="error" role="alert">
                  {t(`err.${error}`)}
                </p>
              )}
              {csv?.encoding === 'windows-1250' && <p className="help">{t('import.encoding')}</p>}
              {plan.misaligned.length > 0 && <p className="help">{t('import.misaligned', { lines: list(plan.misaligned.map(String)) })}</p>}
              {plan.ignoredColumns.length > 0 && <p className="help">{t('import.ignored', { columns: plan.ignoredColumns.join(', ') })}</p>}
              {plan.newLabels.length > 0 && (
                <div className="new-labels">
                  <p>{t('import.newLabels', { labels: plural('labels', plan.newLabels.length) })}</p>
                  {live(doc.facets)
                    .filter((f) => plan.newLabels.some((l) => l.facetId === f.id))
                    .map((f) => (
                      <p key={f.id} className="chips">
                        <span className="muted">{facetName(f, t)}: </span>
                        {plan.newLabels
                          .filter((l) => l.facetId === f.id)
                          .map((l) => (
                            <LabelChip key={l.name} color="grey">
                              {l.name}
                            </LabelChip>
                          ))}
                      </p>
                    ))}
                </div>
              )}

              {groups.doubt.length > 0 && (
                <>
                  <h4>{t('import.doubtHeading', { rows: plural('rows', groups.doubt.length) })}</h4>
                  {(sameName.length > 1 || open > 1) && (
                    <p className="actions">
                      {sameName.length > 1 && (
                        <button type="button" className="secondary" onClick={mergeSameName}>
                          {t('import.mergeAllSameName', { rows: plural('rows', sameName.length) })}
                        </button>
                      )}
                      {open > 1 && (
                        <>
                          <button type="button" className="secondary" onClick={() => decideOpen({ kind: 'add' })}>
                            {t('import.addAllOpen', { rows: plural('rows', open), n: open })}
                          </button>
                          <button type="button" className="secondary" onClick={() => decideOpen({ kind: 'skip' })}>
                            {t('import.skipAllOpen', { rows: plural('rows', open), n: open })}
                          </button>
                        </>
                      )}
                    </p>
                  )}
                  {groups.doubt.some(([, i]) => folded.has(i)) && (
                    <FoldedRows
                      doc={doc}
                      rows={groups.doubt.filter(([, i]) => folded.has(i))}
                      choices={choices}
                      choose={choose}
                      summaryRef={foldSummary}
                    />
                  )}
                  {folded.size > 0 && open > 0 && <p className="help">{t('import.stillOpen', { rows: plural('rows', open) })}</p>}
                  <ol className="import-rows">
                    {groups.doubt
                      .filter(([, i]) => !folded.has(i))
                      .map(([row, i]) => (
                        <DoubtRow key={row.line} doc={doc} row={row} choice={choices[i] ?? null} choose={(c) => choose(i, c)} />
                      ))}
                  </ol>
                </>
              )}
              {groups.add.length > 0 && (
                <details className="import-add">
                  <summary>{t('import.addHeading', { rows: plural('rows', groups.add.length) })}</summary>
                  <ol className="import-rows">
                    {groups.add.map(([row]) => (
                      <li key={row.line}>
                        <RowSummary row={row} doc={doc} />
                      </li>
                    ))}
                  </ol>
                </details>
              )}
              {groups.problem.length > 0 && (
                <p className="help">{t('import.problems', { lines: groups.problem.map(([r]) => r.line).join(', ') })}</p>
              )}

              <div className="actions">
                <button type="button" disabled={open > 0 || kept === 0} onClick={run}>
                  {open > 0
                    ? t('import.chooseFirst', { rows: plural('rows', open) })
                    : t('import.run', { providers: plural('providers', kept) })}
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setPlan(null);
                    setFile('');
                  }}
                >
                  {t('form.cancel')}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

/** A row's labels as chips: those that exist, then those the import creates (grey). */
function RowLabels({ row, doc }: { row: ImportRow; doc: DirectoryDoc }) {
  return (
    <>
      {row.input.labelIds.map((id) => {
        const l = own(doc.labels, id);
        return l ? (
          <LabelChip key={id} color={l.color}>
            {l.name}
          </LabelChip>
        ) : null;
      })}
      {row.newLabels.map((l) => (
        <LabelChip key={`${l.facetId}|${l.name}`} color="grey">
          {l.name}
        </LabelChip>
      ))}
    </>
  );
}

/** One row as it would be saved: name, contacts, labels (existing and to create). */
function RowSummary({ row, doc }: { row: ImportRow; doc: DirectoryDoc }) {
  const { t } = useI18n();
  const contacts = [...row.input.phones, ...row.input.emails, ...row.input.links];
  return (
    <span className="row-summary">
      <span className="muted small">{t('import.line', { line: row.line })} </span>
      <strong>{row.input.name}</strong>
      {contacts.length > 0 && <span className="muted small"> · {contacts.slice(0, 3).join(' · ')}</span>}
      <span className="chips">
        <RowLabels row={row} doc={doc} />
      </span>
    </span>
  );
}

/** "Merging adds 1 label and 1 email.": what the merge changes, in one sentence. */
function addsText(c: MergeChanges, i18n: ReturnType<typeof useI18n>) {
  const { t, plural, list } = i18n;
  const parts = [
    c.labels && plural('labels', c.labels),
    c.phones && plural('phones', c.phones),
    c.emails && plural('emails', c.emails),
    c.links && plural('links', c.links),
    ...c.filled.map((f) => t(`import.fill.${f}`)),
  ].filter((p): p is string => Boolean(p));
  return parts.length ? t('import.adds', { parts: list(parts) }) : t('import.addsNothing');
}

/**
 * A row that looks like a provider already there, or like an earlier row: one line says why and
 * what a merge adds, a segmented choice decides, and the row's full contents wait behind Details.
 */
function DoubtRow({
  doc,
  row,
  choice,
  choose,
}: {
  doc: DirectoryDoc;
  row: ImportRow;
  choice: ImportChoice | null;
  choose: (c: ImportChoice) => void;
}) {
  const i18n = useI18n();
  const { t } = i18n;
  const [open, setOpen] = useState(false);
  const name = `row-${row.line}`;
  const why = (reasons: readonly string[]) => i18n.list(reasons.map((r) => t(`import.reason.${r as 'name'}`)));
  const only = row.duplicates.length === 1 ? row.duplicates[0] : undefined;
  const target = choice?.kind === 'merge' ? own(doc.providers, choice.into) : only?.provider;
  const like = row.duplicates.map((d) =>
    fold(d.provider.name) === fold(row.input.name)
      ? t('import.likeSameName', { reasons: why(d.reasons) })
      : t('import.likeProvider', { name: d.provider.name, reasons: why(d.reasons) }),
  );
  const sentences = [
    ...(row.sameAsRow ? [t('import.likeRow', { line: row.sameAsRow.line, reasons: why(row.sameAsRow.reasons) })] : []),
    ...like,
    ...(target ? [addsText(mergeChanges(target, row), i18n)] : []),
  ];
  const option = (key: string, checked: boolean, label: string, c: ImportChoice) => (
    <label key={key}>
      <input type="radio" name={name} checked={checked} onChange={() => choose(c)} />
      {label}
    </label>
  );
  return (
    <li className="doubt-row">
      <div className="doubt-what">
        <p className="doubt-head">
          <strong>{row.input.name}</strong> <RowLabels row={row} doc={doc} />
        </p>
        <p className="doubt-why">
          {sentences.join(' ')}{' '}
          <button
            type="button"
            className="link-button inline-toggle"
            aria-expanded={open}
            aria-controls={`${name}-details`}
            aria-label={t('import.detailsOf', { name: row.input.name })}
            onClick={() => setOpen((o) => !o)}
          >
            <span aria-hidden="true">{open ? '▾' : '▸'}</span> {t('import.details')}
          </button>
        </p>
      </div>
      <fieldset className="segmented">
        <legend className="sr-only">{t('import.choiceFor', { name: row.input.name })}</legend>
        {row.duplicates.map((d) =>
          option(
            d.provider.id,
            choice?.kind === 'merge' && choice.into === d.provider.id,
            only ? t('import.merge') : t('import.mergeInto', { name: d.provider.name }),
            { kind: 'merge', into: d.provider.id, keep: {} },
          ),
        )}
        {option('add', choice?.kind === 'add', t('import.keepBoth'), { kind: 'add' })}
        {option('skip', choice?.kind === 'skip', t('import.skip'), { kind: 'skip' })}
      </fieldset>
      <RowDetails id={`${name}-details`} row={row} hidden={!open} />
      {choice?.kind === 'merge' && <MergePicks doc={doc} row={row} choice={choice} choose={choose} />}
    </li>
  );
}

/** Everything the file says about a row, field by field. */
function RowDetails({ id, row, hidden }: { id: string; row: ImportRow; hidden: boolean }) {
  const { t } = useI18n();
  const r = row.input;
  const fields: [string, string][] = [
    [t('field.contactPerson'), r.contactPerson],
    [t('field.phones'), r.phones.join(', ')],
    [t('field.emails'), r.emails.join(', ')],
    [t('field.links'), r.links.join(', ')],
    [t('field.address'), r.address],
    [t('field.notes'), r.notes],
  ];
  return (
    <div id={id} className="row-details small" hidden={hidden}>
      <p className="muted">{t('import.line', { line: row.line })}</p>
      {fields
        .filter(([, v]) => v.trim())
        .map(([k, v]) => (
          <p key={k}>
            <span className="muted">{k}: </span>
            {v}
          </p>
        ))}
    </div>
  );
}

/**
 * The rows decided with "Merge all", folded into one line that counts each choice. Opened, they
 * show as in the main list and can still be changed; a changed row stays here.
 */
function FoldedRows({
  doc,
  rows,
  choices,
  choose,
  summaryRef,
}: {
  doc: DirectoryDoc;
  rows: (readonly [ImportRow, number])[];
  choices: readonly (ImportChoice | null)[];
  choose: (i: number, c: ImportChoice) => void;
  summaryRef: RefObject<HTMLElement | null>;
}) {
  const { t, plural, list } = useI18n();
  const count = (kind: ImportChoice['kind']) => rows.filter(([, i]) => choices[i]?.kind === kind).length;
  const parts = (
    [
      ['merge', 'import.foldMerge'],
      ['add', 'import.foldAdd'],
      ['skip', 'import.foldSkip'],
    ] as const
  ).flatMap(([kind, key]) => (count(kind) ? [t(key, { rows: plural('rows', count(kind)) })] : []));
  const differ = rows.filter(([row, i]) => {
    const c = choices[i];
    return c?.kind === 'merge' && conflicts(own(doc.providers, c.into)!, row.input).length > 0;
  }).length;
  return (
    <>
      <details className="import-fold">
        <summary ref={summaryRef}>{list(parts)}</summary>
        <ol className="import-rows">
          {rows.map(([row, i]) => (
            <DoubtRow key={row.line} doc={doc} row={row} choice={choices[i] ?? null} choose={(c) => choose(i, c)} />
          ))}
        </ol>
      </details>
      {differ > 0 && <p className="help">{t('import.foldDiffer', { rows: plural('rows', differ) })}</p>}
    </>
  );
}

/** FR-24: for each single field both have, which value the merged provider keeps. */
function MergePicks({
  doc,
  row,
  choice,
  choose,
}: {
  doc: DirectoryDoc;
  row: ImportRow;
  choice: Extract<ImportChoice, { kind: 'merge' }>;
  choose: (c: ImportChoice) => void;
}) {
  const { t } = useI18n();
  const existing = own(doc.providers, choice.into)!;
  const fields = conflicts(existing, row.input);
  const labels: Record<SingleField, string> = {
    name: t('field.name'),
    contactPerson: t('field.contactPerson'),
    address: t('field.address'),
    notes: t('field.notes'),
  };
  if (!fields.length) return null; // lists and labels combine without a choice
  return (
    <div className="merge-picks">
      <p className="help">{t('import.mergeHelp')}</p>
      {fields.map((f) => (
        <fieldset key={f} className="choice">
          <legend>{labels[f]}</legend>
          {(['existing', 'incoming'] as const).map((side) => (
            <label key={side} className="check">
              <input
                type="radio"
                name={`row-${row.line}-${f}`}
                checked={(choice.keep[f] ?? 'existing') === side}
                onChange={() => choose({ ...choice, keep: { ...choice.keep, [f]: side } })}
              />
              {t(side === 'existing' ? 'import.keepExisting' : 'import.useIncoming', {
                value: (side === 'existing' ? existing[f] : row.input[f]).slice(0, 80),
              })}
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}
