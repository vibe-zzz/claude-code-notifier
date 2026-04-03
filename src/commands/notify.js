/**
 * notify command: hook entry point.
 * Called by Claude Code hooks. Reads stdin for event data, dispatches notifications.
 */

import { readStdin } from '../stdin.js';
import { readConfig } from '../config.js';
import { dispatch } from '../channels/index.js';
import { sanitize } from '../sanitize.js';
import { isTerminalFocused } from '../focus.js';
import { detectTerminal } from '../terminal.js';

const EVENT_MESSAGES = {
  Notification: {
    title: 'Claude Code',
    message: 'Claude needs your attention',
  },
  Stop: {
    title: 'Claude Code',
    message: 'Claude has finished responding',
  },
};

export async function run() {
  try {
    // Read config and stdin in parallel
    const [config, stdinData] = await Promise.all([
      Promise.resolve(readConfig()),
      readStdin(2000),
    ]);

    // Skip idle_prompt notifications (Claude waiting for user input)
    if (stdinData?.notification_type === 'idle_prompt') {
      return;
    }

    // Determine event type and message
    const hookEvent = stdinData?.hook_event_name || 'Notification';
    const defaults = EVENT_MESSAGES[hookEvent] || EVENT_MESSAGES.Notification;

    const title = sanitize(stdinData?.title, defaults.title);
    const message = sanitize(stdinData?.message, defaults.message);
    const sound = config.sound || 'Ping';

    // Skip notification if terminal is focused and user opted out
    if (!config.notifyWhenFocused && isTerminalFocused()) {
      return;
    }

    // Resolve bundleId, terminalPid, and tty for click-to-focus
    const terminal = detectTerminal();
    const bundleId = terminal.bundleId || config.terminalBundleId || null;
    const terminalPid = terminal.pid || null;
    const tty = terminal.tty || null;

    await dispatch(config.channels || ['system-notification'], { title, message, sound, bundleId, terminalPid, tty });
  } catch {
    // Hook must never block Claude - exit silently
    process.exit(0);
  }
}
