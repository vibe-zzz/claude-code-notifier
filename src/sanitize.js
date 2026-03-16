/**
 * Sanitize notification strings, stripping control characters.
 */

/**
 * Sanitize a notification title/message, stripping control characters.
 * @param {string} str
 * @param {string} fallback
 * @returns {string}
 */
export function sanitize(str, fallback = '') {
  if (typeof str !== 'string' || str.trim().length === 0) return fallback;
  // Strip control chars except space
  return str.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 500);
}
