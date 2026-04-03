import AppKit
import Foundation

class IslandWindow: NSPanel, SocketServerDelegate {
    let islandView = IslandView()
    private var collapseTimer: Timer?
    private let autoCollapseInterval: TimeInterval = 5.0

    // Pending notification info for click-to-focus
    private var lastBundleId: String?
    private var lastTerminalPid: Int32?
    private var lastTty: String?

    init() {
        let initialFrame = NSRect(x: 0, y: 0, width: 200, height: 36)

        super.init(
            contentRect: initialFrame,
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )

        // Window properties
        isFloatingPanel = true
        level = .floating
        collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle]
        backgroundColor = .clear
        isOpaque = false
        hasShadow = false
        hidesOnDeactivate = false

        // Content
        contentView = islandView
        centerOnScreen()
    }

    // MARK: - Positioning

    func centerOnScreen() {
        guard let screen = NSScreen.main else { return }
        let screenFrame = screen.visibleFrame
        let w = islandView.frame.width
        let h = islandView.frame.height
        let x = screenFrame.midX - w / 2
        let y = screenFrame.maxY - h - 4
        setFrameOrigin(NSPoint(x: x, y: y))
    }

    // MARK: - SocketServerDelegate

    func socketServer(_ server: SocketServer, didReceiveNotification notification: IslandNotification) {
        DispatchQueue.main.async { [weak self] in
            self?.showNotification(notification)
        }
    }

    func socketServerDidReceivePing(_ server: SocketServer, client: Int32) {
        // Response already sent in SocketServer
    }

    func socketServerDidReceiveQuit(_ server: SocketServer) {
        DispatchQueue.main.async {
            NSApp.terminate(nil)
        }
    }

    // MARK: - Notification Display

    private func showNotification(_ notification: IslandNotification) {
        // Cancel any pending collapse
        collapseTimer?.invalidate()
        collapseTimer = nil

        // Store for click-to-focus
        lastBundleId = notification.bundleId
        lastTerminalPid = notification.terminalPid
        lastTty = notification.tty

        // Ensure window is visible and on top
        orderFrontRegardless()
        centerOnScreen()

        // Expand with notification content
        islandView.expand(title: notification.title, message: notification.message)

        // Auto-collapse after interval
        collapseTimer = Timer.scheduledTimer(withTimeInterval: autoCollapseInterval, repeats: false) { [weak self] _ in
            self?.islandView.collapse()
        }
    }

    // MARK: - Click to Focus

    func islandViewDidReceiveClick() {
        if islandView.isExpanded {
            focusTerminal()
            islandView.collapse()
            collapseTimer?.invalidate()
            collapseTimer = nil
        }
    }

    private func focusTerminal() {
        // Priority 1: iTerm2 + TTY
        if let tty = lastTty, lastBundleId == "com.googlecode.iterm2" {
            let script = """
            tell application "iTerm2"
                repeat with w in windows
                    repeat with t in tabs of w
                        repeat with s in sessions of t
                            if tty of s is "\(tty)" then
                                tell w to select
                                select t
                                select s
                                activate
                                return
                            end if
                        end repeat
                    end repeat
                end repeat
            end tell
            """
            runAppleScript(script)
            return
        }

        // Priority 2: Terminal.app + TTY
        if let tty = lastTty, lastBundleId == "com.apple.Terminal" {
            let script = """
            tell application "Terminal"
                repeat with w in windows
                    repeat with t in tabs of w
                        if tty of t is "\(tty)" then
                            set selected tab of w to t
                            set index of w to 1
                            activate
                            return
                        end if
                    end repeat
                end repeat
            end tell
            """
            runAppleScript(script)
            return
        }

        // Priority 3: PID-based focus
        if let pid = lastTerminalPid, pid > 0 {
            let script = "tell application \"System Events\" to set frontmost of (first process whose unix id is \(pid)) to true"
            runAppleScript(script)
            return
        }

        // Priority 4: Bundle ID fallback
        if let bundleId = lastBundleId, !bundleId.isEmpty {
            let task = Process()
            task.launchPath = "/usr/bin/open"
            task.arguments = ["-b", bundleId]
            try? task.run()
        }
    }

    private func runAppleScript(_ source: String) {
        if let script = NSAppleScript(source: source) {
            var error: NSDictionary?
            script.executeAndReturnError(&error)
        }
    }
}
