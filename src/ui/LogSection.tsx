import { useId, useState } from 'react';
import { addLogEntry, providerLog, type EditErrorCode } from '../domain/edits';
import { deleteRecord, restoreRecord } from '../domain/records';
import type { DirectoryDoc } from '../domain/schema';
import { useI18n } from '../i18n';
import { DateField, todayIso } from './DateField';
import type { Apply } from './types';
import { useOncePerRender } from './useOncePerRender';

/**
 * FR-02: the provider's interaction log, newest first, with a form to add to it. Deleting an
 * entry takes one click and can be undone until the next change here.
 */
export function LogSection({ doc, apply, providerId }: { doc: DirectoryDoc; apply: Apply; providerId: string }) {
  const { t, date } = useI18n();
  const [day, setDay] = useState(todayIso);
  const [text, setText] = useState('');
  const [error, setError] = useState<EditErrorCode | null>(null);
  /** The entry just deleted, while its Undo is offered. */
  const [deleted, setDeleted] = useState<string | null>(null);
  const ids = useId();
  const once = useOncePerRender();
  const entries = providerLog(doc, providerId);

  return (
    <section className="log" aria-labelledby={`${ids}-heading`}>
      <h3 id={`${ids}-heading`}>{t('log.heading')}</h3>
      <form
        className="log-form"
        onSubmit={(e) => {
          e.preventDefault();
          once(() => {
            const code = apply((d, ctx) => addLogEntry(d, providerId, day, text, ctx).doc);
            setError(code);
            if (code) return false;
            setText('');
            setDeleted(null);
            return true;
          });
        }}
      >
        <DateField label={t('log.date')} value={day} onChange={setDay} />
        <label>
          {t('log.text')}
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} aria-invalid={error === 'logTextRequired'} />
        </label>
        {error && (
          <p className="error" role="alert">
            {t(`err.${error}`)}
          </p>
        )}
        <div className="actions">
          <button type="submit">{t('log.add')}</button>
        </div>
      </form>
      {deleted && (
        <div className="notice" role="status">
          <p>{t('log.deleted')}</p>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              apply((d, ctx) => restoreRecord(d, 'log', deleted, ctx));
              setDeleted(null);
            }}
          >
            {t('log.undo')}
          </button>
        </div>
      )}
      {entries.length === 0 ? (
        <p className="muted">{t('log.empty')}</p>
      ) : (
        <ol className="log-entries">
          {entries.map((entry) => (
            <li key={entry.id}>
              <p className="log-date">{date(entry.date)}</p>
              <p className="notes">{entry.text}</p>
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  if (!apply((d, ctx) => deleteRecord(d, 'log', entry.id, ctx))) setDeleted(entry.id);
                }}
              >
                {t('log.delete')}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
