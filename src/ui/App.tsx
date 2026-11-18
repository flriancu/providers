import { isRetryable } from 'drive-doc-sync';
import { useCallback, useEffect, useState } from 'react';
import { own } from '../domain/schema';
import type { JoinedLabel } from '../domain/unique';
import { I18nProvider, useI18n, type Lang } from '../i18n';
import './app.css';
import { AccountBar, LoadError, SaveAlert, SaveStatus } from './AccountBar';
import { signInMessage } from './driveErrors';
import { ActionErrors, ErrorBoundary } from './ErrorBoundary';
import { DataPage } from './DataPage';
import { initialLang, LANG_KEY } from './language';
import { facetName } from './labelText';
import { LabelsPage } from './LabelsPage';
import { ManageLabelsLink } from './ManageLabelsLink';
import { ProvidersPage } from './ProvidersPage';
import { href, useRoute } from './route';
import { useAccount, type Account, type Connection } from './useAccount';
import { useDirectory } from './useDirectory';
import { useJoinedLabels } from './useJoinedLabels';

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

/** What each notice says once the directory is open. */
const NOTICE_TEXT = {
  carried: 'notice.carried',
  replacedChanges: 'notice.replacedChanges',
  skipped: 'notice.skipped',
  unreadableFiles: 'notice.unreadableFiles',
} as const;

function Directory({ connection }: { connection: Connection }) {
  const { t } = useI18n();
  const route = useRoute();
  const { doc, apply, saveState, saveError, copyKept, loadError, notices, sync } = useDirectory(connection);
  const onLabels = route.page === 'labels';
  const { joined, dismiss: dismissJoined } = useJoinedLabels(doc);
  const joinedText = (labels: JoinedLabel[]) => {
    const named = labels.map((l) => {
      const facet = doc && own(doc.facets, l.facetId);
      return { name: l.name, group: facet ? facetName(facet, t) : '' };
    });
    // One label in a sentence; several in a list, one per line, which a phone can still read.
    // What happened and that nothing is needed first; the details in a paragraph of their own.
    if (named.length === 1)
      return (
        <>
          <p>{t('notice.labelsJoined', named[0]!)}</p>
          <p>{t('notice.labelsJoinedAfter', named[0]!)}</p>
        </>
      );
    return (
      <>
        <p>{t('notice.labelsJoinedMany')}</p>
        <ul>
          {named.map((n, i) => (
            <li key={i}>{t('notice.labelsJoinedItem', n)}</li>
          ))}
        </ul>
        <p>{t('notice.labelsJoinedManyCalm')}</p>
        <p>{t('notice.labelsJoinedManyAfter')}</p>
      </>
    );
  };
  // Signing out saves first; what did not reach Drive stays on this device for the next sign-in.
  // Meanwhile (up to a few seconds) the page says so and offers no directory: an edit made now
  // would come after the last save, and be lost.
  const [leaving, setLeaving] = useState(false);
  const base = connection.account;
  const account: Account =
    base.kind === 'google'
      ? {
          ...base,
          signOut: () => {
            setLeaving(true);
            void sync.close().then((clean) => base.signOut(!clean));
          },
        }
      : base;
  // Drive not answering, with this device's copy on screen: keep working on the copy.
  const offline = !!loadError && !!doc && isRetryable(loadError);

  useEffect(() => {
    document.title = t('app.title');
  }, [t]);

  return (
    <div className="shell">
      <header className="app-header">
        <h1 className="app-title">{t('app.title')}</h1>
        {account.kind === 'google' && doc && <SaveStatus saveState={saveState} />}
        <AccountBar account={account} />
      </header>
      {account.kind === 'google' && doc && (
        <SaveAlert saveState={saveState} saveError={saveError} copyKept={copyKept} account={account} sync={sync} />
      )}
      <ActionErrors />
      {account.kind === 'demo' && (
        <p className="demo-note" role="note">
          {/* What the app is, on the list only: on every page it would take a third of a phone's screen. */}
          {account.unsavedOnDevice
            ? t('auth.unsavedOnDevice')
            : route.page === 'list'
              ? `${t('app.intro')} ${t('app.demo')}`
              : t('app.demo')}
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
      {joined.length > 0 && (
        <div className="notice" role="status">
          <div>{joinedText(joined)}</div>
          {/* A name or colour to change: the labels are one link away. */}
          <ManageLabelsLink />
          <button type="button" className="link-button" onClick={dismissJoined}>
            {t('notice.dismiss')}
          </button>
        </div>
      )}
      {notices.map((n) => (
        <div key={n.kind} className="notice" role="status">
          <p>{t(NOTICE_TEXT[n.kind], { count: n.count })}</p>
          <button type="button" className="link-button" onClick={() => sync.dismissNotice(n.kind)}>
            {t('notice.dismiss')}
          </button>
        </div>
      ))}
      <main className="app-main">
        {leaving ? (
          <p className="load-state" role="status">
            {t('auth.signingOut')}
          </p>
        ) : loadError && !offline ? (
          <LoadError error={loadError} account={account} sync={sync} />
        ) : doc ? (
          // A page that fails to draw leaves the header and the other pages working.
          <ErrorBoundary kind="page" resetKey={href(route, route.query)}>
            {onLabels ? (
              <LabelsPage doc={doc} apply={apply} />
            ) : route.page === 'data' ? (
              <DataPage doc={doc} apply={apply} route={route} />
            ) : (
              <ProvidersPage doc={doc} apply={apply} route={route} />
            )}
          </ErrorBoundary>
        ) : (
          <p className="load-state">{t('load.opening')}</p>
        )}
      </main>
    </div>
  );
}
