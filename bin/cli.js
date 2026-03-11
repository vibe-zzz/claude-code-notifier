#!/usr/bin/env node

/**
 * Claude Code Notifier CLI
 * Usage:
 *   claude-code-notifier setup     - Interactive configuration wizard
 *   claude-code-notifier notify    - Hook entry point (called by Claude Code)
 *   claude-code-notifier test      - Send a test notification
 *   claude-code-notifier uninstall - Remove config and clean hooks
 */

const command = process.argv[2];

const COMMANDS = {
  setup: '../src/commands/setup.js',
  notify: '../src/commands/notify.js',
  test: '../src/commands/test.js',
  uninstall: '../src/commands/uninstall.js',
};

async function main() {
  if (!command || !COMMANDS[command]) {
    printUsage();
    process.exit(command ? 1 : 0);
    return;
  }

  try {
    const mod = await import(COMMANDS[command]);
    await mod.run();
  } catch (err) {
    // For notify command, never fail loudly (it's a hook)
    if (command === 'notify') {
      process.exit(0);
    }
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

function printUsage() {
  console.log(`
Claude Code Notifier - Get notified when Claude needs attention

Usage:
  claude-code-notifier <command>

Commands:
  setup      Interactive configuration wizard
  notify     Hook entry point (called by Claude Code hooks)
  test       Send a test notification
  uninstall  Remove config and clean hooks

Examples:
  claude-code-notifier setup      # Configure channels and events
  claude-code-notifier test       # Verify notifications work
  claude-code-notifier uninstall  # Clean up everything
`);
}

main().catch(() => process.exit(command === 'notify' ? 0 : 1));
