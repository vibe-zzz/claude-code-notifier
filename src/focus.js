/**
 * Detect whether the terminal app is currently focused (frontmost).
 */

import { execFileSync } from 'node:child_process';
import { detectTerminal } from './terminal.js';

/**
 * Check if the current terminal app is the frontmost application.
 * @returns {boolean}
 */
export function isTerminalFocused() {
  try {
    const frontmost = execFileSync(
      'osascript',
      ['-e', 'tell application "System Events" to get name of first application process whose frontmost is true'],
      { encoding: 'utf8', timeout: 3000 }
    ).trim();

    const terminal = detectTerminal();
    const terminalNames = getProcessNames(terminal.name);

    return terminalNames.some((name) => frontmost.toLowerCase().includes(name.toLowerCase()));
  } catch {
    // If detection fails, assume not focused (safer to notify)
    return false;
  }
}

/**
 * Map terminal name to possible process names in System Events.
 */
function getProcessNames(name) {
  const map = {
    'iTerm2': ['iTerm2'],
    'Terminal': ['Terminal'],
    'VS Code': ['Code', 'Electron'],
    'Cursor': ['Cursor', 'Electron'],
    'Windsurf': ['Windsurf', 'Electron'],
    'Ghostty': ['Ghostty', 'ghostty'],
    'Warp': ['Warp'],
    'WezTerm': ['WezTerm', 'wezterm-gui'],
    'Alacritty': ['Alacritty', 'alacritty'],
    'Kitty': ['kitty'],
  };
  return map[name] || [name];
}
