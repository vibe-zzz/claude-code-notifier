# 灵动岛(Dynamic Island)式通知栏实现方案

## Context

将 claude-code-notifier 从 macOS 系统通知改为屏幕顶部常驻的灵动岛式通知 bar。当前通过 terminal-notifier 发送系统通知，改为在屏幕顶部中央显示一个可展开/收缩的浮动窗口。

用户选择：Swift 原生方案、严格零依赖（预编译二进制）、MVP 基本功能。

## 架构概览

```
Claude Code hook → cli.js → notify.js → channels/dynamic-island.js
                                                    │
                                            Unix domain socket
                                                    │
                                            Swift 守护进程 (预编译)
                                            (NSWindow + Core Animation)
```

核心设计：channel 的 `send()` 只负责通过 Unix socket 投递通知数据给常驻的 Swift 进程，非阻塞，1秒超时静默失败。

## 新增文件

### 1. Swift 源码: `native/DynamicIsland/`

```
native/DynamicIsland/
  Package.swift
  Sources/DynamicIsland/
    main.swift              # 入口：socket 监听 + NSApplication 启动
    IslandWindow.swift      # NSWindow 创建、状态机、动画
    IslandView.swift        # 自定义 NSView 绘制 pill 和内容
    SocketServer.swift      # Unix domain socket 服务端
    Notification.swift      # JSON 消息模型
```

**Package.swift**: 使用 Swift Package Manager，executable target。

**main.swift**:
- 注册为 LSUIElement（无 Dock 图标）
- 启动 Unix socket 监听（`~/.claude/claude-notifier.sock`）
- 创建 IslandWindow 并进入 RunLoop

**IslandWindow.swift**:
- `NSPanel`（borderless, nonactivating），level = `.floating + 1`
- `collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle]`
- 状态机：Idle → Expanding → Expanded → Collapsing → Idle
- 收到 notify 消息 → 展开显示内容 → 5秒后自动收缩
- 点击窗口 → 通过 osascript 聚焦终端（复用 system-notification.js 的聚焦逻辑）

**IslandView.swift**:
- Layer-backed NSView，`wantsLayer = true`
- 收缩态：200×36pt 圆角胶囊，深色半透明背景（类似 Dynamic Island）
- 展开态：360×80pt 圆角矩形，显示标题 + 消息文字
- 使用 `NSAnimationContext` + `CAMediaTimingFunction` 做平滑过渡动画

**SocketServer.swift**:
- 使用 `CFSocket` 或 `POSIX` API 监听 `~/.claude/claude-notifier.sock`
- 每行一条 JSON 消息（newline delimited）
- 支持的消息：`{ "action": "notify", "title": "...", "message": "...", "bundleId": "...", "terminalPid": 123, "tty": "..." }` 和 `{ "action": "quit" }`、`{ "action": "ping" }`
- 启动时清理残留 socket 文件；注册 SIGTERM handler 做清理

**位置计算**:
```swift
let screen = NSScreen.main!
let x = screen.visibleFrame.midX - windowWidth / 2
let y = screen.visibleFrame.maxY - windowHeight - 4  // 4pt margin
```

### 2. Channel 模块: `src/channels/dynamic-island.js`

```javascript
import { createConnection } from 'node:net';
import { join } from 'node:path';
import { homedir } from 'node:os';

const SOCKET_PATH = join(homedir(), '.claude', 'claude-notifier.sock');

export async function send({ title, message, bundleId, terminalPid, tty }) {
  const payload = JSON.stringify({
    action: 'notify', title, message, bundleId, terminalPid, tty
  }) + '\n';

  return new Promise((resolve) => {
    try {
      const sock = createConnection(SOCKET_PATH, () => {
        sock.write(payload);
        sock.end();
        resolve();
      });
      sock.on('error', () => resolve());  // 守护进程未运行 → 静默失败
      sock.setTimeout(1000, () => { sock.destroy(); resolve(); });
    } catch {
      resolve();  // 任何异常都不阻塞 hook
    }
  });
}
```

