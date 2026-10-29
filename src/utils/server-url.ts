/**
 * Turns user input like "192.168.1.236:8080" or "https://api.example.com/" into a base URL.
 * Adds http:// when no scheme is given. Returns null if it doesn't look like a server address.
 */
export function normalizeServerUrl(input: string): string | null {
  const value = input.trim().replace(/\/+$/, '');
  if (!value) return null;
  const withScheme = /^[a-z]+:\/\//i.test(value) ? value : `http://${value}`;
  const match = /^(https?):\/\/([a-z0-9.-]+|\[[0-9a-f:]+\])(:(\d{1,5}))?(\/[^\s]*)?$/i.exec(withScheme);
  if (!match || (match[4] && Number(match[4]) > 65535)) return null;
  return withScheme;
}
