import { LANGS, useI18n, type Lang } from '../i18n';
import { THEMES, useTheme, type Theme } from './theme';

/**
 * The interface language (FR-27). Signed out it sits in the header with its label read out only;
 * signed in it is in the account menu, with its label shown (`shown`).
 */
export function LanguageSelect({ shown = false }: { shown?: boolean }) {
  const { t, lang, setLang } = useI18n();
  return (
    <label className={shown ? 'lang lang-shown' : 'lang'}>
      <span className={shown ? undefined : 'sr-only'}>{t('lang.label')}</span>
      <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
        {LANGS.map((l) => (
          <option key={l} value={l}>
            {t(`lang.${l}`)}
          </option>
        ))}
      </select>
    </label>
  );
}

/** D-36: light, dark, or the same as this device; it applies at once and is kept on this device. */
export function ThemeSelect({ shown = false }: { shown?: boolean }) {
  const { t } = useI18n();
  const [theme, setTheme] = useTheme();
  return (
    <label className={shown ? 'lang lang-shown' : 'lang'}>
      <span className={shown ? undefined : 'sr-only'}>{t('theme.label')}</span>
      <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
        {THEMES.map((th) => (
          <option key={th} value={th}>
            {t(`theme.${th}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
