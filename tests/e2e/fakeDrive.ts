import type { Page, Route } from '@playwright/test';

export const USER = { sub: 'u1', name: 'Ana Test', email: 'ana@example.test' };

/**
 * Google sign-in and Google Drive, faked in the test process: never a request to Google (the
 * Playwright config also sends anything a route misses to a proxy that is not there).
 */
export class FakeDrive {
  readonly files = new Map<string, { content: unknown; version: number; trashed?: boolean }>();
  /** Writes that answer 503 before the next one succeeds. */
  failWrites = 0;
  /** File lists, content downloads and writes seen. */
  lists = 0;
  downloads = 0;
  writes = 0;
  private nextId = 1;

  /** A directory file already in Drive (from another device), optionally in the trash. */
  seed(content: unknown, trashed = false): string {
    const id = `f${this.nextId++}`;
    this.files.set(id, { content, version: 1, ...(trashed && { trashed }) });
    return id;
  }

  /**
   * `signedIn`: the tab already holds a session, as google/auth.ts keeps it in sessionStorage
   * after a sign-in. Otherwise "Sign in with Google" goes through the fake Google script.
   */
  async attach(page: Page, { signedIn = true } = {}) {
    await page.route('https://accounts.google.com/gsi/client', (route) =>
      route.fulfill({ contentType: 'text/javascript', body: FAKE_GIS }),
    );
    if (signedIn) {
      await page.addInitScript((user) => {
        if (sessionStorage.getItem('test.started')) return; // a reload keeps what the app did
        sessionStorage.setItem('test.started', '1');
        sessionStorage.setItem('providers-directory.session', JSON.stringify({ token: 'tok', session: { user, expiresAt: 9e15 } }));
      }, USER);
    }
    await page.route('https://www.googleapis.com/**', (route) => this.answer(route));
  }

  /** The directory as saved in Drive (the file not in the trash). */
  content(): Directory {
    return [...this.files.values()].find((f) => !f.trashed)?.content as Directory;
  }

  /** Another device saves: `change` edits the file, and its version goes up. */
  change(change: (doc: Directory) => void) {
    const file = [...this.files.values()].find((f) => !f.trashed)!;
    change(file.content as Directory);
    file.version++;
  }

  private async answer(route: Route) {
    const req = route.request();
    const url = new URL(req.url());
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (url.pathname === '/oauth2/v3/userinfo') return json(USER);

    const id = url.pathname.split('/').pop()!;
    if (url.pathname === '/drive/v3/files' && req.method() === 'GET') {
      this.lists++;
      const trashed = url.searchParams.get('q')!.includes('trashed=true');
      const files = [...this.files].filter(([, f]) => !!f.trashed === trashed).map(([fid, f]) => ({ id: fid, version: String(f.version) }));
      return json({ files });
    }
    if (url.pathname.startsWith('/drive/v3/files/') && req.method() === 'GET') {
      const file = this.files.get(id);
      if (!file) return json({ error: 'not found' }, 404);
      if (url.searchParams.get('alt') !== 'media') return json({ version: String(file.version), trashed: !!file.trashed });
      this.downloads++;
      return json(file.content);
    }
    if (url.pathname === '/upload/drive/v3/files' && req.method() === 'POST') {
      // Split on the boundary the request declares, as Drive does.
      const boundary = /boundary=([^;]+)/.exec(req.headers()['content-type'] ?? '')![1]!;
      const parts = req.postData()!.split(`--${boundary}`);
      const content: unknown = JSON.parse(parts[2]!.split('\r\n\r\n')[1]!.trim());
      const fid = `f${this.nextId++}`;
      this.files.set(fid, { content, version: 1 });
      return json({ id: fid, version: '1' });
    }
    if (url.pathname.startsWith('/upload/drive/v3/files/') && req.method() === 'PATCH') {
      this.writes++;
      if (this.failWrites > 0) {
        this.failWrites--;
        return json({ error: 'backend error' }, 503);
      }
      const file = this.files.get(id)!;
      file.content = JSON.parse(req.postData()!);
      file.version++;
      return json({ version: String(file.version) });
    }
    return json({ error: `unexpected ${req.method()} ${url.pathname}` }, 400);
  }
}

/** The directory file's shape, as far as the tests look into it. */
export interface Directory {
  owner: { googleSub: string };
  providers: Record<string, { id: string; name: string; labelIds: string[]; deleted?: true } & Record<string, unknown>>;
  labels: Record<string, { id: string; name: string; deleted?: true }>;
}

export const providerNames = (doc: Directory | undefined) =>
  Object.values(doc?.providers ?? {})
    .filter((p) => !p.deleted)
    .map((p) => p.name)
    .sort();

/** Google's token client, the parts the app uses: every request is granted at once. */
const FAKE_GIS = `
window.google = { accounts: { oauth2: {
  initTokenClient(config) {
    const client = { callback: config.callback, requestAccessToken() {
      setTimeout(() => client.callback({ access_token: 'tok', expires_in: 3600, scope: config.scope }), 0);
    } };
    return client;
  },
  hasGrantedAllScopes() { return true; },
} } };
`;
