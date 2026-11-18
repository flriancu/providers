import { Component, useEffect, useState, type ReactNode } from 'react';
import { useI18n } from '../i18n';
import { errorDetail } from './driveErrors';

/**
 * Catches an error while drawing its children and shows a screen instead of a blank page:
 * `app`, the crash screen for the whole app; `page`, a notice in place of one page, with the
 * header still working. A new `resetKey` (the route) clears it, so moving elsewhere works again.
 */
export class ErrorBoundary extends Component<
  { kind: 'app' | 'page'; resetKey?: string; children: ReactNode },
  { error: unknown; key?: string }
> {
  override state: { error: unknown; key?: string } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  static getDerivedStateFromProps(props: { resetKey?: string }, state: { error: unknown; key?: string }) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.kind === 'app') return <CrashScreen error={error} />;
    return <PageError error={error} retry={() => this.setState({ error: null })} />;
  }
}

/** The technical text, collapsed: for a report, not for reading. */
function Details({ error }: { error: unknown }) {
  const { t } = useI18n();
  return (
    <details className="detail">
      <summary>{t('load.details')}</summary>
      {errorDetail(error)}
    </details>
  );
}

/** The whole app failed to draw: say whether the data is safe, and offer a reload. */
export function CrashScreen({ error }: { error: unknown }) {
  const { t } = useI18n();
  return (
    <div className="load-state crash" role="alert">
      <h1>{t('crash.title')}</h1>
      <p>{t('crash.data')}</p>
      <div className="load-actions">
        <button type="button" onClick={() => location.reload()}>
          {t('crash.reload')}
        </button>
      </div>
      <Details error={error} />
    </div>
  );
}

/** One page failed to draw; the header and the other pages still work. */
export function PageError({ error, retry }: { error: unknown; retry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="load-state" role="alert">
      <p>{t('page.failed')}</p>
      <div className="load-actions">
        <button type="button" onClick={retry}>
          {t('load.retry')}
        </button>
        <button type="button" className="secondary" onClick={() => location.reload()}>
          {t('crash.reload')}
        </button>
      </div>
      <Details error={error} />
    </div>
  );
}

/**
 * Errors thrown by a click or a late answer never reach an error boundary (React catches only
 * errors while drawing). They come here instead, as a notice that can be dismissed.
 */
export function ActionErrors() {
  const { t } = useI18n();
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    // Not an error from a script at another address: an extension's runs in the page too
    // (chrome-extension://, moz-extension://), and its failures are not the app's.
    const onError = (e: ErrorEvent) => {
      if (!e.filename || e.filename.startsWith(location.origin)) setError(e.error ?? e.message);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      if (!/-extension:\/\//.test(String((e.reason as Error | null)?.stack ?? ''))) setError(e.reason);
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
  if (error === null) return null;
  return (
    <div className="notice notice-error" role="alert">
      <p>{t('action.failed')}</p>
      <button type="button" className="link-button" onClick={() => setError(null)}>
        {t('notice.dismiss')}
      </button>
      <Details error={error} />
    </div>
  );
}
