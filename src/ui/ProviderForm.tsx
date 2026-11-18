import { useEffect, useId, useRef, useState } from 'react';
import { findDuplicates, type PossibleDuplicate } from '../domain/duplicates';
import {
  cleanProvider,
  createLabel,
  createProvider,
  EditError,
  emptyProvider,
  providerInput,
  saveProvider,
  type EditErrorCode,
  type ProviderInput,
} from '../domain/edits';
import { labelById } from '../domain/labels';
import type { EditContext } from '../domain/records';
import { FACET_IDS, own, type DirectoryDoc } from '../domain/schema';
import { conflicts, mergeInput, type SingleField } from '../domain/transfer';
import { useI18n } from '../i18n';
import { clearDraft, readDraft, sameInput, writeDraft } from './drafts';
import { ColorDot } from './LabelChip';
import { LabelPicker } from './LabelPicker';
import { ListField } from './ListField';
import { facetLabels, facetName, labelName, labelNameById, orderedFacets } from './labelText';
import { go, href, useListQuery } from './route';
import type { Apply } from './types';
import { useOncePerRender } from './useOncePerRender';

/** A single field's name, for "keeps its own ..." in the look-alike notice. */
const FIELD_WORD = {
  name: 'field.name',
  contactPerson: 'field.contactPerson',
  address: 'field.address',
  notes: 'field.notes',
} as const satisfies Record<SingleField, string>;

/**
 * Create (no `id`) or edit a provider. Lists have one field per value (ListField). What is typed
 * is kept as a draft for this tab until it is saved or cancelled (drafts.ts), so leaving the form
 * by any route loses nothing; coming back brings it back, with a way to discard it. The form
 * remembers what it started from, with the draft, and saves only the fields changed since: a
 * change made meanwhile on another device to another field stays.
 */
