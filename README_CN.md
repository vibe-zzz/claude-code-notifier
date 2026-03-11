# claude-code-notifier

Claude Code 的 macOS 通知提醒工具. 当 Claude 需要你确认权限或完成回复时, 发送系统通知提醒你.

## 功能

- **系统通知** — macOS 通知中心横幅 + 声音 (通过 [terminal-notifier](https://github.com/julienXX/terminal-notifier) 或 osascript)
- **智能焦点检测** — 终端在前台时可选择不发通知, 避免干扰

支持任意终端: iTerm2, Terminal.app, VS Code, Cursor, Windsurf, Ghostty, Warp, WezTerm, Alacritty, Kitty 等.

## 安装

```bash
npm install -g claude-code-notifier
claude-code-notifier setup
```

配置向导会自动检测 [terminal-notifier](https://github.com/julienXX/terminal-notifier), 未安装时提供一键 Homebrew 安装.

## 测试

```bash
claude-code-notifier test
```

## Hook 事件

| 事件 | 触发时机 |
|---|---|
| `Notification` | Claude 需要权限确认时 |
| `Stop` | Claude 完成回复时 |

## 卸载

```bash
claude-code-notifier uninstall
npm uninstall -g claude-code-notifier
```

## 工作原理

本工具将自身注册为 [Claude Code hook](https://docs.anthropic.com/en/docs/claude-code/hooks). 当 Claude 触发 hook 事件时, 运行 `claude-code-notifier notify`, 从 stdin 读取事件数据, 发送 macOS 系统通知.

零 npm 依赖. 通知通过 `terminal-notifier` (如已安装) 或 macOS 原生 `osascript` 发送.

## 配置文件

路径: `~/.claude/claude-notifier.json`

```json
{
  "channels": ["system-notification"],
  "events": ["Notification", "Stop"],
  "sound": "Ping",
  "notifyWhenFocused": true
}
```

| 字段 | 说明 |
|---|---|
| `events` | 监听的事件: `Notification`, `Stop` |
| `sound` | 通知声音: `Ping`, `Glass`, `Hero`, `Pop`, `None` |
| `notifyWhenFocused` | `true` = 始终通知 (默认); `false` = 终端在前台时不通知 |

## 系统要求

- macOS
- Node.js >= 18
- Claude Code CLI

## 许可证

MIT
