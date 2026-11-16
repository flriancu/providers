import { useId, useState } from 'react';
import { createProvider, emptyProvider, saveProvider, type EditErrorCode, type ProviderInput } from '../domain/edits';
import { labelById } from '../domain/labels';
import { FACET_IDS, type DirectoryDoc, type Provider } from '../domain/schema';
import { useI18n } from '../i18n';
import { ColorDot } from './LabelChip';
import { facetName, facetTree, labelName, labelPath, orderedFacets } from './labelText';
import { go, href, useListQuery } from './route';
import type { Apply } from './types';

const lines = (text: string) => text.split('\n');

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

/** Create (no `id`) or edit a provider. Lists are edited one item per line. */
export function ProviderForm({ doc, apply, id }: { doc: DirectoryDoc; apply: Apply; id?: string }) {
  const { t } = useI18n();
  const existing = id && Object.hasOwn(doc.providers, id) && !doc.providers[id]!.deleted ? doc.providers[id]! : undefined;
  const [input, setInput] = useState<ProviderInput>(() => (existing ? toInput(existing) : emptyProvider()));
  const [listText, setListText] = useState(() => ({
    phones: input.phones.join('\n'),
    emails: input.emails.join('\n'),
    links: input.links.join('\n'),
  }));
  const [error, setError] = useState<EditErrorCode | null>(null);
  const ids = useId();
  const query = useListQuery();
  const cancel = id ? href({ page: 'provider', id }, query) : href({ page: 'list' }, query);

  if (id && !existing) return <p>{t('detail.notFound')}</p>;

  const set = <K extends keyof ProviderInput>(key: K, value: ProviderInput[K]) => setInput((i) => ({ ...i, [key]: value }));
  const toggle = (labelId: string, on: boolean) =>
    set('labelIds', on ? [...input.labelIds, labelId] : input.labelIds.filter((l) => l !== labelId));
  const chosenCategories = input.labelIds.filter((l) => labelById(doc, l)?.facetId === FACET_IDS.category);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const full: ProviderInput = { ...input, phones: lines(listText.phones), emails: lines(listText.emails), links: lines(listText.links) };
    let target = id;
    const code = apply((d, ctx) => {
      if (id) return saveProvider(d, id, full, ctx);
      const created = createProvider(d, full, ctx);
      target = created.id;
      return created.doc;
    });
    setError(code);
    if (!code && target) go({ page: 'provider', id: target }, query);
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
  const listField = (key: 'phones' | 'emails' | 'links', label: string, type: string) => (
    <label>
      {label}
      <span className="help">{t('field.onePerLine')}</span>
      <textarea
        rows={2}
        inputMode={type === 'tel' ? 'tel' : type === 'email' ? 'email' : 'url'}
        value={listText[key]}
        onChange={(e) => setListText((l) => ({ ...l, [key]: e.target.value }))}
      />
    </label>
  );

  return (
    <form className="provider-form" onSubmit={submit} noValidate aria-labelledby={`${ids}-heading`}>
      <a className="back" href={cancel}>
        {t('form.cancel')}
      </a>
      <h2 id={`${ids}-heading`}>{existing ? t('form.editHeading', { name: existing.name }) : t('form.newHeading')}</h2>
      {textField('name', t('field.name'), true)}
      {error && (
        <p className="error" role="alert">
          {t(`err.${error}`)}
        </p>
      )}
      {textField('contactPerson', t('field.contactPerson'))}
      {listField('phones', t('field.phones'), 'tel')}
      {listField('emails', t('field.emails'), 'email')}
      {listField('links', t('field.links'), 'url')}
      {textField('address', t('field.address'))}
      <fieldset>
        <legend>{t('field.labels')}</legend>
        {orderedFacets(doc).map((facet) => {
          const tree = facetTree(doc, facet.id);
          return (
            <fieldset key={facet.id} className="facet-choices">
              <legend>{facetName(facet, t)}</legend>
              {tree.length === 0 && <p className="muted">{t('form.noLabels')}</p>}
              {tree.map(({ label, children }) => (
                <div key={label.id}>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={input.labelIds.includes(label.id)}
                      onChange={(e) => toggle(label.id, e.target.checked)}
                    />
                    <ColorDot color={label.color} />
                    {labelName(label)}
                  </label>
                  {children.map((c) => (
                    <label key={c.id} className="check child">
                      <input type="checkbox" checked={input.labelIds.includes(c.id)} onChange={(e) => toggle(c.id, e.target.checked)} />
                      <ColorDot color={c.color} />
                      {labelName(c)}
                    </label>
                  ))}
                </div>
              ))}
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
                  {labelPath(doc, c)}
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
        <a className="button secondary" href={cancel}>
          {t('form.cancel')}
        </a>
      </div>
    </form>
  );
}