export function ProviderForm({ doc, apply, id }: { doc: DirectoryDoc; apply: Apply; id?: string }) {
  const { t, list } = useI18n();
  const found = id ? own(doc.providers, id) : undefined;
  const existing = found && !found.deleted ? found : undefined;
  const owner = doc.owner.googleSub;
  const saved = existing ? providerInput(existing) : emptyProvider();
  const [draft] = useState(() => readDraft(owner, id));
  const [base, setBase] = useState<ProviderInput>(draft?.base ?? saved);
  const [input, setInput] = useState<ProviderInput>(draft?.input ?? saved);
  const [restored, setRestored] = useState(draft !== null);
  const changed = !sameInput(input, base);

  // The draft follows every change; back to where the form started, there is nothing to keep.
  useEffect(() => {
    if (changed) writeDraft(owner, id, { base, input });
    else clearDraft(owner, id);
  }, [changed, owner, id, base, input]);

  // Closing the tab with unsaved edits asks first (a reload keeps the draft anyway).
  useEffect(() => {
    if (!changed) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [changed]);
  const [error, setError] = useState<EditErrorCode | null>(null);
  /** Look-alikes found for exactly this input; any change to the form puts them away. */
  const [doubts, setDoubts] = useState<{ input: ProviderInput; found: PossibleDuplicate[] } | null>(null);
  const left = useRef(false);
  // The look-alikes take the focus when they show: the next key acts on them, not on Save again.
  const doubtsNotice = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (doubts) doubtsNotice.current?.focus();
  }, [doubts]);
  const ids = useId();
  const once = useOncePerRender();
  const query = useListQuery();
  const cancel = id ? href({ page: 'provider', id }, query) : href({ page: 'list' }, query);

  if (id && !existing) return <p>{t('detail.notFound')}</p>;

  const set = <K extends keyof ProviderInput>(key: K, value: ProviderInput[K]) => setInput((i) => ({ ...i, [key]: value }));
  const toggle = (labelId: string, on: boolean) =>
    set('labelIds', on ? [...input.labelIds, labelId] : input.labelIds.filter((l) => l !== labelId));
  const chosenCategories = input.labelIds.filter((l) => labelById(doc, l)?.facetId === FACET_IDS.category);
  /** FR-07: a new label, made from the form on the owner's explicit choice, and ticked. */
  const createAndTick = (facetId: string, name: string) => {
    let created = '';
    const code = apply((d, ctx) => {
      const added = createLabel(d, { facetId, name }, ctx);
      created = added.id;
      return added.doc;
    });
    if (code) setError(code);
    else if (created) toggle(created, true);
  };

  /** Saves, then opens the provider saved; `change` returns the document and the provider's id. */
  const save = (change: (d: DirectoryDoc, ctx: EditContext) => { doc: DirectoryDoc; id: string }) =>
    once(() => {
      // Saved once, the form is on its way out: a click before the page changes saves nothing more.
      if (left.current) return false;
      let target = '';
      const code = apply((d, ctx) => {
        const done = change(d, ctx);
        target = done.id;
        return done.doc;
      });
      setError(code);
      if (code || !target) return false;
      left.current = true;
      clearDraft(owner, id);
      go({ page: 'provider', id: target }, query);
      return true;
    });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (id) return save((d, ctx) => ({ doc: saveProvider(d, id, base, input, ctx), id }));
    // FR-23: a new provider that looks like one already here waits for the owner's choice.
    const clean = cleanProvider(doc, input);
    const lookalikes = clean.name ? findDuplicates(doc, clean) : [];
    // A look-alike waits for a choice in the notice, however often Save is pressed.
    if (lookalikes.length) return setDoubts({ input, found: lookalikes });
    save((d, ctx) => createProvider(d, input, ctx));
  };
  /** FR-24: the form's details added to a provider already there, which keeps its own single values. */
  const addTo = (into: string) =>
    save((d, ctx) => {
      const target = own(d.providers, into);
      if (!target || target.deleted) throw new EditError('notFound');
      return { doc: saveProvider(d, into, providerInput(target), mergeInput(target, input, {}), ctx), id: into };
    });
  const reasons = (r: readonly string[]) => list(r.map((x) => t(`import.reason.${x as 'name'}`)));

  const textField = (key: 'name' | 'contactPerson' | 'address', label: string, required = false) => (
    <label>
      {label}
      <input
        value={input[key]}
        onChange={(e) => set(key, e.target.value)}
        required={required}
        aria-invalid={key === 'name' && error === 'nameRequired'}
        autoComplete="off"
      />
    </label>
  );
  const listField = (key: 'phones' | 'emails' | 'links', type: 'tel' | 'email' | 'url') => {
    const words = {
      phones: ['field.phones', 'field.phone', 'field.addPhone'],
      emails: ['field.emails', 'field.email', 'field.addEmail'],
      links: ['field.links', 'field.link', 'field.addLink'],
    } as const;
    const [legend, item, add] = words[key];
    return <ListField legend={t(legend)} item={t(item)} add={t(add)} type={type} values={input[key]} set={(v) => set(key, v)} />;
  };

  return (
    <form className="provider-form" onSubmit={submit} noValidate aria-labelledby={`${ids}-heading`}>
      <h2 id={`${ids}-heading`} tabIndex={-1}>
        {existing ? t('form.editHeading', { name: existing.name }) : t('form.newHeading')}
      </h2>
      {restored && (
        <div className="notice" role="status">
          <p>{t('form.draftRestored')}</p>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setBase(saved);
              setInput(saved);
              setRestored(false);
            }}
          >
            {t('form.draftDiscard')}
          </button>
        </div>
      )}
      {textField('name', t('field.name'), true)}
      {error && (
        <p className="error" role="alert">
          {t(`err.${error}`)}
        </p>
      )}
      {textField('contactPerson', t('field.contactPerson'))}
      {listField('phones', 'tel')}
      {listField('emails', 'email')}
      {listField('links', 'url')}
      {textField('address', t('field.address'))}
      <fieldset>
        <legend>{t('field.labels')}</legend>
        {orderedFacets(doc).map((facet) => {
          const labels = facetLabels(doc, facet.id);
          return (
            <fieldset key={facet.id} className="facet-choices">
              <legend>{facetName(facet, t)}</legend>
              {labels.map((label) => (
                <label key={label.id} className="check">
                  <input type="checkbox" checked={input.labelIds.includes(label.id)} onChange={(e) => toggle(label.id, e.target.checked)} />
                  <ColorDot color={label.color} />
                  {labelName(label)}
                </label>
              ))}
              <LabelPicker
                doc={doc}
                facetId={facet.id}
                groupName={facetName(facet, t)}
                chosen={input.labelIds}
                choose={(labelId) => toggle(labelId, true)}
                create={(name) => createAndTick(facet.id, name)}
              />
            </fieldset>
          );
        })}
        {chosenCategories.length > 1 && (
          <label>
            {t('field.primary')}
            <span className="help">{t('field.primaryHelp')}</span>
            <select value={input.primaryCategoryId ?? chosenCategories[0]} onChange={(e) => set('primaryCategoryId', e.target.value)}>
              {chosenCategories.map((c) => (
                <option key={c} value={c}>
                  {labelNameById(doc, c)}
                </option>
              ))}
            </select>
          </label>
        )}
      </fieldset>

      <label>
        {t('field.notes')}
        <textarea rows={4} value={input.notes} onChange={(e) => set('notes', e.target.value)} />
      </label>
      {doubts?.input === input && (
        <div className="notice" role="alert" tabIndex={-1} ref={doubtsNotice}>
          <p>
            <strong>{t('form.dupHeading')}</strong>
          </p>
          <ul className="plain">
            {doubts.found.map(({ provider: p, reasons: r }) => (
              <li key={p.id}>
                <p>{t('import.likeProvider', { name: p.name, reasons: reasons(r) })}</p>
                {/* FR-24: adding keeps the provider's own single values; say which differ. */}
                {conflicts(p, cleanProvider(doc, input)).length > 0 && (
                  <p className="help">
                    {t('form.dupKeeps', {
                      name: p.name,
                      fields: list(conflicts(p, cleanProvider(doc, input)).map((f) => t(FIELD_WORD[f]).toLocaleLowerCase())),
                    })}
                  </p>
                )}
                <div className="actions">
                  <button type="button" className="secondary" onClick={() => addTo(p.id)}>
                    {t('form.dupMerge', { name: p.name })}
                  </button>
                  <a className="button secondary" href={href({ page: 'provider', id: p.id }, query)}>
                    {t('form.dupOpen', { name: p.name })}
                  </a>
                </div>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => save((d, ctx) => createProvider(d, input, ctx))}>
            {t('form.dupKeepBoth')}
          </button>
        </div>
      )}
      <div className="actions">
        <button type="submit">{t('form.save')}</button>
        <a className="button secondary" href={cancel} onClick={() => clearDraft(owner, id)}>
          {t('form.cancel')}
        </a>
      </div>
    </form>
  );
}
