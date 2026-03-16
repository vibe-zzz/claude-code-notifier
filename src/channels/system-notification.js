/**
 * System Notification channel.
 * Requires terminal-notifier for reliable macOS notifications.
 */

import { execFile, execFileSync } from 'node:child_process';

let hasTerminalNotifier = null;

export function checkTerminalNotifier() {
  if (hasTerminalNotifier !== null) return hasTerminalNotifier;
  try {
    execFileSync('which', ['terminal-notifier'], { timeout: 2000, stdio: 'ignore' });
    hasTerminalNotifier = true;
  } catch {
    hasTerminalNotifier = false;
  }
  return hasTerminalNotifier;
}

/**
 * Send a macOS system notification via terminal-notifier.
 * @param {{ title: string, message: string, sound?: string, bundleId?: string | null, terminalPid?: number | null }} opts
 * @returns {Promise<void>}
 */
export async function send({ title, message, sound = 'Ping', bundleId = null, terminalPid = null }) {
  if (!checkTerminalNotifier()) {
    throw new Error('terminal-notifier is not installed. Run `claude-code-notifier setup` to install it.');
  }

  const args = ['-title', title, '-message', message];
  if (sound && sound !== 'None') {
    args.push('-sound', sound);
  }
  const executeArg = buildExecuteArg(terminalPid, bundleId);
  if (executeArg) {
    args.push('-execute', executeArg);
  }

  return new Promise((resolve, reject) => {
    execFile('terminal-notifier', args, { timeout: 5000 }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function buildExecuteArg(terminalPid, bundleId) {
  const pid = Number(terminalPid);
  if (Number.isInteger(pid) && pid > 0) {
    const script = `tell application "System Events" to set frontmost of (first process whose unix id is ${pid}) to true`;
    return `osascript -e '${script}'`;
  }
  if (bundleId && /^[a-zA-Z0-9.\-_]+$/.test(bundleId)) {
    return `open -b ${bundleId}`;
  }
  return null;
}
