import {
  DriveStorage,
  GoogleAuth,
  LocalReplica,
  MemoryStorage,
  replicaKey,
  SignInError,
  unsavedCopies,
  type ReplicaStore,
  type Session,
  type Storage,
} from 'drive-doc-sync';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ACCOUNT_KEY, DRIVE_APP, DRIVE_FILE_SCOPE, GOOGLE_CLIENT_ID, GOOGLE_SCOPES, SESSION_KEY, STORAGE_PREFIX } from '../config';
import { demoCarry } from '../domain/carry';
import { directoryModel } from '../domain/document';
import { newDirectory, type DirectoryDoc } from '../domain/schema';
import { DEMO_OWNER, sampleDirectory } from './demoDirectory';
import { clearDrafts } from './drafts';

const auth = new GoogleAuth(GOOGLE_CLIENT_ID, GOOGLE_SCOPES, DRIVE_FILE_SCOPE, SESSION_KEY);

/** Who signed in last on this device, offered as "Continue as ...". */
export interface AccountHint {
  email: string;
  name: string;
  sub?: string;
}

/** Why a sign-in did not work, as SignInError says it; `other` for anything else. */
export type SignInFailure = SignInError['reason'] | 'other';

export type Account =
  | {
      kind: 'demo';
      hint: AccountHint | null;
      /** This device holds changes of the hinted account that never reached Drive. */
      unsavedOnDevice: boolean;
      busy: boolean;
      error: SignInFailure | null;
      signIn: (otherAccount?: boolean) => void;
    }
  | {
      kind: 'google';
      sub: string;
      name: string;
      email: string;
      /** Signs in again as the same account; null when it worked. Call from a click. */
      reconnect: () => Promise<SignInFailure | null>;
      /** `keepDeviceCopy`: changes did not reach Drive, so this device's copy stays (D-24). */
      signOut: (keepDeviceCopy?: boolean) => void;
    };

/** Everything the open directory needs: where it lives, and who is editing. */
export interface Connection {
  /** Changes with the account: a new account means a new directory on screen. */
  key: string;
  account: Account;
  storage: Storage<DirectoryDoc>;
  init: () => DirectoryDoc;
  /** The Google account id, or the demo's owner. Recorded on every change (FR-03). */
  by: string;
  owner?: string;
  replica?: ReplicaStore<DirectoryDoc>;
  carry?: () => DirectoryDoc | null;
}

function readHint(): AccountHint | null {
  try {
    const v = JSON.parse(localStorage.getItem(ACCOUNT_KEY) ?? 'null') as Record<string, unknown> | null;
    if (typeof v?.email !== 'string' || !v.email) return null;
    const name = typeof v.name === 'string' && v.name.trim() ? v.name : v.email.split('@')[0]!;
    return { email: v.email, name, ...(typeof v.sub === 'string' && v.sub && { sub: v.sub }) };
  } catch {
    return null;
  }
}

function writeHint(hint: AccountHint | null) {
  try {
    if (hint) localStorage.setItem(ACCOUNT_KEY, JSON.stringify(hint));
    else localStorage.removeItem(ACCOUNT_KEY);
  } catch {
    // storage blocked: the account is picked again next time
  }
}

/** "Continue as Ana" has to fit in the header. */
const firstName = (u: { name: string; email: string }) => u.name.split(' ')[0] || u.email;

const failure = (e: unknown): SignInFailure => (e instanceof SignInError ? e.reason : 'other');

/**
 * Signed out: the demo, in memory, starting with the made-up sample. Signed in: my directory in
 * my own Google Drive (D-21, D-25), with a copy on this device (D-24). What the visitor added in
 * the demo is carried in once at sign-in, without the sample. A reload in the same tab keeps the
 * session (about an hour); a new visit takes one click, since there is no server to keep a
 * longer one.
 */
export function useAccount(): Connection {
  const [session, setSession] = useState<Session | null>(() => auth.restore());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<SignInFailure | null>(null);
  const [hint, setHint] = useState(readHint);
  const [demo, setDemo] = useState(() => new MemoryStorage<DirectoryDoc>());
  const demoRef = useRef(demo);
  /** Set at sign-in: the demo made before it is carried into the account, once. */
  const carryDemo = useRef(false);
  const sub = session?.user.sub;

  const drive = useMemo(() => (sub ? new DriveStorage(() => auth.accessToken(sub), directoryModel, DRIVE_APP) : null), [sub]);
  const replica = useMemo(
    () =>
      session
        ? new LocalReplica(replicaKey(STORAGE_PREFIX, session.user.sub), directoryModel, {
            sub: session.user.sub,
            email: session.user.email,
            name: firstName(session.user),
          })
        : null,
    // one copy per account; the session object changes on every reconnect
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [sub],
  );
  // Signed out: an account whose changes on this device never reached Drive comes first, so
  // "Continue as ..." leads straight to saving them.
  const waiting = useMemo(() => {
    if (sub) return undefined;
    const copies = unsavedCopies(STORAGE_PREFIX);
    return copies.find((a) => a.sub === hint?.sub) ?? copies[0];
  }, [sub, hint]);
  const offered = useMemo<AccountHint | null>(
    () => (waiting ? { email: waiting.email, name: waiting.name, sub: waiting.sub } : hint),
    [waiting, hint],
  );

  useEffect(() => void auth.preload(), []);

  const signIn = useCallback(
    (otherAccount = false) => {
      setBusy(true);
      setError(null);
      auth
        .signIn(otherAccount ? undefined : offered?.email)
        .then((s) => {
          const next = { email: s.user.email, name: firstName(s.user), sub: s.user.sub };
          writeHint(next);
          setHint(next);
          carryDemo.current = true;
          setSession(s);
        })
        .catch((e: unknown) => setError(failure(e)))
        .finally(() => setBusy(false));
    },
    [offered],
  );

  const reconnect = useCallback(
    () =>
      auth.signIn(session?.user.email, session?.user.sub).then(
        (s) => {
          setSession(s);
          return null;
        },
        (e: unknown) => failure(e),
      ),
    [session],
  );

  const signOut = useCallback(
    (keepDeviceCopy = false) => {
      // A copy holding changes that never reached Drive stays, however the sign-out came.
      const keep = keepDeviceCopy || !!replica?.hasUnsaved();
      if (!keep) replica?.clear();
      if (sub) clearDrafts(sub);
      auth.signOut();
      if (!keep) {
        writeHint(null);
        setHint(null);
      }
      setSession(null);
    },
    [replica, sub],
  );

  /** What the visitor added in the demo, once, right after signing in; the demo starts over. */
  const carry = useCallback(() => {
    if (!carryDemo.current) return null;
    carryDemo.current = false;
    const visited = demoRef.current.latest();
    const fresh = new MemoryStorage<DirectoryDoc>();
    demoRef.current = fresh;
    setDemo(fresh);
    return visited && demoCarry(visited, sampleDirectory());
  }, []);

  if (session && drive && replica) {
    const { user } = session;
    return {
      key: user.sub,
      account: { kind: 'google', sub: user.sub, name: user.name, email: user.email, reconnect, signOut },
      storage: drive,
      init: () => newDirectory(user.sub),
      by: user.sub,
      owner: user.sub,
      replica,
      carry,
    };
  }
  return {
    key: 'demo',
    account: { kind: 'demo', hint: offered, unsavedOnDevice: !!waiting, busy, error, signIn },
    storage: demo,
    init: () => sampleDirectory(),
    by: DEMO_OWNER,
  };
}
