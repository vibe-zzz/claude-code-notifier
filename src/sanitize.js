/**
 * Sanitize strings for safe use in osascript commands.
 * Prevents command injection via user-controlled input.
 */

/**
 * Escape a string for use inside AppleScript double-quoted strings.
 * @param {string} str
 * @returns {string}
 */
export function escapeAppleScript(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, ' ')
    .slice(0, 500);
}

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
