/**
 * Terminal detection: identify which terminal app is running.
 */

import { execSync } from 'node:child_process';

let cached = null;

const KNOWN_TERMINALS = {
  'iTerm.app': 'iTerm2',
  'iTerm2': 'iTerm2',
  'Apple_Terminal': 'Terminal',
  'vscode': 'VS Code',
  'Ghostty': 'Ghostty',
  'WarpTerminal': 'Warp',
  'WezTerm': 'WezTerm',
  'Alacritty': 'Alacritty',
  'kitty': 'Kitty',
};

/**
 * Detect the current terminal application.
 * @returns {{ name: string, bundleId: string | null }}
 */
export function detectTerminal() {
  if (cached) return cached;

  // 1. Check TERM_PROGRAM env var
  const termProgram = process.env.TERM_PROGRAM;
  if (termProgram && KNOWN_TERMINALS[termProgram]) {
    cached = { name: KNOWN_TERMINALS[termProgram], bundleId: getBundleId(KNOWN_TERMINALS[termProgram]) };
    return cached;
  }

  // 2. Walk parent process chain to detect Cursor/Windsurf/etc.
  const detected = detectFromProcessChain();
  if (detected) {
    cached = detected;
    return cached;
  }

  // 3. Fallback
  cached = { name: termProgram || 'Unknown', bundleId: null };
  return cached;
}

function detectFromProcessChain() {
  try {
    let pid = process.ppid;
    const visited = new Set();
    for (let i = 0; i < 10 && pid && pid > 1 && !visited.has(pid); i++) {
      visited.add(pid);
      const output = execSync(`ps -p ${pid} -o ppid=,comm=`, { encoding: 'utf8', timeout: 2000 }).trim();
      const match = output.match(/^\s*(\d+)\s+(.+)$/);
      if (!match) break;

      const comm = match[2].toLowerCase();
      if (comm.includes('cursor')) return { name: 'Cursor', bundleId: 'com.todesktop.230313mzl4w4u92' };
      if (comm.includes('windsurf')) return { name: 'Windsurf', bundleId: 'com.codeium.windsurf' };
      if (comm.includes('code')) return { name: 'VS Code', bundleId: 'com.microsoft.VSCode' };

      pid = parseInt(match[1], 10);
    }
  } catch {
    // ignore
  }
  return null;
}

const BUNDLE_IDS = {
  'iTerm2': 'com.googlecode.iterm2',
  'Terminal': 'com.apple.Terminal',
  'VS Code': 'com.microsoft.VSCode',
  'Ghostty': 'com.mitchellh.ghostty',
  'Warp': 'dev.warp.Warp-Stable',
  'Cursor': 'com.todesktop.230313mzl4w4u92',
  'Windsurf': 'com.codeium.windsurf',
  'WezTerm': 'com.github.wez.wezterm',
  'Alacritty': 'org.alacritty',
  'Kitty': 'net.kovidgoyal.kitty',
};

function getBundleId(name) {
  return BUNDLE_IDS[name] || null;
}
