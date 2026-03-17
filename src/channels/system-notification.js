/**
 * System Notification channel.
 * Requires terminal-notifier for reliable macOS notifications.
 */

import { execFile, execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

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
 * @param {{ title: string, message: string, sound?: string, bundleId?: string | null, terminalPid?: number | null, tty?: string | null }} opts
 * @returns {Promise<void>}
 */
export async function send({ title, message, sound = 'Ping', bundleId = null, terminalPid = null, tty = null }) {
  if (!checkTerminalNotifier()) {
    throw new Error('terminal-notifier is not installed. Run `claude-code-notifier setup` to install it.');
  }

  const args = ['-title', title, '-message', message];
  if (sound && sound !== 'None') {
    args.push('-sound', sound);
  }
  const executeArg = buildExecuteArg(terminalPid, bundleId, tty);
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

export function buildExecuteArgForTest(terminalPid, bundleId, tty) {
  return buildExecuteArg(terminalPid, bundleId, tty);
}

function buildExecuteArg(terminalPid, bundleId, tty) {
  // Priority 1: iTerm2 + TTY — precise window/tab/session targeting
  if (tty && bundleId === 'com.googlecode.iterm2') {
    return buildiTerm2FocusScript(tty);
  }
  // Priority 2: Terminal.app + TTY — precise window/tab targeting
  if (tty && bundleId === 'com.apple.Terminal') {
    return buildTerminalAppFocusScript(tty);
  }
  // Priority 3: PID app-level focus (original logic)
  const pid = Number(terminalPid);
  if (Number.isInteger(pid) && pid > 0) {
    const script = `tell application "System Events" to set frontmost of (first process whose unix id is ${pid}) to true`;
    return `osascript -e '${script}'`;
  }
  // Priority 4: bundle ID fallback
  if (bundleId && /^[a-zA-Z0-9.\-_]+$/.test(bundleId)) {
    return `open -b ${bundleId}`;
  }
  return null;
}

function buildiTerm2FocusScript(tty) {
  const script = [
    'tell application "iTerm2"',
    '  repeat with w in windows',
    '    repeat with t in tabs of w',
    '      repeat with s in sessions of t',
    `        if tty of s is "${tty}" then`,
    '          tell w to select',
    '          select t',
    '          select s',
    '          activate',
    '          return',
    '        end if',
    '      end repeat',
    '    end repeat',
    '  end repeat',
    'end tell',
  ].join('\n');
  const tmpPath = '/tmp/ccn-iterm2-focus.applescript';
  writeFileSync(tmpPath, script, 'utf8');
  return `osascript "${tmpPath}"`;
}

function buildTerminalAppFocusScript(tty) {
  const script = [
    'tell application "Terminal"',
    '  repeat with w in windows',
    '    repeat with t in tabs of w',
    `      if tty of t is "${tty}" then`,
    '        set selected tab of w to t',
    '        activate',
    '        return',
    '      end if',
    '    end repeat',
    '  end repeat',
    'end tell',
  ].join('\n');
  const tmpPath = '/tmp/ccn-terminal-focus.applescript';
  writeFileSync(tmpPath, script, 'utf8');
  return `osascript "${tmpPath}"`;
}
