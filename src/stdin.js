/**
 * Non-blocking stdin reader for Hook input.
 * Claude Code pipes JSON to hook commands via stdin.
 */

/**
 * Read stdin with a timeout. Returns parsed JSON or null.
 * @param {number} timeoutMs
 * @returns {Promise<object|null>}
 */
export async function readStdin(timeoutMs = 2000) {
  // If stdin is a TTY, no piped data
  if (process.stdin.isTTY) return null;

  return new Promise((resolve) => {
    let data = '';
    const timer = setTimeout(() => {
      process.stdin.removeAllListeners();
      process.stdin.pause();
      resolve(tryParse(data));
    }, timeoutMs);

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      clearTimeout(timer);
      resolve(tryParse(data));
    });
    process.stdin.on('error', () => {
      clearTimeout(timer);
      resolve(null);
    });
    process.stdin.resume();
  });
}

function tryParse(data) {
  if (!data || !data.trim()) return null;
  try {
    return JSON.parse(data.trim());
  } catch {
    return null;
  }
}
