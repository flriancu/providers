import { useId, useState } from 'react';
import {
  createFacet,
  createLabel,
  deleteLabel,
  mergeLabels,
  moveLabel,
  nextColor,
  renameFacet,
  renameLabel,
  type EditErrorCode,
} from '../domain/edits';
import { rarelyUsedLabels } from '../domain/labels';
import { LABEL_COLORS, live, type DirectoryDoc, type Facet, type Label, type LabelColor } from '../domain/schema';
import { coverage } from '../domain/sharing';
import { useI18n } from '../i18n';
import { ColorDot, LabelChip } from './LabelChip';
import { facetName, facetTree, labelName, labelPath, orderedFacets } from './labelText';
import type { Apply } from './types';

const splitAliases = (text: string) => text.split(',');

/**
 * FR-04..08: labels by facet. Each row is the label, its count and one Edit button; everything
 * that changes a label (name, colour, other words, place, merge, delete) is in its editor.
 */
export function LabelsPage({ doc, apply }: { doc: DirectoryDoc; apply: Apply }) {
  const { t, plural } = useI18n();
  const [editing, setEditing] = useState<string | null>(null);
  const rare = rarelyUsedLabels(doc);

  return (
    <div className="labels-page">
      <h2>{t('labels.heading')}</h2>
      <p className="muted">{t('labels.intro')}</p>
      <div className="facets-grid">
        {orderedFacets(doc).map((facet) => (
          <FacetSection key={facet.id} doc={doc} apply={apply} facet={facet} editing={editing} setEditing={setEditing} />
        ))}
      </div>
      <AddFacet apply={apply} />
      <section aria-labelledby="rare-heading">
        <h3 id="rare-heading">{t('labels.rare')}</h3>
        <p className="muted">{t('labels.rareHelp')}</p>
        {rare.length === 0 ? (
          <p>{t('labels.rareNone')}</p>
        ) : (
          <ul className="plain">
            {rare.map(({ label, count }) => (
              <li key={label.id}>
                <LabelChip color={label.color}>{labelPath(doc, label.id)}</LabelChip>{' '}
                <span className="muted small">{plural('providers', count)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function FacetSection(props: {
  doc: DirectoryDoc;
  apply: Apply;
  facet: Facet;
  editing: string | null;
  setEditing: (id: string | null) => void;
}) {
  const { doc, apply, facet, editing, setEditing } = props;
  const { t, plural } = useI18n();
  const tree = facetTree(doc, facet.id);
  const ids = useId();
  const [renaming, setRenaming] = useState(false);

  const row = (label: Label, child: boolean) => {
    const open = editing === label.id;
    const name = labelName(label);
    return (
      <li key={label.id} className={child ? 'child' : undefined}>
        <div className="label-row">
          <span>
            <LabelChip color={label.color}>
              <strong>{name}</strong>
            </LabelChip>{' '}
            <span className="muted small">{plural('providers', coverage(doc, label.id))}</span>
          </span>
          <button
            type="button"
            className="link-button"
            aria-expanded={open}
            aria-label={t('labels.editLabel', { label: name })}
            onClick={() => setEditing(open ? null : label.id)}
          >
            {t('labels.edit')}
          </button>
        </div>
        {open && <LabelEditor doc={doc} apply={apply} label={label} done={() => setEditing(null)} />}
      </li>
    );
  };

  return (
    <section aria-labelledby={`${ids}-heading`} className="facet-section">
      <div className="pane-header">
        <h3 id={`${ids}-heading`}>{facetName(facet, t)}</h3>
        <button
          type="button"
          className="link-button"
          aria-expanded={renaming}
          aria-label={t('labels.renameFacet', { facet: facetName(facet, t) })}
          onClick={() => setRenaming(!renaming)}
        >
          {t('labels.rename')}
        </button>
      </div>
      {renaming && <RenameFacet apply={apply} facet={facet} done={() => setRenaming(false)} />}
      <ul className="label-tree">
        {tree.map(({ label, children }) => (
          <li key={label.id} className="branch">
            <ul className="plain">
              {row(label, false)}
              {children.map((c) => row(c, true))}
            </ul>
          </li>
        ))}
      </ul>
      <AddLabel doc={doc} apply={apply} facet={facet} />
    </section>
  );
}

function ErrorText({ code }: { code: EditErrorCode | null }) {
  const { t } = useI18n();
  return code ? (
    <p className="error" role="alert">
      {t(`err.${code}`)}
    </p>
  ) : null;
}

function NameField({ value, set, label }: { value: string; set: (v: string) => void; label: string }) {
  return (
    <label>
      {label}
      <input value={value} onChange={(e) => set(e.target.value)} autoComplete="off" />
    </label>
  );
}

function AliasesField({ value, set }: { value: string; set: (v: string) => void }) {
  const { t } = useI18n();
  return (
    <label>
      {t('labels.aliasesField')}
      <span className="help">{t('labels.aliasesHelp')}</span>
      <input value={value} onChange={(e) => set(e.target.value)} autoComplete="off" />
    </label>
  );
}

/** D-31: the palette as radio buttons, each with its colour and its name. */
function ColorField({ value, set }: { value: LabelColor; set: (c: LabelColor) => void }) {
  const { t } = useI18n();
  const name = useId();
  return (
    <fieldset>
      <legend>{t('labels.color')}</legend>
      <div className="color-choices">
        {LABEL_COLORS.map((c) => (
          <label key={c} className="check">
            <input type="radio" name={name} value={c} checked={value === c} onChange={() => set(c)} />
            <ColorDot color={c} />
            {t(`color.${c}`)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Where a label can hang, for tree facets: the top, or under another top-level label. */
function ParentField({ doc, label, value, set }: { doc: DirectoryDoc; label?: Label; value: string; set: (v: string) => void }) {
  const { t } = useI18n();
  const facetId = label?.facetId;
  const parents = live(doc.labels).filter((l) => l.facetId === facetId && !l.parentId && l.id !== label?.id);
  return (
    <label>
      {t('labels.parent')}
      <select value={value} onChange={(e) => set(e.target.value)}>
        <option value="">{t('labels.top')}</option>
        {parents.map((p) => (
          <option key={p.id} value={p.id}>
            {labelName(p)}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * One editor per label: what it is called, its colour, the words that find it and where it
 * hangs, saved together; below, the rarer merge and delete.
 */
function LabelEditor({ doc, apply, label, done }: { doc: DirectoryDoc; apply: Apply; label: Label; done: () => void }) {
  const { t, plural } = useI18n();
  const [name, setName] = useState(label.name);
  const [color, setColor] = useState<LabelColor>(label.color);
  const [aliases, setAliases] = useState(label.aliases.join(', '));
  const [parent, setParent] = useState(label.parentId ?? '');
  const [target, setTarget] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<EditErrorCode | null>(null);
  const tree = doc.facets[label.facetId]?.kind === 'tree';
  const own = labelName(label);
  const run = (change: Parameters<Apply>[0]) => {
    const code = apply(change);
    setError(code);
    if (!code) done();
  };
  const others = live(doc.labels).filter((l) => l.facetId === label.facetId && l.id !== label.id);

  return (
    <div className="inline-form" role="group" aria-label={t('labels.editLabel', { label: own })}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run((d, ctx) => {
            let next = renameLabel(d, label.id, name, color, splitAliases(aliases), ctx);
            if (tree && (parent || undefined) !== label.parentId) next = moveLabel(next, label.id, parent || undefined, ctx);
            return next;
          });
        }}
      >
        <NameField value={name} set={setName} label={t('labels.name')} />
        <ColorField value={color} set={setColor} />
        <AliasesField value={aliases} set={setAliases} />
        {tree && <ParentField doc={doc} label={label} value={parent} set={setParent} />}
        <ErrorText code={error} />
        <div className="actions">
          <button type="submit">{t('form.save')}</button>
          <button type="button" className="secondary" onClick={done}>
            {t('form.cancel')}
          </button>
        </div>
      </form>

      {
        <div className="editor-more">
          <form onSubmit={(e) => (e.preventDefault(), run((d, ctx) => mergeLabels(d, label.id, target, ctx)))}>
            <label>
              {t('labels.mergeInto', { label: own })}
              <span className="help">{t('labels.mergeHelp', { label: own })}</span>
              <select value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="" disabled>
                  {t('labels.choose')}
                </option>
                {others.map((l) => (
                  <option key={l.id} value={l.id}>
                    {labelPath(doc, l.id)}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="secondary" disabled={!target}>
              {t('labels.merge')}
            </button>
          </form>
          {confirmDelete ? (
            <div role="group" aria-label={t('labels.delete')}>
              <p>{t('labels.deleteConfirm', { label: own, providers: plural('providers', coverage(doc, label.id)) })}</p>
              <div className="actions">
                <button type="button" className="danger" onClick={() => run((d, ctx) => deleteLabel(d, label.id, ctx))}>
                  {t('labels.deleteYes', { label: own })}
                </button>
                <button type="button" className="secondary" onClick={() => setConfirmDelete(false)}>
                  {t('detail.deleteNo')}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="secondary" onClick={() => setConfirmDelete(true)}>
              {t('labels.delete')}
            </button>
          )}
        </div>
      }
    </div>
  );
}

function AddLabel({ doc, apply, facet }: { doc: DirectoryDoc; apply: Apply; facet: Facet }) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [color, setColor] = useState<LabelColor>(() => nextColor(doc, facet.id));
  const [aliases, setAliases] = useState('');
  const [parent, setParent] = useState('');
  const [error, setError] = useState<EditErrorCode | null>(null);
  return (
    <details className="add-label">
      <summary aria-label={t('labels.addTo', { facet: facetName(facet, t) })}>{t('labels.add')}</summary>
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          let added: DirectoryDoc | null = null;
          const code = apply((d, ctx) => {
            added = createLabel(
              d,
              { facetId: facet.id, ...(parent && { parentId: parent }), name, color, aliases: splitAliases(aliases) },
              ctx,
            ).doc;
            return added;
          });
          setError(code);
          if (!code && added) {
            setName('');
            setAliases('');
            // The next label starts with the next least-used colour.
            setColor(nextColor(added, facet.id));
          }
        }}
      >
        <NameField value={name} set={setName} label={t('labels.name')} />
        <ColorField value={color} set={setColor} />
        <AliasesField value={aliases} set={setAliases} />
        {facet.kind === 'tree' && <ParentField doc={doc} label={{ facetId: facet.id } as Label} value={parent} set={setParent} />}
        <ErrorText code={error} />
        <button type="submit">{t('labels.addButton')}</button>
      </form>
    </details>
  );
}

function RenameFacet({ apply, facet, done }: { apply: Apply; facet: Facet; done: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(facetName(facet, t));
  const [error, setError] = useState<EditErrorCode | null>(null);
  return (
    <form
      className="inline-form"
      onSubmit={(e) => {
        e.preventDefault();
        const code = apply((d, ctx) => renameFacet(d, facet.id, name, ctx));
        setError(code);
        if (!code) done();
      }}
    >
      <NameField value={name} set={setName} label={t('labels.facetName')} />
      <ErrorText code={error} />
      <div className="actions">
        <button type="submit">{t('form.save')}</button>
        <button type="button" className="secondary" onClick={done}>
          {t('form.cancel')}
        </button>
      </div>
    </form>
  );
}

function AddFacet({ apply }: { apply: Apply }) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [error, setError] = useState<EditErrorCode | null>(null);
  return (
    <details className="add-label">
      <summary>{t('labels.addFacet')}</summary>
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          const code = apply((d, ctx) => createFacet(d, name, ctx).doc);
          setError(code);
          if (!code) setName('');
        }}
      >
        <NameField value={name} set={setName} label={t('labels.facetName')} />
        <ErrorText code={error} />
        <button type="submit">{t('labels.addFacetButton')}</button>
      </form>
    </details>
  );
}
