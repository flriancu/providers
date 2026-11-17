import { isRetryable } from 'drive-doc-sync';
import { useCallback, useEffect, useState } from 'react';
import { STORAGE_PREFIX } from '../config';
import { I18nProvider, useI18n, type Lang } from '../i18n';
import './app.css';
import { AccountBar, LoadError, SaveAlert, SaveStatus } from './AccountBar';
import { signInMessage } from './driveErrors';
import { ActionErrors, ErrorBoundary } from './ErrorBoundary';
import { LabelsPage } from './LabelsPage';
import { ProvidersPage } from './ProvidersPage';
import { href, useRoute } from './route';
import { useAccount, type Account, type Connection } from './useAccount';
import { useDirectory } from './useDirectory';

const LANG_KEY = `${STORAGE_PREFIX}.lang`;

/** The language chosen on this device, else the browser's if it is Romanian, else English. */
function initialLang(): Lang {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(LANG_KEY);
  } catch {
    // storage blocked: the browser's language decides
  }
  if (stored === 'en' || stored === 'ro') return stored;
  return navigator.language.toLowerCase().startsWith('ro') ? 'ro' : 'en';
}

export function App() {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      // not remembered: the choice holds until the page closes
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <I18nProvider lang={lang} setLang={setLang}>
      <ErrorBoundary kind="app">
        <Shell />
      </ErrorBoundary>
    </I18nProvider>
  );
}

/** The open directory of whoever is here: the demo, or a signed-in Google account. */
function Shell() {
  const connection = useAccount();
  return <Directory key={connection.key} connection={connection} />;
}

function Directory({ connection }: { connection: Connection }) {
  const { t } = useI18n();
  const route = useRoute();
  const { doc, apply, saveState, saveError, loadError, notices, sync } = useDirectory(connection);
  const onLabels = route.page === 'labels';
  // Signing out saves first; what did not reach Drive stays on this device for the next sign-in.
  const base = connection.account;
  const account: Account =
    base.kind === 'google' ? { ...base, signOut: () => void sync.close().then((clean) => base.signOut(!clean)) } : base;
  // Drive not answering, with this device's copy on screen: keep working on the copy.
  const offline = !!loadError && !!doc && isRetryable(loadError);

  useEffect(() => {
    document.title = t('app.title');
  }, [t]);

  return (
    <div className="shell">
      <header className="app-header">
        <h1 className="app-title">{t('app.title')}</h1>
        <nav aria-label={t('nav.label')} className="app-nav">
          <a href={href({ page: 'list' }, route.query)} aria-current={onLabels ? undefined : 'page'}>
            {t('nav.providers')}
          </a>
          <a href={href({ page: 'labels' })} aria-current={onLabels ? 'page' : undefined}>
            {t('nav.labels')}
          </a>
        </nav>
        {account.kind === 'google' && doc && <SaveStatus saveState={saveState} />}
        <AccountBar account={account} />
      </header>
      {account.kind === 'google' && doc && <SaveAlert saveState={saveState} saveError={saveError} account={account} sync={sync} />}
      <ActionErrors />
      {account.kind === 'demo' && (
        <p className="demo-note" role="note">
          {t(account.unsavedOnDevice ? 'auth.unsavedOnDevice' : 'app.demo')}
        </p>
      )}
      {account.kind === 'demo' && account.error && (
        <p className="error" role="alert">
          {t(signInMessage(account.error), { email: account.hint?.email ?? '' })}
        </p>
      )}
      {offline && (
        <p className="demo-note" role="status">
          {t('load.offline')}
        </p>
      )}
      {notices.map((n) => (
        <div key={n.kind} className="notice" role="status">
          <p>{n.kind === 'carried' ? t('notice.carried') : t('notice.skipped', { count: n.count })}</p>
          <button type="button" className="link-button" onClick={() => sync.dismissNotice(n.kind)}>
            {t('notice.dismiss')}
          </button>
        </div>
      ))}
      <main className="app-main">
        {loadError && !offline ? (
          <LoadError error={loadError} account={account} sync={sync} />
        ) : doc ? (
          // A page that fails to draw leaves the header and the other pages working.
          <ErrorBoundary kind="page" resetKey={location.hash}>
            {onLabels ? <LabelsPage doc={doc} apply={apply} /> : <ProvidersPage doc={doc} apply={apply} route={route} />}
          </ErrorBoundary>
        ) : (
          <p className="load-state">{t('load.opening')}</p>
        )}
      </main>
    </div>
  );
}
