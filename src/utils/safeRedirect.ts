/**
 * Only allow redirects to paths on this site ("/dashboard", "/events?x=1").
 * Absolute URLs, protocol-relative "//evil.com" and "/\evil.com" fall back.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}

/**
 * Organizer-entered links (social profiles, websites): only http(s) URLs may
 * be rendered as links. "instagram.com/x" gets https:// added; anything else
 * (javascript:, data:, ...) returns undefined.
 */
export function safeExternalUrl(value: string | null | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
