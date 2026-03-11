/**
 * Config management: read/write ~/.claude/claude-notifier.json
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CONFIG_DIR = join(homedir(), '.claude');
const CONFIG_PATH = join(CONFIG_DIR, 'claude-notifier.json');

export { CONFIG_PATH };

const DEFAULT_CONFIG = {
  channels: ['system-notification'],
  events: ['Notification', 'Stop'],
  sound: 'Ping',
  notifyWhenFocused: true,
};

/**
 * Read config, falling back to defaults if missing or corrupt.
 * @returns {object}
 */
export function readConfig() {
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf8');
    const config = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...config };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Write config to disk (atomic via tmp + rename).
 * @param {object} config
 */
export function writeConfig(config) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  const tmpPath = CONFIG_PATH + '.tmp';
  writeFileSync(tmpPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
  renameSync(tmpPath, CONFIG_PATH);
}
