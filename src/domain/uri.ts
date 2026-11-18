/**
 * `decodeURIComponent`, keeping the text as typed when it holds an escape that is not one
 * ("50%off", "%E0%A4%A"): addresses come from people and other apps, so a stray `%` is input to
 * show, not an error.
 */
export function decodeOrKeep(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch (error) {
    if (error instanceof URIError) return text;
    throw error;
  }
}
