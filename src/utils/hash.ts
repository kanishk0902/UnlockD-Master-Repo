/**
 * Computes a genuine SHA-256 hex digest using the browser-native Web
 * Crypto API (window.crypto.subtle) — no external hashing package.
 * Available in any secure context, which includes http://localhost,
 * so it works inside the Docker dev server without extra config.
 */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
