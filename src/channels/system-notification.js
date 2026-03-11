/**
 * System Notification channel.
 * Prefers terminal-notifier (more reliable), falls back to osascript.
 */

import { execFile, execFileSync } from 'node:child_process';
import { escapeAppleScript } from '../sanitize.js';

let hasTerminalNotifier = null;

function checkTerminalNotifier() {
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
 * Send a macOS system notification.
 * @param {{ title: string, message: string, sound?: string }} opts
 * @returns {Promise<void>}
 */
export async function send({ title, message, sound = 'Ping' }) {
  if (checkTerminalNotifier()) {
    return sendViaTerminalNotifier({ title, message, sound });
  }
  return sendViaOsascript({ title, message, sound });
}

function sendViaTerminalNotifier({ title, message, sound }) {
  const args = ['-title', title, '-message', message];
  if (sound && sound !== 'None') {
    args.push('-sound', sound);
  }

  return new Promise((resolve, reject) => {
    execFile('terminal-notifier', args, { timeout: 5000 }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function sendViaOsascript({ title, message, sound }) {
  const t = escapeAppleScript(title);
  const m = escapeAppleScript(message);
  const soundPart = sound && sound !== 'None'
    ? ` sound name "${escapeAppleScript(sound)}"`
    : '';

  const script = `display notification "${m}" with title "${t}"${soundPart}`;

  return new Promise((resolve, reject) => {
    execFile('osascript', ['-e', script], { timeout: 5000 }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
