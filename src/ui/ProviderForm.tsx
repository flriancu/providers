import { useEffect, useId, useState } from 'react';
import { createLabel, createProvider, emptyProvider, saveProvider, type EditErrorCode, type ProviderInput } from '../domain/edits';
import { labelById } from '../domain/labels';
import { FACET_IDS, type DirectoryDoc, type Provider } from '../domain/schema';
import { useI18n } from '../i18n';
import { clearDraft, readDraft, sameInput, writeDraft } from './drafts';
import { ColorDot } from './LabelChip';
import { LabelPicker } from './LabelPicker';
import { ListField } from './ListField';
import { facetLabels, facetName, labelName, labelNameById, orderedFacets } from './labelText';
import { go, href, useListQuery } from './route';
import type { Apply } from './types';

/** The fields the form edits, without the record's id and stamps. */
function toInput(p: Provider): ProviderInput {
  return {
    name: p.name,
    contactPerson: p.contactPerson,
    phones: p.phones,
    emails: p.emails,
    links: p.links,
    address: p.address,
    notes: p.notes,
    labelIds: p.labelIds,
    ...(p.primaryCategoryId && { primaryCategoryId: p.primaryCategoryId }),
  };
}

/**
 * Create (no `id`) or edit a provider. Lists have one field per value (ListField). What is typed
 * is kept as a draft for this tab until it is saved or cancelled (drafts.ts), so leaving the form
 * by any route loses nothing; coming back brings it back, with a way to discard it.
 */
export function ProviderForm({ doc, apply, id }: { doc: DirectoryDoc; apply: Apply; id?: string }) {
  const { t } = useI18n();
  const existing = id && Object.hasOwn(doc.providers, id) && !doc.providers[id]!.deleted ? doc.providers[id]! : undefined;
  const owner = doc.owner.googleSub;
  const saved = existing ? toInput(existing) : emptyProvider();
  const [input, setInput] = useState<ProviderInput>(() => readDraft(owner, id) ?? saved);
  const [restored, setRestored] = useState(() => readDraft(owner, id) !== null);
  const changed = !sameInput(input, saved);

  // The draft follows every change; back to the saved values, there is nothing to keep.
  useEffect(() => {
    if (changed) writeDraft(owner, id, input);
    else clearDraft(owner, id);
  }, [changed, owner, id, input]);

  // Closing the tab with unsaved edits asks first (a reload keeps the draft anyway).
  useEffect(() => {
    if (!changed) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [changed]);
  const [error, setError] = useState<EditErrorCode | null>(null);
  const ids = useId();
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    let target = id;
    const code = apply((d, ctx) => {
      if (id) return saveProvider(d, id, input, ctx);
      const created = createProvider(d, input, ctx);
      target = created.id;
      return created.doc;
    });
    setError(code);
    if (code || !target) return;
    clearDraft(owner, id);
    go({ page: 'provider', id: target }, query);
  };

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
      <div className="actions">
        <button type="submit">{t('form.save')}</button>
        <a className="button secondary" href={cancel} onClick={() => clearDraft(owner, id)}>
          {t('form.cancel')}
        </a>
      </div>
    </form>
  );
}
