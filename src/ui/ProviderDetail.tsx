import { useState } from 'react';
import { deleteProvider } from '../domain/edits';
import { effectiveLabels, labelById } from '../domain/labels';
import { mailtoHref, telHref } from '../domain/contact';
import { webHref } from '../domain/links';
import { own, type DirectoryDoc } from '../domain/schema';
import { useI18n } from '../i18n';
import { hasDraft } from './drafts';
import { LabelChip } from './LabelChip';
import { facetName, labelNameById, orderedFacets } from './labelText';
import { LogSection } from './LogSection';
import { go, href, useListQuery } from './route';
import type { Apply } from './types';

export function ProviderDetail({ doc, apply, id }: { doc: DirectoryDoc; apply: Apply; id: string }) {
  const { t } = useI18n();
  const query = useListQuery();
  const [confirming, setConfirming] = useState(false);
  const provider = own(doc.providers, id);

  if (!provider || provider.deleted) {
    return (
      <div>
        <a className="back" href={href({ page: 'list' }, query)}>
          {t('detail.back')}
        </a>
        <p>{t('detail.notFound')}</p>
      </div>
    );
  }

  const labels = effectiveLabels(doc, provider);
  const nothing = <span className="muted">{t('detail.nothing')}</span>;
  const list = (items: string[], render: (item: string) => React.ReactNode) =>
    items.length ? (
      <ul className="plain">
        {items.map((item) => (
          <li key={item}>{render(item)}</li>
        ))}
      </ul>
    ) : (
      nothing
    );

  return (
    <article aria-labelledby="provider-heading">
      {hasDraft(doc.owner.googleSub, provider.id) && (
        <div className="notice" role="status">
          <p>{t('detail.draft')}</p>
          <a href={href({ page: 'edit', id: provider.id }, query)}>{t('detail.draftContinue')}</a>
        </div>
      )}
      <a className="back" href={href({ page: 'list' }, query)}>
        {t('detail.back')}
      </a>
      <div className="pane-header">
        <h2 id="provider-heading" tabIndex={-1}>
          {provider.name}
        </h2>
        <a className="button" href={href({ page: 'edit', id }, query)}>
          {t('detail.edit')}
        </a>
      </div>
      <dl className="fields">
        <dt>{t('field.contactPerson')}</dt>
        <dd>{provider.contactPerson || nothing}</dd>
        <dt>{t('field.phones')}</dt>
        <dd>
          {list(provider.phones, (p) => {
            const call = telHref(p);
            return call ? <a href={call}>{p}</a> : p;
          })}
        </dd>
        <dt>{t('field.emails')}</dt>
        <dd>
          {list(provider.emails, (e) => {
            const write = mailtoHref(e);
            return write ? <a href={write}>{e}</a> : e;
          })}
        </dd>
        <dt>{t('field.links')}</dt>
        <dd>
          {/* Only web addresses become links; anything else shows as the text it is. */}
          {list(provider.links, (l) => {
            const site = webHref(l);
            return site ? (
              <a href={site} target="_blank" rel="noopener noreferrer">
                {l}
              </a>
            ) : (
              l
            );
          })}
        </dd>
        <dt>{t('field.address')}</dt>
        <dd>{provider.address || nothing}</dd>
        {orderedFacets(doc).map((facet) => {
          const mine = labels.filter((l) => labelById(doc, l)?.facetId === facet.id);
          return (
            <div key={facet.id} className="field-row">
              <dt>{facetName(facet, t)}</dt>
              <dd>
                {mine.length ? (
                  <span className="chips">
                    {mine.map((l) => (
                      <LabelChip key={l} color={labelById(doc, l)!.color}>
                        {labelNameById(doc, l)}
                      </LabelChip>
                    ))}
                  </span>
                ) : (
                  nothing
                )}
              </dd>
            </div>
          );
        })}
        <dt>{t('field.notes')}</dt>
        <dd className="notes">{provider.notes || nothing}</dd>
      </dl>

      <LogSection doc={doc} apply={apply} providerId={id} />

      <div className="danger-zone">
        {confirming ? (
          <div role="group" aria-label={t('detail.delete')}>
            <p>{t('detail.deleteConfirm', { name: provider.name })}</p>
            <button
              type="button"
              className="danger"
              onClick={() => {
                if (!apply((d, ctx) => deleteProvider(d, id, ctx))) go({ page: 'list' }, query);
              }}
            >
              {t('detail.deleteYes', { name: provider.name })}
            </button>{' '}
            <button type="button" className="secondary" onClick={() => setConfirming(false)}>
              {t('detail.deleteNo')}
            </button>
          </div>
        ) : (
          <button type="button" className="secondary" onClick={() => setConfirming(true)}>
            {t('detail.delete')}
          </button>
        )}
      </div>
    </article>
  );
}
