/**
 * Generates a reasonably unique id. Uses crypto.randomUUID when available
 * (all modern browsers / secure contexts), falling back to a timestamp
 * + random string combo so the app still works in non-secure/dev contexts.
 */
export function generateId(prefix: string = 'id'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}
