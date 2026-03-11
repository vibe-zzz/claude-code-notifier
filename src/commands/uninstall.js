/**
 * uninstall command: remove config and clean hooks from settings.json.
 */

import { unlinkSync, existsSync } from 'node:fs';
import { CONFIG_PATH } from '../config.js';
import { removeHooks } from '../settings.js';

export async function run() {
  console.log('\nClaude Code Notifier Uninstall\n');

  // 1. Remove hooks from settings.json
  try {
    removeHooks();
    console.log('Removed hooks from ~/.claude/settings.json');
  } catch (err) {
    console.error('Warning: could not clean hooks:', err.message);
  }

  // 2. Remove config file
  if (existsSync(CONFIG_PATH)) {
    try {
      unlinkSync(CONFIG_PATH);
      console.log('Removed config file:', CONFIG_PATH);
    } catch (err) {
      console.error('Warning: could not remove config:', err.message);
    }
  } else {
    console.log('No config file found (already clean).');
  }

  console.log('\nUninstall complete. You can now run: npm uninstall -g claude-code-notifier');
}
