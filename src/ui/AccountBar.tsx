import type { SaveState } from 'drive-doc-sync';
import { useState } from 'react';
import { DRIVE_APP } from '../config';
import { useI18n } from '../i18n';
import { driveMessage, errorDetail, signInMessage } from './driveErrors';
import { HeaderMenu } from './HeaderMenu';
import { LanguageSelect, ThemeSelect } from './LanguageSelect';
import type { Account, SignInFailure } from './useAccount';
import type { DirectorySync } from './useDirectory';

/**
 * Signed out: sign in (or continue as the last account), and a Settings menu with language and
 * theme. Signed in: the account menu, which holds them too. Either way the header is one row.
 */
export function AccountBar({ account }: { account: Account }) {
  const { t } = useI18n();
  if (account.kind === 'demo') {
    return (
      <div className="account">
        <button type="button" disabled={account.busy} onClick={() => account.signIn()}>
          {account.busy ? t('auth.signingIn') : account.hint ? t('auth.continueAs', { name: account.hint.name }) : t('auth.signIn')}
        </button>
        {account.hint && !account.busy && (
          <button type="button" className="link-button" onClick={() => account.signIn(true)}>
            {t('auth.otherAccount')}
          </button>
        )}
        <SettingsMenu />
      </div>
    );
  }
  return <AccountMenu account={account} />;
}

/**
 * The signed-in account: who, where the directory lives, language and theme, sign out.
 * Escape or a click outside closes it.
 */
function AccountMenu({ account }: { account: Extract<Account, { kind: 'google' }> }) {
  const { t } = useI18n();
  return (
    <HeaderMenu button={account.name.split(' ')[0] || account.email} label={t('account.menu', { email: account.email })}>
      <p>{t('account.signedInAs', { email: account.email })}</p>
      <p className="help">{t('account.where', { file: DRIVE_APP.fileName })}</p>
      <LanguageSelect shown />
      <ThemeSelect shown />
      <button type="button" className="secondary" onClick={() => account.signOut()}>
        {t('auth.signOut')}
      </button>
    </HeaderMenu>
  );
}

/** Signed out: language and theme, in one menu beside "Sign in", so the header stays one row. */
function SettingsMenu() {
  const { t } = useI18n();
  return (
    <HeaderMenu button={t('settings.menu')} label={t('settings.menu')}>
      <LanguageSelect shown />
      <ThemeSelect shown />
    </HeaderMenu>
  );
}

/** Whether the latest change is in Google Drive, with the way on when it is not. */
export function SaveStatus({
  saveState,
  saveError,
  account,
  sync,
}: {
  saveState: SaveState;
  saveError: unknown;
  account: Extract<Account, { kind: 'google' }>;
  sync: DirectorySync;
}) {
  const { t } = useI18n();
  const [failed, setFailed] = useState<SignInFailure | null>(null);
  const reconnect = () =>
    void account.reconnect().then((reason) => {
      setFailed(reason);
      if (!reason) void sync.flush();
    });
  return (
    <div className="save-status" role="status">
      {saveState === 'saved' && <span className="muted">{t('save.saved')}</span>}
      {saveState === 'saving' && <span className="muted">{t('save.saving')}</span>}
      {saveState === 'error' && (
        <button type="button" className="secondary" title={t(driveMessage(saveError))} onClick={() => void sync.flush()}>
          {t('save.retry')}
        </button>
      )}
      {saveState === 'signin' && (
        <button type="button" onClick={reconnect}>
          {t('save.signin')}
        </button>
      )}
      {saveState === 'signin' && failed && <span className="error">{t(signInMessage(failed), { email: account.email })}</span>}
    </div>
  );
}

/** Why the directory could not be opened, in words, and always a way on. */
export function LoadError({ error, account, sync }: { error: unknown; account: Account; sync: DirectorySync }) {
  const { t } = useI18n();
  const [failed, setFailed] = useState<SignInFailure | null>(null);
  const google = account.kind === 'google' ? account : null;
  const expired = (error as { needsSignIn?: boolean } | null)?.needsSignIn === true;
  const gone = driveMessage(error) === 'drive.removed' || driveMessage(error) === 'drive.missingCopy';
  const reconnect = () =>
    void google?.reconnect().then((reason) => {
      setFailed(reason);
      if (!reason) void sync.open();
    });
  return (
    <div className="load-state" role="alert">
      <p>{t('load.failed')}</p>
      <p>{t(driveMessage(error))}</p>
      {failed && <p className="error">{t(signInMessage(failed), { email: google?.email ?? '' })}</p>}
      {gone && <p className="help">{t('load.startNewNote')}</p>}
      <div className="load-actions">
        {expired ? (
          <button type="button" onClick={reconnect}>
            {t('auth.reconnect')}
          </button>
        ) : (
          <button type="button" onClick={() => void sync.open()}>
            {t('load.retry')}
          </button>
        )}
        {driveMessage(error) === 'drive.missingCopy' && (
          <button type="button" className="secondary" onClick={() => void sync.open('restore')}>
            {t('load.restore')}
          </button>
        )}
        {gone && (
          <button type="button" className="secondary" onClick={() => void sync.open('new')}>
            {t('load.startNew')}
          </button>
        )}
        {google && (
          <button type="button" className="secondary" onClick={() => google.signOut()}>
            {t('auth.signOut')}
          </button>
        )}
      </div>
      <details className="detail">
        <summary>{t('load.details')}</summary>
        {errorDetail(error)}
      </details>
    </div>
  );
}
