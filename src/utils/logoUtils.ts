/**
 * Returns the logo path.
 * Always returns the primary logo: /accezz c l.png
 * @deprecated Use the Logo component instead for automatic fallback handling.
 */
export function getLogoPath(): string {
  return '/accezz c l.png';
}

/**
 * Returns the logo path for white/light backgrounds.
 * Always returns the primary logo: /accezz c l.png
 * @deprecated Use the Logo component instead for automatic fallback handling.
 */
export function getWhiteLogoPath(): string {
  return '/accezz c l.png';
}

/**
 * Returns an array of logo paths in fallback order.
 * Useful for implementing custom fallback logic.
 */
export function getLogoFallbacks(_variant: 'default' | 'white' = 'default'): string[] {
  return [
    '/accezz c l.png',
    '/accezz logo c.png',
    '/accezz logo.png',
    '/logo.png',
    '/logoi.png',
  ];
}

