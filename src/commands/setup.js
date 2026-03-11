/**
 * setup command: interactive configuration wizard.
 */

import { execFileSync, execFile } from 'node:child_process';
import { multiSelect, singleSelect, ask } from '../prompt.js';
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

  // 0. Check terminal-notifier dependency
  if (!hasTerminalNotifier()) {
    console.log('terminal-notifier is not installed.');
    console.log('It is recommended for reliable macOS notifications.');
    console.log('(Without it, notifications fall back to osascript which may be blocked by macOS.)\n');

    if (hasBrew()) {
      const installIndex = await singleSelect(
        'Install terminal-notifier now?',
        [
          { label: 'Yes - install via Homebrew (recommended)', default: true },
          { label: 'No - skip, use osascript fallback', default: false },
        ]
      );

      if (installIndex === 0) {
        try {
          await installTerminalNotifier();
          console.log('\nterminal-notifier installed successfully!');
        } catch (err) {
          console.error('\nFailed to install terminal-notifier:', err.message);
          console.log('Continuing with osascript fallback...');
        }
      }
    } else {
      console.log('Homebrew is not installed. To install terminal-notifier manually:');
      console.log('  brew install terminal-notifier');
      console.log('Continuing with osascript fallback...\n');
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

  // 3. Select sound
  const soundIndex = await singleSelect('Notification sound:', SOUNDS);
  const sound = SOUNDS[soundIndex].label;

  // 4. Notify when terminal is focused?
  const focusedIndex = await singleSelect(
    'Notify when terminal is in foreground?',
    [
      { label: 'Yes - always notify', default: true },
      { label: 'No - only notify when terminal is in background', default: false },
    ]
  );
  const notifyWhenFocused = focusedIndex === 0;

  // 5. Save config
  const channels = ['system-notification'];
  const config = { channels, events, sound, notifyWhenFocused };
  writeConfig(config);

  // 6. Update settings.json hooks
  addHooks(events);

  // 7. Show summary
  const terminal = detectTerminal();
  console.log(`\nDetected terminal: ${terminal.name}`);
  console.log('Configuration saved.');
  console.log('Hooks added to ~/.claude/settings.json');
  console.log('\nSetup complete! Run `claude-code-notifier test` to verify.');
}
