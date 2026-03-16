# claude-code-notifier

Claude Code 的 macOS 通知提醒工具. 当 Claude 需要你确认权限或完成回复时, 发送系统通知提醒你 — 点击通知即可自动聚焦回终端或 IDE 窗口.

## 功能

- **系统通知** — macOS 通知中心横幅 + 声音 (通过 [terminal-notifier](https://github.com/julienXX/terminal-notifier))
- **点击聚焦** — 点击通知自动将终端/IDE 窗口切换到前台
- **智能焦点检测** — 终端在前台时可选择不发通知, 避免干扰

支持任意终端或 IDE: iTerm2, Terminal.app, VS Code, Cursor, Windsurf, Ghostty, Warp, WezTerm, Alacritty, Kitty 等.

## 系统要求

- macOS
- Node.js >= 18
- Claude Code CLI
- [terminal-notifier](https://github.com/julienXX/terminal-notifier) (必须 — 安装向导会提供自动安装)

## 安装

```bash
npm install -g @vibe-zzz/claude-code-notifier
claude-code-notifier setup
```

配置向导会验证 terminal-notifier 是否已安装 (未安装时提供一键 Homebrew 安装), 然后配置 hooks 并保存你的偏好设置.

## 测试

```bash
claude-code-notifier test
```

打印检测到的终端名称、Bundle ID 和 PID, 并发送一条测试通知.

## Hook 事件

| 事件 | 触发时机 |
|---|---|
| `Notification` | Claude 需要权限确认时 |
| `Stop` | Claude 完成回复时 |

## 工作原理

本工具将自身注册为 [Claude Code hook](https://docs.anthropic.com/en/docs/claude-code/hooks). 当 Claude 触发 hook 事件时, 运行 `claude-code-notifier notify`, 从 stdin 读取事件数据, 通过 terminal-notifier 发送 macOS 系统通知.

**点击聚焦**通过向 terminal-notifier 传入 `-execute` 参数实现, 点击通知时执行跳转命令:

- 若已获取终端 PID (通过进程链 + osascript 检测): 精确激活对应窗口实例, 支持同一应用开多个窗口
- 若仅有 Bundle ID: 通过 `open -b <bundleId>` 激活应用 (降级方案)

终端检测通过遍历进程链、用 osascript 动态查询每个祖先进程的 bundle identifier 实现 — 无硬编码应用列表, 任何终端或 IDE 均自动兼容.

零 npm 依赖.

## 配置文件

路径: `~/.claude/claude-notifier.json`

```json
{
  "channels": ["system-notification"],
  "events": ["Notification", "Stop"],
  "sound": "Ping",
  "notifyWhenFocused": true,
  "terminalBundleId": "com.googlecode.iterm2"
}
```

| 字段 | 说明 |
|---|---|
| `events` | 监听的事件: `Notification`, `Stop` |
| `sound` | 通知声音: `Ping`, `Glass`, `Hero`, `Pop`, `None` |
| `notifyWhenFocused` | `true` = 始终通知 (默认); `false` = 终端在前台时不通知 |
| `terminalBundleId` | 由 setup 保存, 作为点击聚焦的 Bundle ID 降级备用值 |

## 卸载

```bash
claude-code-notifier uninstall
npm uninstall -g @vibe-zzz/claude-code-notifier
```

## 许可证

MIT
