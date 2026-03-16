# claude-code-notifier

macOS notification tool for Claude Code. Get notified when Claude needs your attention or finishes a task — click the notification to instantly focus back to your terminal or IDE.

## Features

- **System Notification** — macOS notification center banner + sound via [terminal-notifier](https://github.com/julienXX/terminal-notifier)
- **Click to Focus** — clicking the notification automatically brings your terminal/IDE window to the foreground
- **Smart Focus Detection** — optionally skip notifications when the terminal is already in the foreground

Supports any terminal or IDE: iTerm2, Terminal.app, VS Code, Cursor, Windsurf, Ghostty, Warp, WezTerm, Alacritty, Kitty, and more.

## Requirements

- macOS
- Node.js >= 18
- Claude Code CLI
- [terminal-notifier](https://github.com/julienXX/terminal-notifier) (required — setup will offer to install it)

## Install

```bash
npm install -g @vibe-zzz/claude-code-notifier
claude-code-notifier setup
```

The setup wizard will verify that terminal-notifier is installed (and offer to install it via Homebrew if not), then configure hooks and save your preferences.

## Test

```bash
claude-code-notifier test
```

Prints the detected terminal name, bundle ID, and PID, then sends a test notification.

## Hook Events

| Event | When |
|---|---|
| `Notification` | Claude needs permission confirmation |
| `Stop` | Claude finished responding |

## How It Works

The tool registers itself as a [Claude Code hook](https://docs.anthropic.com/en/docs/claude-code/hooks). When Claude triggers a hook event, `claude-code-notifier notify` reads the event from stdin and sends a notification via terminal-notifier.

**Click-to-focus** works by passing a `-execute` command to terminal-notifier that runs when you click the notification:

- If the terminal PID is known (detected via process chain + osascript): focuses the exact window instance
- If only the bundle ID is known: activates the app via `open -b <bundleId>` (fallback)

Terminal detection walks the process chain using osascript to dynamically query each ancestor's bundle identifier — no hardcoded app list, any terminal or IDE works automatically.

Zero npm dependencies.

## Configuration

Config file: `~/.claude/claude-notifier.json`

```json
{
  "channels": ["system-notification"],
  "events": ["Notification", "Stop"],
  "sound": "Ping",
  "notifyWhenFocused": true,
  "terminalBundleId": "com.googlecode.iterm2"
}
```

| Field | Description |
|---|---|
| `events` | Hook events to listen for: `Notification`, `Stop` |
| `sound` | Notification sound: `Ping`, `Glass`, `Hero`, `Pop`, `None` |
| `notifyWhenFocused` | `true` = always notify (default); `false` = only notify when terminal is in background |
| `terminalBundleId` | Saved by setup as a fallback bundle ID for click-to-focus when runtime detection fails |

## Uninstall

```bash
claude-code-notifier uninstall
npm uninstall -g @vibe-zzz/claude-code-notifier
```

## License

MIT
