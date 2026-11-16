/**
 * Phase 0b sharing test (Q-07), served by the dev server only (not part of the build). Proves,
 * against the real Google Drive, the assumptions the sharing design rests on:
 *   A. a file shared "Anyone with the link" can be read without signing in, with the API key;
 *   B. a file shared by email can be opened by the other account through the Picker;
 *   C. a file shared for editing can be changed by the other account;
 *   D. taking the link away stops step A.
 * Each step writes what it did and what Google answered into the log on the page.
 */
import {
  createFile,
  DriveError,
  getResourceKey,
  GoogleAuth,
  listShares,
  pickSharedFile,
  readFile,
  readLinkSharedFile,
  shareFile,
  shareWithLink,
  unshareFile,
  writeFile,
  type Session,
} from 'drive-doc-sync';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DRIVE_FILE_SCOPE, GOOGLE_API_KEY, GOOGLE_APP_ID, GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from '../config';
import '../ui/app.css';
import './spike.css';

const auth = new GoogleAuth(GOOGLE_CLIENT_ID, GOOGLE_SCOPES, DRIVE_FILE_SCOPE, 'providers-directory.spike-session');
const LABEL_APP = { fileName: 'providers-label-sharing-test.json', appProperty: { key: 'app', value: 'providers_directory_test' } };
const DIRECTORY_APP = { fileName: 'providers-directory-sharing-test.json', appProperty: { key: 'app', value: 'providers_directory_test' } };
const configured = GOOGLE_CLIENT_ID !== '' && GOOGLE_API_KEY !== '' && GOOGLE_APP_ID !== '';

interface Entry {
  at: string;
  step: string;
  ok: boolean;
  detail: string;
}

/** Made-up content for the test files: one provider, with a phone number that reaches nobody. */
const sample = (kind: string) => ({
  kind,
  createdAt: new Date().toISOString(),
  providers: [{ name: 'Grădina cu Sălcii', phone: '+40 700 000 000' }],
});

const describe = (e: unknown) =>
  e instanceof DriveError ? `${e.message} (status ${e.status})` : e instanceof Error ? `${e.name}: ${e.message}` : String(e);

