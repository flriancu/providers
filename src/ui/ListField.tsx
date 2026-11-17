import { useRef } from 'react';
import { flushSync } from 'react-dom';
import { useI18n } from '../i18n';

/**
 * Several values of one kind (phones, email addresses, links): one field each, a remove button
 * on each, and "+ Add ..." below, as address books do. The field's type brings the matching
 * phone keyboard. Empty fields are dropped on save (cleanProvider).
 */
export function ListField({
  legend,
  item,
  add,
  type,
  values,
  set,
}: {
  legend: string;
  /** One value's name, e.g. "Phone number": each field is "Phone number 2" to screen readers. */
  item: string;
  /** The add button's text, e.g. "+ Add a phone number". */
  add: string;
  type: 'tel' | 'email' | 'url';
  values: string[];
  set: (values: string[]) => void;
}) {
  const { t } = useI18n();
  // Always one field to type into, even with no values yet.
  const shown = values.length ? values : [''];
  const list = useRef<HTMLDivElement>(null);

  /** A field added with "+ Add" is drawn at once and gets the focus, so typing can go on. */
  const addField = () => {
    flushSync(() => set([...shown, '']));
    list.current?.querySelector<HTMLInputElement>('.list-row:last-child input')?.focus();
  };

  const name = (i: number) => (shown.length > 1 ? `${item} ${i + 1}` : item);
  return (
    <fieldset className="list-field">
      <legend>{legend}</legend>
      <div ref={list}>
        {shown.map((value, i) => (
          <div className="list-row" key={i}>
            <input
              type={type}
              value={value}
              aria-label={name(i)}
              autoComplete="off"
              onChange={(e) => set(shown.map((v, j) => (j === i ? e.target.value : v)))}
            />
            {(shown.length > 1 || value !== '') && (
              <button
                type="button"
                className="secondary remove"
                aria-label={t('field.remove', { item: name(i).toLocaleLowerCase() })}
                onClick={() => set(shown.filter((_, j) => j !== i))}
              >
                <span aria-hidden="true">✕</span>
              </button>
            )}
          </div>
        ))}
      </div>
      <button type="button" className="link-button" onClick={addField}>
        {add}
      </button>
    </fieldset>
  );
}
