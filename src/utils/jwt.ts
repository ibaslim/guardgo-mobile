/**
 * Reads the expiry (`exp`) of a JWT as a millisecond timestamp, without verifying the token.
 * Returns null for tokens without an expiry (demo tokens) or that can't be decoded.
 */
export function readTokenExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}
