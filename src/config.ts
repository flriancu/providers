/**
 * Google sign-in, Drive and the Picker (D-21, Cloud project `providers-directory`). None of
 * these is a secret: they ship in the page. The app uses only the browser token flow, so there
 * is no client secret anywhere. The API key works only from this site's pages and only for the
 * Picker and Drive APIs (restrictions set in the Cloud console).
 */
export const GOOGLE_CLIENT_ID: string = '282176901730-s47m73oincbcp94ncma8phh0pi5mmdos.apps.googleusercontent.com';
export const GOOGLE_API_KEY: string = 'AIzaSyDQOrlAHpt99nCDDodKO3Xpxj65lZjdnXM';
/** The Cloud project's number (project `providers-directory-514913`): the Picker's app id. */
export const GOOGLE_APP_ID: string = '282176901730';

export const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

/** Non-sensitive scopes only. */
export const GOOGLE_SCOPES = ['openid', 'email', 'profile', DRIVE_FILE_SCOPE];

/** Prefix of what this app keeps in the browser: the tab's session, this device's copy, settings. */
export const STORAGE_PREFIX = 'providers-directory';
export const SESSION_KEY = `${STORAGE_PREFIX}.session`;
