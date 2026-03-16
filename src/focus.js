/**
 * Detect whether the terminal app is currently focused (frontmost).
 */

import { execFileSync } from 'node:child_process';
import { detectTerminal } from './terminal.js';

/**
 * Check if the current terminal app is the frontmost application.
 * Compares the frontmost app's bundle ID with the detected terminal's bundle ID.
 * @returns {boolean}
 */
export function isTerminalFocused() {
  try {
    const terminal = detectTerminal();
    if (!terminal.bundleId) return false;

    const frontmostBundleId = execFileSync(
      'osascript',
      ['-e', 'tell application "System Events" to get bundle identifier of (first application process whose frontmost is true)'],
      { encoding: 'utf8', timeout: 3000 }
    ).trim();

    return frontmostBundleId === terminal.bundleId;
  } catch {
    // If detection fails, assume not focused (safer to notify)
    return false;
  }
}
