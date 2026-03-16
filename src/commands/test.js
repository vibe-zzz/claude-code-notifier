/**
 * test command: send a test notification through all configured channels.
 */

import { readConfig } from '../config.js';
import { dispatch } from '../channels/index.js';
import { detectTerminal } from '../terminal.js';

export async function run() {
  const config = readConfig();
  const terminal = detectTerminal();

  const bundleId = terminal.bundleId || config.terminalBundleId || null;
  const terminalPid = terminal.pid || null;

  console.log(`\nDetected terminal: ${terminal.name}`);
  console.log(`Bundle ID: ${bundleId || '(not detected)'}`);
  console.log(`Terminal PID: ${terminalPid || '(not detected)'}`);
  console.log(`Configured channels: ${config.channels.join(', ')}`);
  console.log(`Sound: ${config.sound}`);
  console.log('\nSending test notification...\n');

  try {
    await dispatch(config.channels, {
      title: 'Claude Code Notifier',
      message: 'Test notification - if you see this, it works!',
      sound: config.sound,
      bundleId,
      terminalPid,
    });
    console.log('Test notification sent successfully!');
  } catch (err) {
    console.error('Error sending test notification:', err.message);
    process.exit(1);
  }
}
