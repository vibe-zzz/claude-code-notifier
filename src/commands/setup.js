/**
 * setup command: interactive configuration wizard.
 */

import { execFileSync, execFile } from 'node:child_process';
import { multiSelect, singleSelect } from '../prompt.js';
import { writeConfig } from '../config.js';
import { addHooks } from '../settings.js';
import { detectTerminal } from '../terminal.js';

const EVENTS = [
  { label: 'Notification (Claude needs permission)', default: true },
  { label: 'Stop (Claude finished responding)', default: true },
];

const EVENT_KEYS = ['Notification', 'Stop'];

const SOUNDS = [
  { label: 'Ping', default: true },
  { label: 'Glass', default: false },
  { label: 'Hero', default: false },
  { label: 'Pop', default: false },
  { label: 'None', default: false },
];

function hasTerminalNotifier() {
  try {
    execFileSync('which', ['terminal-notifier'], { timeout: 2000, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function hasBrew() {
  try {
    execFileSync('which', ['brew'], { timeout: 2000, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function installTerminalNotifier() {
  return new Promise((resolve, reject) => {
    console.log('\nInstalling terminal-notifier via Homebrew...');
    const proc = execFile('brew', ['install', 'terminal-notifier'], { timeout: 120000 }, (err) => {
      if (err) reject(err);
      else resolve();
    });
    proc.stdout?.pipe(process.stdout);
    proc.stderr?.pipe(process.stderr);
  });
}

export async function run() {
  console.log('\nClaude Code Notifier Setup\n');

  // 0. terminal-notifier is required - enforce installation before proceeding
  if (!hasTerminalNotifier()) {
    console.log('terminal-notifier is required but not installed.');
    console.log('Without it, macOS notifications cannot be delivered reliably.\n');

    if (hasBrew()) {
      const installIndex = await singleSelect(
        'Install terminal-notifier now via Homebrew?',
        [
          { label: 'Yes - install now (required to continue)', default: true },
          { label: 'No - abort setup', default: false },
        ]
      );

      if (installIndex !== 0) {
        console.log('\nSetup aborted. Install terminal-notifier first:');
        console.log('  brew install terminal-notifier');
        process.exit(1);
      }

      try {
        await installTerminalNotifier();
        console.log('\nterminal-notifier installed successfully!');
      } catch (err) {
        console.error('\nFailed to install terminal-notifier:', err.message);
        console.log('Install it manually and re-run setup:');
        console.log('  brew install terminal-notifier');
        process.exit(1);
      }

      // Verify installation succeeded
      if (!hasTerminalNotifier()) {
        console.error('\nterminal-notifier still not found after installation.');
        console.log('Install it manually and re-run setup:');
        console.log('  brew install terminal-notifier');
        process.exit(1);
      }
    } else {
      console.log('Homebrew is not installed. Install terminal-notifier manually:');
      console.log('  brew install terminal-notifier');
      console.log('\nThen re-run setup.');
      process.exit(1);
    }
  } else {
    console.log('terminal-notifier: installed');
  }

  // 1. Select events
  const eventIndices = await multiSelect(
    'Select hook events:',
    EVENTS
  );
  const events = eventIndices.map((i) => EVENT_KEYS[i]);

  // 2. Select sound
  const soundIndex = await singleSelect('Notification sound:', SOUNDS);
  const sound = SOUNDS[soundIndex].label;

  // 3. Notify when terminal is focused?
  const focusedIndex = await singleSelect(
    'Notify when terminal is in foreground?',
    [
      { label: 'Yes - always notify', default: true },
      { label: 'No - only notify when terminal is in background', default: false },
    ]
  );
  const notifyWhenFocused = focusedIndex === 0;

  // 4. Detect terminal and persist bundleId as runtime fallback
  const terminal = detectTerminal();
  const terminalBundleId = terminal.bundleId || null;

  // 5. Save config
  const channels = ['system-notification'];
  const config = { channels, events, sound, notifyWhenFocused, terminalBundleId };
  writeConfig(config);

  // 6. Update settings.json hooks
  addHooks(events);

  // 7. Show summary
  console.log(`\nDetected terminal: ${terminal.name}`);
  if (terminalBundleId) {
    console.log(`Terminal bundle ID: ${terminalBundleId}`);
  }
  console.log('Configuration saved.');
  console.log('Hooks added to ~/.claude/settings.json');
  console.log('\nSetup complete! Run `claude-code-notifier test` to verify.');
}
