import type { ReactNode } from 'react';
import { labelById } from '../domain/labels';
import type { DirectoryDoc } from '../domain/schema';
import type { MergeChange, MergeDiff } from '../domain/transfer';
import { useI18n } from '../i18n';
import { LabelChip } from './LabelChip';

/**
 * What a merge changes, one line per value, as a diff reads: + and green for what it adds, − and
 * red, struck through, for a value it replaces. The signs are read out as words, so colour is
 * never the only cue (WCAG 1.4.1). What stays as it is waits behind a toggle.
 */
export function MergeDiffView({ doc, diff }: { doc: DirectoryDoc; diff: MergeDiff }) {
  const { t } = useI18n();
  const one = {
    name: t('field.name'),
    contactPerson: t('field.contactPerson'),
    address: t('field.address'),
    notes: t('field.notes'),
    phones: t('diff.phone'),
    emails: t('diff.email'),
    links: t('diff.link'),
  } as const;
  const all = {
    name: t('field.name'),
    contactPerson: t('field.contactPerson'),
    address: t('field.address'),
    notes: t('field.notes'),
    phones: t('field.phones'),
    emails: t('field.emails'),
    links: t('field.links'),
    labelIds: t('field.labels'),
  } as const;
  const chip = (id: string) => {
    const label = labelById(doc, id);
    return label ? (
      <LabelChip key={id} color={label.color}>
        {label.name}
      </LabelChip>
    ) : null;
  };
  const change = (c: MergeChange, i: number) => {
    switch (c.kind) {
      case 'set':
        return line(
          `${i}`,
          one[c.field],
          <>
            {c.from && <Removed>{c.from}</Removed>}
            <Added>{c.to}</Added>
          </>,
        );
      case 'add':
        return line(`${i}`, one[c.field], <Added>{c.value}</Added>);
      case 'label':
        return line(`${i}`, t('diff.label'), <Added>{chip(c.id)}</Added>);
      case 'newLabel':
        // Not made yet: grey, as the import preview shows labels it creates.
        return line(
          `${i}`,
          t('diff.label'),
          <Added>
            <LabelChip color="grey">{c.label.name}</LabelChip>
          </Added>,
        );
    }
  };
  return (
    <div className="merge-diff">
      {diff.changes.length ? <ul className="diff-lines">{diff.changes.map(change)}</ul> : <p className="help">{t('import.addsNothing')}</p>}
      {diff.kept.length > 0 && (
        <details className="diff-kept">
          <summary>{t('diff.kept')}</summary>
          <ul className="diff-lines">
            {diff.kept.map((k) =>
              line(
                k.field,
                all[k.field],
                k.field === 'labelIds' ? <span className="chips">{k.values.map(chip)}</span> : k.values.join(', '),
              ),
            )}
          </ul>
        </details>
      )}
    </div>
  );
}

/** One line: the field's name, then its values. */
const line = (key: string, field: string, values: ReactNode) => (
  <li key={key}>
    <span className="diff-field">{field}</span>
    <span className="diff-values">{values}</span>
  </li>
);

function Added({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <span className="diff-add" data-color="green">
      <span aria-hidden="true">+ </span>
      <span className="sr-only">{t('diff.added')} </span>
      {children}
    </span>
  );
}

function Removed({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <del className="diff-del" data-color="red">
      <span aria-hidden="true">− </span>
      <span className="sr-only">{t('diff.removed')} </span>
      {children}
    </del>
  );
}
