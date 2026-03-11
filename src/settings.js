/**
 * Safe merge of hooks into ~/.claude/settings.json
 * Uses --managed-by marker to track our hooks. Idempotent.
 */

import { readFileSync, writeFileSync, renameSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SETTINGS_DIR = join(homedir(), '.claude');
const SETTINGS_PATH = join(SETTINGS_DIR, 'settings.json');
const MARKER = '--managed-by claude-code-notifier';

export { SETTINGS_PATH };

/**
 * Read current settings.json, return parsed object or empty.
 */
function readSettings() {
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Atomic write settings.json
 */
function writeSettings(settings) {
  mkdirSync(SETTINGS_DIR, { recursive: true });
  const tmpPath = SETTINGS_PATH + '.tmp';
  writeFileSync(tmpPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
  renameSync(tmpPath, SETTINGS_PATH);
}

/**
 * Backup settings.json before first modification.
 */
function backupSettings() {
  if (!existsSync(SETTINGS_PATH)) return;
  const backupPath = SETTINGS_PATH + '.backup';
  if (!existsSync(backupPath)) {
    copyFileSync(SETTINGS_PATH, backupPath);
    console.log(`Backed up settings.json to ${backupPath}`);
  }
}

/**
 * Remove all hooks managed by this tool from a hooks object.
 */
function removeManaged(hooks) {
  if (!hooks || typeof hooks !== 'object') return {};
  const cleaned = {};
  for (const [event, rules] of Object.entries(hooks)) {
    if (!Array.isArray(rules)) {
      cleaned[event] = rules;
      continue;
    }
    const filtered = rules.filter((rule) => {
      if (!rule || !Array.isArray(rule.hooks)) return true;
      // Keep rule if it has any non-managed hooks
      const nonManaged = rule.hooks.filter(
        (h) => !h.command || !h.command.includes(MARKER)
      );
      if (nonManaged.length > 0) {
        rule.hooks = nonManaged;
        return true;
      }
      return false;
    });
    if (filtered.length > 0) {
      cleaned[event] = filtered;
    }
  }
  return cleaned;
}

/**
 * Build hook entry for a given event.
 */
function buildHookEntry() {
  return {
    matcher: '',
    hooks: [
      {
        type: 'command',
        command: `claude-code-notifier notify ${MARKER}`,
        timeout: 8,
      },
    ],
  };
}

/**
 * Add hooks for the specified events to settings.json.
 * @param {string[]} events - e.g. ['Notification', 'Stop']
 */
export function addHooks(events) {
  backupSettings();
  const settings = readSettings();
  const hooks = removeManaged(settings.hooks || {});

  for (const event of events) {
    if (!hooks[event]) hooks[event] = [];
    hooks[event].push(buildHookEntry());
  }

  settings.hooks = hooks;
  writeSettings(settings);
}

/**
 * Remove all managed hooks from settings.json.
 */
export function removeHooks() {
  if (!existsSync(SETTINGS_PATH)) return;
  const settings = readSettings();
  if (!settings.hooks) return;
  settings.hooks = removeManaged(settings.hooks);

  // Clean up empty hooks object
  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  writeSettings(settings);
}