### 3. Island 命令: `src/commands/island.js`

提供 `start`、`stop`、`status` 三个子命令：
- `start`: 检查是否已运行（通过 socket ping），未运行则 `spawn` 二进制（detached），建议用户设为 login item
- `stop`: 通过 socket 发送 `{ "action": "quit" }`
- `status`: 通过 socket 发送 `{ "action": "ping" }`，有响应则运行中

### 4. 预编译二进制: `native/bin/dynamic-island`

- 开发者在本地用 `swift build -c release` 编译
- 输出 universal binary（arm64 + x86_64），放入 `native/bin/`
- `package.json` 的 `files` 中包含此目录
- gitignore 中忽略，但 npm publish 时包含

## 修改文件

### `src/channels/index.js`
添加 `'dynamic-island': '../channels/dynamic-island.js'` 到 `CHANNEL_MODULES`。

### `src/config.js`
`DEFAULT_CONFIG` 中 `channels` 改为 `['system-notification']`（不变，setup 时选择加入）。

### `bin/cli.js`
添加 `island: '../src/commands/island.js'` 到 `COMMANDS`，更新 `printUsage()`。

### `src/commands/setup.js`
在 channel 选择的 multiSelect 中添加 `dynamic-island` 选项：
```
  [x] System notification (terminal-notifier)
  [ ] Dynamic Island (persistent top bar)
```

### `package.json`
- `files` 添加 `"native/"`
- 可选：添加 `postinstall` 脚本提示用户运行 `island start`

## IPC 协议

Unix domain socket，路径 `~/.claude/claude-notifier.sock`，newline-delimited JSON。

| 消息 | 方向 | 说明 |
|------|------|------|
| `{ "action": "notify", "title": "...", "message": "...", "bundleId": "...", "terminalPid": 123, "tty": "..." }` | Node → Swift | 触发展开展示 |
| `{ "action": "ping" }` | Node → Swift | 存活检测 |
| `{ "action": "quit" }` | Node → Swift | 关闭守护进程 |
| `{ "action": "ping", "status": "ok" }` | Swift → Node | ping 响应 |

## 实现步骤

1. **编写 Swift 源码**（5 个文件，约 350 行）
   - `Package.swift` + 5 个 Swift 源文件
   - 实现：socket 监听、窗口状态机、展开/收缩动画、点击聚焦

2. **编译并验证 Swift 二进制**
   - `swift build -c release`
   - 运行确认窗口显示、socket 通信、动画效果

3. **编写 `src/channels/dynamic-island.js`**（~30 行）
   - Unix socket 客户端，非阻塞 send

4. **编写 `src/commands/island.js`**（~60 行）
   - start/stop/status 子命令

5. **修改 `src/channels/index.js`**
   - 注册新 channel

6. **修改 `bin/cli.js`**
   - 注册 island 命令 + 更新 usage

7. **修改 `src/commands/setup.js`**
   - 添加 dynamic-island channel 选项

8. **配置预编译二进制分发**
   - 编译 universal binary，放入 `native/bin/`
   - 更新 `package.json` files

## 验证方式

1. 运行 `node bin/cli.js island start` → 确认顶部出现 pill
2. 运行 `node bin/cli.js island status` → 确认返回 running
3. 运行 `node bin/cli.js test` → 确认 pill 展开显示通知内容，5秒后收缩
4. 点击展开态的窗口 → 确认聚焦到终端
5. 运行 `node bin/cli.js island stop` → 确认 pill 消失

## 风险

- **Gatekeeper**: 预编译二进制可能被 macOS 阻止。应对：README 中说明可能需要在系统设置中允许，或使用 `xattr` 移除 quarantine。
- **多显示器**: MVP 只显示在主屏幕顶部中央。后续可扩展为跟随鼠标所在屏幕。
- **Swift 版本**: 使用 Swift 5.5+ 保守语法，确保 macOS 13+ 兼容。
