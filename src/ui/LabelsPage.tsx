import { useId, useLayoutEffect, useState } from 'react';
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
import { FACET_WORDS, facetLabels, facetName, labelName, orderedFacets } from './labelText';
import type { Apply } from './types';

const splitAliases = (text: string) => text.split(',');

/**
 * FR-04..08: labels by facet, one level (D-35). Each row is the label, its count and one Edit
 * button; everything that changes a label (name, colour, other words, merge, delete) is in its
 * editor.
 */
export function LabelsPage({ doc, apply }: { doc: DirectoryDoc; apply: Apply }) {
  const { t, plural } = useI18n();
  const [editing, setEditing] = useState<string | null>(null);
  const rare = rarelyUsedLabels(doc);

  // Opens at its top, not as far down as the page before (a long provider form) was scrolled.
  useLayoutEffect(() => {
    window.scrollTo(0, 0); // a block: scrollTo returns a Promise in current browsers, never an effect's result
  }, []);

  return (
    <div className="labels-page">
      {/* The underlined Labels tab names the page; the heading stays for screen readers' outline. */}
      <h2 className="sr-only">{t('labels.heading')}</h2>
      <p className="help">{t('labels.intro')}</p>
      <div className="facets-grid">
        {orderedFacets(doc).map((facet) => (
          <FacetSection key={facet.id} doc={doc} apply={apply} facet={facet} editing={editing} setEditing={setEditing} />
        ))}
      </div>
      <AddFacet apply={apply} />
      <section aria-labelledby="rare-heading">
        <h3 id="rare-heading">{t('labels.rare')}</h3>
        <p className="help">{t('labels.rareHelp')}</p>
        {rare.length === 0 ? (
          <p>{t('labels.rareNone')}</p>
        ) : (
          <ul className="plain">
            {rare.map(({ label, count }) => (
              <li key={label.id}>
                <LabelChip color={label.color}>{labelName(label)}</LabelChip>{' '}
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
  const labels = facetLabels(doc, facet.id);
  const ids = useId();
  const [renaming, setRenaming] = useState(false);

  const row = (label: Label) => {
    const open = editing === label.id;
    const name = labelName(label);
    return (
      <li key={label.id}>
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
      <ul className="label-list">{labels.map(row)}</ul>
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

/**
 * One editor per label: what it is called, its colour and the words that find it, saved
 * together; below, the rarer merge and delete.
 */
function LabelEditor({ doc, apply, label, done }: { doc: DirectoryDoc; apply: Apply; label: Label; done: () => void }) {
  const { t, tx, plural } = useI18n();
  const [name, setName] = useState(label.name);
  const [color, setColor] = useState<LabelColor>(label.color);
  const [aliases, setAliases] = useState(label.aliases.join(', '));
  const [target, setTarget] = useState('');
  const [group, setGroup] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<EditErrorCode | null>(null);
  const own = labelName(label);
  // In sentences the label shows as itself: its chip, as saved (not the name being typed).
  const chip = <LabelChip color={label.color}>{own}</LabelChip>;
  const run = (change: Parameters<Apply>[0]) => {
    const code = apply(change);
    setError(code);
    if (!code) done();
  };
  const others = live(doc.labels).filter((l) => l.facetId === label.facetId && l.id !== label.id);
  const groups = orderedFacets(doc).filter((f) => f.id !== label.facetId);

  return (
    <div className="inline-form" role="group" aria-label={t('labels.editLabel', { label: own })}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run((d, ctx) => renameLabel(d, label.id, name, color, splitAliases(aliases), ctx));
        }}
      >
        <NameField value={name} set={setName} label={t('labels.name')} />
        <ColorField value={color} set={setColor} />
        <AliasesField value={aliases} set={setAliases} />
        <ErrorText code={error} />
        <div className="actions">
          <button type="submit">{t('labels.saveLabel')}</button>
          <button type="button" className="secondary" onClick={done}>
            {t('form.cancel')}
          </button>
        </div>
      </form>

      {
        <div className="editor-more">
          <form onSubmit={(e) => (e.preventDefault(), run((d, ctx) => mergeLabels(d, label.id, target, ctx)))}>
            <label>
              {tx('labels.mergeInto', { label: chip })}
              <span className="help">{tx('labels.mergeHelp', { label: chip })}</span>
              <select value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="" disabled>
                  {t('labels.choose')}
                </option>
                {others.map((l) => (
                  <option key={l.id} value={l.id}>
                    {labelName(l)}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="secondary" disabled={!target}>
              {t('labels.merge')}
            </button>
          </form>
          <form onSubmit={(e) => (e.preventDefault(), run((d, ctx) => moveLabel(d, label.id, group, ctx)))}>
            <label>
              {tx('labels.moveTo', { label: chip })}
              <span className="help">{t('labels.moveHelp')}</span>
              <select value={group} onChange={(e) => setGroup(e.target.value)}>
                <option value="" disabled>
                  {t('labels.chooseGroup')}
                </option>
                {groups.map((f) => (
                  <option key={f.id} value={f.id}>
                    {facetName(f, t)}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="secondary" disabled={!group}>
              {t('labels.move')}
            </button>
          </form>
          {confirmDelete ? (
            <div role="group" aria-label={t('labels.delete')}>
              <p>{tx('labels.deleteConfirm', { label: chip, providers: plural('providers', coverage(doc, label.id)) })}</p>
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
  // D-41: until the owner picks one, the colour is the least used now, over every group's
  // labels, worked out from the directory as it is, not as it was when the page opened.
  const [chosen, setColor] = useState<LabelColor | null>(null);
  const color = chosen ?? nextColor(doc);
  const [aliases, setAliases] = useState('');
  const [error, setError] = useState<EditErrorCode | null>(null);
  return (
    <details className="add-label">
      <summary aria-label={t('labels.addTo', { facet: facetName(facet, t) })}>{t('labels.add')}</summary>
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          const code = apply((d, ctx) => createLabel(d, { facetId: facet.id, name, color, aliases: splitAliases(aliases) }, ctx).doc);
          setError(code);
          if (!code) {
            setName('');
            setAliases('');
            setColor(null); // the next label starts with the least-used colour again
          }
        }}
      >
        <NameField value={name} set={setName} label={t('labels.name')} />
        <ColorField value={color} set={setColor} />
        <AliasesField value={aliases} set={setAliases} />
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
        const code = apply((d, ctx) => renameFacet(d, facet.id, name, FACET_WORDS, ctx));
        setError(code);
        if (!code) done();
      }}
    >
      <NameField value={name} set={setName} label={t('labels.facetName')} />
      <ErrorText code={error} />
      <div className="actions">
        <button type="submit">{t('labels.saveName')}</button>
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
          const code = apply((d, ctx) => createFacet(d, name, FACET_WORDS, ctx).doc);
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
