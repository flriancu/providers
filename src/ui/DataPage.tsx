import { useMemo, useState } from 'react';
import { parseCsv, toCsv } from '../domain/csv';
import { liveSelection } from '../domain/filter';
import { live, type DirectoryDoc } from '../domain/schema';
import { ProviderSearch } from '../domain/search';
import {
  applyImport,
  conflicts,
  defaultChoice,
  exportRows,
  facetWordsFrom,
  planImport,
  type ImportChoice,
  type ImportPlan,
  type ImportRow,
  type SingleField,
} from '../domain/transfer';
import { useI18n } from '../i18n';
import { en } from '../i18n/en';
import { ro } from '../i18n/ro';
import { LabelChip } from './LabelChip';
import { facetName } from './labelText';
import { href, type Route } from './route';
import type { Apply } from './types';
import { visibleProviders } from './visible';

/** The starting label groups' column names, in both interface languages. */
const FACET_WORDS = facetWordsFrom([en, ro]);

/** Today on this device, for the export's file name. */
const today = () => new Date().toISOString().slice(0, 10);

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
  const shown = useMemo(() => visibleProviders(doc, query, new ProviderSearch(doc)), [doc, query]);
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
  const { t, plural } = useI18n();
  const [file, setFile] = useState('');
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [choices, setChoices] = useState<(ImportChoice | null)[]>([]);
  const [done, setDone] = useState<string | null>(null);

  const read = async (f: File | undefined) => {
    setDone(null);
    if (!f) return;
    const next = planImport(doc, parseCsv(await f.text()), FACET_WORDS);
    setFile(f.name);
    setPlan(next);
    setChoices(next.rows.map(defaultChoice));
  };
  const choose = (i: number, c: ImportChoice) => setChoices((cs) => cs.map((x, j) => (j === i ? c : x)));
  /**
   * Rows still waiting whose only look-alike is one provider with the same name, and not an
   * earlier row: updating providers from a file (new labels, more contacts) is then one click.
   */
  const sameName = plan
    ? plan.rows.flatMap((r, i) =>
        choices[i] === null && !r.sameAsRow && r.duplicates.length === 1 && r.duplicates[0]!.reasons.includes('name')
          ? [{ i, into: r.duplicates[0]!.provider.id }]
          : [],
      )
    : [];
  const mergeSameName = () =>
    setChoices((cs) =>
      cs.map((c, i) => (sameName.find((s) => s.i === i) ? { kind: 'merge', into: sameName.find((s) => s.i === i)!.into, keep: {} } : c)),
    );
  const open = choices.filter((c) => c === null).length;
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
      });
      return r.doc;
    });
    if (code) return;
    setPlan(null);
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
                  {sameName.length > 1 && (
                    <p>
                      <button type="button" className="secondary" onClick={mergeSameName}>
                        {t('import.mergeAllSameName', { rows: plural('rows', sameName.length) })}
                      </button>
                    </p>
                  )}
                  <ol className="import-rows">
                    {groups.doubt.map(([row, i]) => (
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
        {row.input.labelIds.map((id) => {
          const l = doc.labels[id];
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
      </span>
    </span>
  );
}

/** A row that looks like a provider already there, or like an earlier row: the owner chooses. */
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
  const { t } = useI18n();
  const name = `row-${row.line}`;
  const why = (reasons: readonly string[]) => reasons.map((r) => t(`import.reason.${r as 'name'}`)).join(', ');
  return (
    <li className="doubt-row">
      <RowSummary row={row} doc={doc} />
      {row.sameAsRow && <p className="help">{t('import.likeRow', { line: row.sameAsRow.line, reasons: why(row.sameAsRow.reasons) })}</p>}
      {row.duplicates.map((d) => (
        <p key={d.provider.id} className="help">
          {t('import.likeProvider', { name: d.provider.name, reasons: why(d.reasons) })}
        </p>
      ))}
      <fieldset className="choice">
        <legend className="sr-only">{t('import.choiceFor', { name: row.input.name })}</legend>
        <label className="check">
          <input type="radio" name={name} checked={choice?.kind === 'add'} onChange={() => choose({ kind: 'add' })} />
          {t('import.keepBoth')}
        </label>
        <label className="check">
          <input type="radio" name={name} checked={choice?.kind === 'skip'} onChange={() => choose({ kind: 'skip' })} />
          {t('import.skip')}
        </label>
        {row.duplicates.map((d) => (
          <label key={d.provider.id} className="check">
            <input
              type="radio"
              name={name}
              checked={choice?.kind === 'merge' && choice.into === d.provider.id}
              onChange={() => choose({ kind: 'merge', into: d.provider.id, keep: {} })}
            />
            {t('import.mergeInto', { name: d.provider.name })}
          </label>
        ))}
      </fieldset>
      {choice?.kind === 'merge' && <MergePicks doc={doc} row={row} choice={choice} choose={choose} />}
    </li>
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
  const existing = doc.providers[choice.into]!;
  const fields = conflicts(existing, row.input);
  const labels: Record<SingleField, string> = {
    name: t('field.name'),
    contactPerson: t('field.contactPerson'),
    address: t('field.address'),
    notes: t('field.notes'),
  };
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
