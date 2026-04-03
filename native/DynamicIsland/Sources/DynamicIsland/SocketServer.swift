import Foundation
import AppKit

protocol SocketServerDelegate: AnyObject {
    func socketServer(_ server: SocketServer, didReceiveNotification notification: IslandNotification)
    func socketServerDidReceivePing(_ server: SocketServer, client: Int32)
    func socketServerDidReceiveQuit(_ server: SocketServer)
}

class SocketServer {
    weak var delegate: SocketServerDelegate?

    private var listenSocket: CFSocket?
    private var runLoopSource: CFRunLoopSource?
    private let socketPath: String

    init(socketPath: String) {
        self.socketPath = socketPath
    }

    func start() throws {
        // Clean up any leftover socket file
        try? FileManager.default.removeItem(atPath: socketPath)

        let sock = CFSocketCreate(nil, PF_UNIX, SOCK_STREAM, 0,
                                  CFSocketCallBack.acceptCallBack.rawValue,
                                  acceptCallback, nil, nil)

        guard sock != nil else {
            throw NSError(domain: "DynamicIsland", code: 1,
                          userInfo: [NSLocalizedDescriptionKey: "Failed to create socket"])
        }

        // Allow address reuse
        var yes: Int32 = 1
        setsockopt(CFSocketGetNative(sock!), SOL_SOCKET, SO_REUSEADDR, &yes, socklen_t(MemoryLayout<Int32>.size))

        var addr = sockaddr_un()
        addr.sun_family = sa_family_t(AF_UNIX)

        // Copy socket path into sockaddr_un
        let pathBytes = socketPath.utf8CString
        guard pathBytes.count <= MemoryLayout.size(ofValue: addr.sun_path) else {
            throw NSError(domain: "DynamicIsland", code: 2,
                          userInfo: [NSLocalizedDescriptionKey: "Socket path too long"])
        }
        withUnsafeMutablePointer(to: &addr.sun_path) { ptr in
            ptr.withMemoryRebound(to: CChar.self, capacity: pathBytes.count) { dest in
                _ = pathBytes.withUnsafeBufferPointer { src in
                    memcpy(dest, src.baseAddress!, pathBytes.count)
                }
            }
        }

        let size = socklen_t(MemoryLayout<sa_family_t>.size + pathBytes.count)
        let data = withUnsafePointer(to: &addr) {
            $0.withMemoryRebound(to: UInt8.self, capacity: Int(size)) {
                CFDataCreate(nil, $0, Int(size))
            }
        }

        guard CFSocketSetAddress(sock!, data) == .success else {
            throw NSError(domain: "DynamicIsland", code: 3,
                          userInfo: [NSLocalizedDescriptionKey: "Failed to bind socket to \(socketPath)"])
        }

        // Set file permissions
        try? FileManager.default.setAttributes(
            [.posixPermissions: 0o600],
            ofItemAtPath: socketPath
        )

        listenSocket = sock
        runLoopSource = CFSocketCreateRunLoopSource(nil, sock!, 0)
        CFRunLoopAddSource(CFRunLoopGetMain(), runLoopSource!, .commonModes)

        // Store delegate pointer in socket context for accept callback
        // We use a global reference instead for simplicity
        SocketServer.shared = self

        print("[DynamicIsland] Listening on \(socketPath)")
    }

    func stop() {
        if let source = runLoopSource {
            CFRunLoopRemoveSource(CFRunLoopGetMain(), source, .commonModes)
            runLoopSource = nil
        }
        if let sock = listenSocket {
            CFSocketInvalidate(sock)
            listenSocket = nil
        }
        try? FileManager.default.removeItem(atPath: socketPath)
        SocketServer.shared = nil
    }

    // MARK: - Accept & Read

    static var shared: SocketServer?

    private static func handleAccept(_ socket: CFSocket?, _ callbackType: CFSocketCallBackType,
                                      _ address: CFData?, _ data: UnsafeRawPointer?,
                                      _ info: UnsafeMutableRawPointer?) {
        guard callbackType == .acceptCallBack, let data = data else { return }
        let clientSocket = CFSocketNativeHandle(bitPattern: data.assumingMemoryBound(to: CFSocketNativeHandle.self).pointee)

        // Read from client
        DispatchQueue.global(qos: .userInitiated).async {
            var buffer = [UInt8](repeating: 0, count: 4096)
            let bytesRead = read(clientSocket, &buffer, buffer.count)

            guard bytesRead > 0, let server = SocketServer.shared else {
                close(clientSocket)
                return
            }

            let receivedData = Data(bytes: buffer, count: bytesRead)

            if let action = IslandNotification.action(from: receivedData) {
                switch action {
                case "quit":
                    server.delegate?.socketServerDidReceiveQuit(server)
                case "ping":
                    let response = "{\"status\":\"ok\"}\n"
                    if let responseData = response.data(using: .utf8) {
                        responseData.withUnsafeBytes { ptr in
                            _ = write(clientSocket, ptr.baseAddress!, responseData.count)
                        }
                    }
                    server.delegate?.socketServerDidReceivePing(server, client: clientSocket)
                default:
                    if let notification = IslandNotification.parse(from: receivedData) {
                        server.delegate?.socketServer(server, didReceiveNotification: notification)
                    }
                }
            }

            close(clientSocket)
        }
    }
}

private func acceptCallback(_ socket: CFSocket?, _ callbackType: CFSocketCallBackType,
                             _ address: CFData?, _ data: UnsafeRawPointer?,
                             _ info: UnsafeMutableRawPointer?) {
    SocketServer.handleAccept(socket, callbackType, address, data, info)
}
