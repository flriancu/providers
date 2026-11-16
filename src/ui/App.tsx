import { useCallback, useEffect, useState } from 'react';
import { STORAGE_PREFIX } from '../config';
import { I18nProvider, LANGS, useI18n, type Lang } from '../i18n';
import './app.css';
import { LabelsPage } from './LabelsPage';
import { ProvidersPage } from './ProvidersPage';
import { href, useRoute } from './route';
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
      <Shell />
    </I18nProvider>
  );
}

function Shell() {
  const { t, lang, setLang } = useI18n();
  const route = useRoute();
  const { doc, apply } = useDirectory();
  const onLabels = route.page === 'labels';

  useEffect(() => {
    document.title = t('app.title');
  }, [t]);

  return (
    <div className="shell">
      <header className="app-header">
        <h1 className="app-title">{t('app.title')}</h1>
        <nav aria-label={t('nav.label')} className="app-nav">
          <a href={href({ page: 'list' })} aria-current={onLabels ? undefined : 'page'}>
            {t('nav.providers')}
          </a>
          <a href={href({ page: 'labels' })} aria-current={onLabels ? 'page' : undefined}>
            {t('nav.labels')}
          </a>
        </nav>
        <label className="lang">
          <span className="sr-only">{t('lang.label')}</span>
          <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
            {LANGS.map((l) => (
              <option key={l} value={l}>
                {t(`lang.${l}`)}
              </option>
            ))}
          </select>
        </label>
      </header>
      <p className="demo-note" role="note">
        {t('app.demo')}
      </p>
      <main className="app-main">
        {doc && (onLabels ? <LabelsPage doc={doc} apply={apply} /> : <ProvidersPage doc={doc} apply={apply} route={route} />)}
      </main>
    </div>
  );
}
