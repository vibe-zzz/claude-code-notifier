import AppKit
import Foundation

// MARK: - App Delegate

class AppDelegate: NSObject, NSApplicationDelegate {
    var islandWindow: IslandWindow?
    var socketServer: SocketServer?

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Hide from Dock and app switcher
        NSApp.setActivationPolicy(.accessory)

        // Create and show island window
        let window = IslandWindow()
        window.orderFrontRegardless()
        self.islandWindow = window

        // Start socket server
        let socketPath = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".claude/claude-notifier.sock")
            .path

        let server = SocketServer(socketPath: socketPath)
        server.delegate = window

        do {
            try server.start()
            self.socketServer = server
        } catch {
            print("[DynamicIsland] Failed to start socket server: \(error)")
            NSApp.terminate(nil)
            return
        }

        // Signal handlers for clean shutdown
        signal(SIGTERM) { _ in
            DispatchQueue.main.async {
                NSApp.terminate(nil)
            }
        }
        signal(SIGINT) { _ in
            DispatchQueue.main.async {
                NSApp.terminate(nil)
            }
        }

        print("[DynamicIsland] Running. Socket: \(socketPath)")
    }

    func applicationWillTerminate(_ notification: Notification) {
        socketServer?.stop()
    }
}

// MARK: - Entry Point

let delegate = AppDelegate()
let app = NSApplication.shared
app.delegate = delegate
app.run()
