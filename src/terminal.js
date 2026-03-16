/**
 * Terminal detection: identify which terminal app is running.
 */

import { execSync, execFileSync } from 'node:child_process';

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

/**
 * Detect the current terminal application.
 * @returns {{ name: string, bundleId: string | null, pid: number | null }}
 */
export function detectTerminal() {
  if (cached) return cached;

  // 1. Walk process chain using osascript to dynamically query bundle ID and displayed name.
  //    Returns { name, bundleId, pid } when a GUI ancestor is found.
  const fromChain = detectFromProcessChain();
  if (fromChain) {
    cached = fromChain;
    return cached;
  }

  // 2. TERM_PROGRAM fast path fallback (no PID available)
  const termProgram = process.env.TERM_PROGRAM;
  if (termProgram && KNOWN_TERMINALS[termProgram]) {
    const name = KNOWN_TERMINALS[termProgram];
    cached = { name, bundleId: BUNDLE_IDS[name] || null, pid: null };
    return cached;
  }

  // 3. Fallback
  cached = { name: termProgram || 'Unknown', bundleId: null, pid: null };
  return cached;
}

function detectFromProcessChain() {
  try {
    let pid = process.ppid;
    const visited = new Set();
    for (let i = 0; i < 10 && pid && pid > 1 && !visited.has(pid); i++) {
      visited.add(pid);
      const psOutput = execSync(`ps -p ${pid} -o ppid=,comm=`, { encoding: 'utf8', timeout: 2000 }).trim();
      const psMatch = psOutput.match(/^\s*(\d+)\s+(.+)$/);
      if (!psMatch) break;
      const ppid = parseInt(psMatch[1], 10);

      // Query bundle identifier and displayed name via osascript for this PID.
      // Only GUI applications registered with System Events will succeed.
      try {
        const result = execFileSync('osascript', [
          '-e', 'tell application "System Events"',
          '-e', `set p to first process whose unix id is ${pid}`,
          '-e', 'return (bundle identifier of p) & "\\n" & (displayed name of p)',
          '-e', 'end tell',
        ], { encoding: 'utf8', timeout: 2000, stdio: ['pipe', 'pipe', 'pipe'] }).trim();

        const newlineIdx = result.indexOf('\n');
        if (newlineIdx !== -1) {
          const bundleId = result.substring(0, newlineIdx).trim();
          const displayedName = result.substring(newlineIdx + 1).trim();
          // A valid bundle ID contains at least one dot (reverse domain notation)
          if (bundleId && bundleId.includes('.') && bundleId !== 'missing value') {
            return { name: displayedName || bundleId, bundleId, pid };
          }
        }
      } catch {
        // Not a GUI app visible to System Events, continue to parent
      }

      pid = ppid;
    }
  } catch {
    // ignore
  }
  return null;
}
