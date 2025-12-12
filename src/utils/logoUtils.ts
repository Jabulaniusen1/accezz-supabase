/**
 * Returns the appropriate logo path based on the current month.
 * In December, returns the Christmas logo, otherwise returns the default logo.
 */
export function getLogoPath(): string {
  const currentMonth = new Date().getMonth(); // 0-11, where 11 is December
  return currentMonth === 11 ? '/accezz c l.png' : '/accezz logo c.png';
}

/**
 * Returns the appropriate logo path for white/light backgrounds.
 * In December, returns the Christmas logo, otherwise returns the default white logo.
 */
export function getWhiteLogoPath(): string {
  const currentMonth = new Date().getMonth(); // 0-11, where 11 is December
  return currentMonth === 11 ? '/accezz c l.png' : '/accezz logo.png';
}

