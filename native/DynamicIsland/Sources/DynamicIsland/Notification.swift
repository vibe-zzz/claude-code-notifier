import Foundation

struct IslandNotification {
    let title: String
    let message: String
    let bundleId: String?
    let terminalPid: Int32?
    let tty: String?

    static func parse(from data: Data) -> IslandNotification? {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let action = json["action"] as? String else {
            return nil
        }

        switch action {
        case "notify":
            guard let title = json["title"] as? String,
                  let message = json["message"] as? String else {
                return nil
            }
            return IslandNotification(
                title: title,
                message: message,
                bundleId: json["bundleId"] as? String,
                terminalPid: json["terminalPid"] as? Int32,
                tty: json["tty"] as? String
            )
        case "ping":
            return IslandNotification(title: "", message: "", bundleId: nil, terminalPid: nil, tty: nil)
        case "quit":
            return nil // handled separately
        default:
            return nil
        }
    }

    static func action(from data: Data) -> String? {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }
        return json["action"] as? String
    }
}