export function Spike() {
  const params = useMemo(() => new URLSearchParams(location.search), []);
  const linkedId = params.get('label') ?? '';
  const linkedKey = params.get('rk') ?? undefined;
  const [session, setSession] = useState<Session | null>(() => auth.restore());
  const [log, setLog] = useState<Entry[]>([]);
  const [labelId, setLabelId] = useState('');
  const [directoryId, setDirectoryId] = useState('');
  const [link, setLink] = useState('');
  const [email, setEmail] = useState('');
  const [picked, setPicked] = useState('');

  useEffect(() => void auth.preload(), []);

  const run = useCallback(async (step: string, action: () => Promise<string>) => {
    const at = new Date().toLocaleTimeString('en-GB');
    try {
      const detail = await action();
      setLog((l) => [...l, { at, step, ok: true, detail }]);
    } catch (e) {
      setLog((l) => [...l, { at, step, ok: false, detail: describe(e) }]);
    }
  }, []);

  const token = () => auth.accessToken(session?.user.sub);

  if (!configured) {
    return (
      <main className="page">
        <h1>Sharing test</h1>
        <p>Fill in GOOGLE_CLIENT_ID, GOOGLE_API_KEY and GOOGLE_APP_ID in src/config.ts first.</p>
      </main>
    );
  }

  return (
    <main className="page spike">
      <h1>Sharing test</h1>
      <p>
        Each button runs one step against your real Google Drive. Results appear in the log at the bottom; copy the log into the chat when
        you are done.
      </p>

      {linkedId && (
        <section>
          <h2>A. Read the shared label without signing in</h2>
          <p>
            This page was opened from a shared link (file {linkedId}). Open it in a private window, where nobody is signed in, and press the
            button.
          </p>
          <button
            onClick={() =>
              void run('A. Read with the API key only', async () => {
                const text = await readLinkSharedFile(GOOGLE_API_KEY, linkedId, linkedKey);
                return `Read ${text.length} characters: ${text.slice(0, 120)}`;
              })
            }
          >
            Read the label without signing in
          </button>
        </section>
      )}

      <section>
        <h2>Sign in</h2>
        {session ? (
          <p>
            Signed in as {session.user.email}.{' '}
            <button
              className="secondary"
              onClick={() => {
                auth.signOut();
                setSession(null);
              }}
            >
              Sign out
            </button>
          </p>
        ) : (
          <button
            onClick={() =>
              void run('Sign in', async () => {
                const s = await auth.signIn();
                setSession(s);
                return `Signed in as ${s.user.email}`;
              })
            }
          >
            Sign in with Google
          </button>
        )}
      </section>

      {session && (
        <>
          <section>
            <h2>Owner: share a label by link and by email</h2>
            <ol>
              <li>
                <button
                  onClick={() =>
                    void run('Create a label file', async () => {
                      const file = await createFile(token(), LABEL_APP, sample('label'));
                      setLabelId(file.id);
                      return `Created ${file.id}`;
                    })
                  }
                >
                  Create a test label file
                </button>
                {labelId && <span> File {labelId}</span>}
              </li>
              <li>
                <button
                  disabled={!labelId}
                  onClick={() =>
                    void run('Share by link', async () => {
                      const permission = await shareWithLink(token(), labelId);
                      const key = await getResourceKey(token(), labelId);
                      const url = `${location.origin}${location.pathname}?label=${encodeURIComponent(labelId)}${key ? `&rk=${encodeURIComponent(key)}` : ''}`;
                      setLink(url);
                      return `Permission ${permission}; resource key ${key ?? 'none'}; link ${url}`;
                    })
                  }
                >
                  Share it with anyone who has the link
                </button>
                {link && (
                  <p className="link">
                    Open this link in a private window: <a href={link}>{link}</a>
                  </p>
                )}
              </li>
              <li>
                <label>
                  Second account&apos;s email{' '}
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
                </label>{' '}
                <button
                  disabled={!labelId || !email}
                  onClick={() =>
                    void run(
                      'Share by email (reader)',
                      async () => (await shareFile(token(), labelId, email, 'reader'), `Shared ${labelId} with ${email} as reader`),
                    )
                  }
                >
                  Share the label read-only with this account
                </button>
              </li>
              <li>
                <button
                  disabled={!labelId}
                  onClick={() =>
                    void run('D. Take the link away', async () => {
                      const anyone = (await listShares(token(), labelId)).filter((s) => s.kind === 'anyone');
                      for (const s of anyone) await unshareFile(token(), labelId, s.id);
                      return `Removed ${anyone.length} link permission(s). Now press "Read the label without signing in" again in the private window.`;
                    })
                  }
                >
                  Take the link away
                </button>
              </li>
            </ol>
          </section>

          <section>
            <h2>Owner: share a directory for editing</h2>
            <ol>
              <li>
                <button
                  onClick={() =>
                    void run('Create a directory file', async () => {
                      const file = await createFile(token(), DIRECTORY_APP, sample('directory'));
                      setDirectoryId(file.id);
                      return `Created ${file.id}`;
                    })
                  }
                >
                  Create a test directory file
                </button>
                {directoryId && <span> File {directoryId}</span>}
              </li>
              <li>
                <button
                  disabled={!directoryId || !email}
                  onClick={() =>
                    void run(
                      'Share by email (writer)',
                      async () => (await shareFile(token(), directoryId, email, 'writer'), `Shared ${directoryId} with ${email} as writer`),
                    )
                  }
                >
                  Share the directory for editing with the second account
                </button>
              </li>
              <li>
                <button
                  disabled={!directoryId}
                  onClick={() =>
                    void run('Owner reads the directory', async () => {
                      const { text, version } = await readFile(token(), directoryId);
                      return `Version ${version}: ${text.slice(0, 200)}`;
                    })
                  }
                >
                  Read the directory again (after the second account changed it)
                </button>
              </li>
            </ol>
          </section>

          <section>
            <h2>Second account: open what was shared</h2>
            <p>Sign out, sign in as the second account, then:</p>
            <ol>
              <li>
                <button
                  onClick={() =>
                    void run('B. Pick a shared file', async () => {
                      const file = await pickSharedFile({
                        token: token(),
                        apiKey: GOOGLE_API_KEY,
                        appId: GOOGLE_APP_ID,
                        locale: 'en',
                        title: 'Open a shared label or directory',
                        query: 'providers-',
                      });
                      if (!file) return 'Picker closed without a file';
                      setPicked(file.id);
                      const { text, version } = await readFile(token(), file.id);
                      return `Picked ${file.name} (${file.id}), version ${version}: ${text.slice(0, 120)}`;
                    })
                  }
                >
                  Open a file shared with me (Google&apos;s picker)
                </button>
                {picked && <span> File {picked}</span>}
              </li>
              <li>
                <button
                  disabled={!picked}
                  onClick={() =>
                    void run('C. Change the picked file', async () => {
                      const { text } = await readFile(token(), picked);
                      const doc = JSON.parse(text) as { providers?: unknown[] };
                      const next = {
                        ...doc,
                        providers: [...(doc.providers ?? []), { name: `Added by ${session.user.email}`, at: new Date().toISOString() }],
                      };
                      const version = await writeFile(token(), picked, next);
                      return `Wrote version ${version}`;
                    })
                  }
                >
                  Add a provider to the picked file (works only if it was shared for editing)
                </button>
              </li>
            </ol>
          </section>
        </>
      )}

      <section>
        <h2>Log</h2>
        {log.length === 0 ? (
          <p>No steps run yet.</p>
        ) : (
          <ol className="log">
            {log.map((e, i) => (
              <li key={i} className={e.ok ? 'ok' : 'failed'}>
                <strong>
                  {e.at} {e.step}: {e.ok ? 'worked' : 'failed'}
                </strong>
                <br />
                {e.detail}
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
