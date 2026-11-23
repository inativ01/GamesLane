import Foundation

/// A message of SignalR's JSON hub protocol that the app handles: the server calling one of the app's handlers, the
/// answer to one of the app's calls, a keep-alive ping, or the server closing the connection.
enum SignalRMessage {
    case invocation(target: String, arguments: [Any])
    case completion(invocationId: String, result: Any?, error: String?)
    case ping
    case close(error: String?)
    case other
}

/// SignalR's JSON hub protocol (version 1): every message is a JSON object followed by the record separator 0x1E.
/// The connection starts with the handshake; then calls are invocations (type 1), their answers completions (3), and
/// both sides send pings (6) to keep it alive.
enum SignalRProtocol {
    static let recordSeparator: Character = "\u{1E}"

    /// The first message: the protocol and its version. The server answers `{}`, or `{"error": …}`.
    static let handshake = #"{"protocol":"json","version":1}"# + String(recordSeparator)

    /// A ping, sent every few seconds so the server keeps the connection.
    static let ping = #"{"type":6}"# + String(recordSeparator)

    /// A call of the hub method `target` with `arguments` (nil as JSON null), answered by a completion with `id`.
    static func invocation(id: String, target: String, arguments: [Any?]) throws -> String {
        let message: [String: Any] = [
            "type": 1,
            "invocationId": id,
            "target": target,
            "arguments": arguments.map { $0 ?? NSNull() },
        ]
        let data = try JSONSerialization.data(withJSONObject: message)
        return String(decoding: data, as: UTF8.self) + String(recordSeparator)
    }

    /// Takes the complete messages out of `buffer`, leaving any incomplete one there.
    static func split(_ buffer: inout String) -> [String] {
        guard let last = buffer.lastIndex(of: recordSeparator) else {
            return []
        }
        let complete = buffer[..<last]
        buffer = String(buffer[buffer.index(after: last)...])
        return complete.split(separator: recordSeparator, omittingEmptySubsequences: true).map(String.init)
    }

    /// The handshake's answer: nil if the server accepted it, otherwise its error.
    static func handshakeError(_ text: String) -> String? {
        guard let object = jsonObject(text) else {
            return "The server's answer could not be read."
        }
        return object["error"] as? String
    }

    /// A message from the server.
    static func parse(_ text: String) -> SignalRMessage {
        guard let object = jsonObject(text), let type = object["type"] as? Int else {
            return .other
        }
        switch type {
        case 1:
            guard let target = object["target"] as? String else {
                return .other
            }
            return .invocation(target: target, arguments: object["arguments"] as? [Any] ?? [])
        case 3:
            guard let id = object["invocationId"] as? String else {
                return .other
            }
            let result = object["result"].flatMap { $0 is NSNull ? nil : $0 }
            return .completion(invocationId: id, result: result, error: object["error"] as? String)
        case 6:
            return .ping
        case 7:
            return .close(error: object["error"] as? String)
        default:
            return .other
        }
    }

    /// A value from a message (a call's argument or result) as `T`.
    static func decode<T: Decodable>(_ type: T.Type, from value: Any) throws -> T {
        let data = try JSONSerialization.data(withJSONObject: value, options: .fragmentsAllowed)
        return try JSONDecoder.gamesLane.decode(type, from: data)
    }

    private static func jsonObject(_ text: String) -> [String: Any]? {
        (try? JSONSerialization.jsonObject(with: Data(text.utf8))) as? [String: Any]
    }
}

extension JSONDecoder {
    /// Reads the server's JSON: dates in ISO 8601 (.NET writes up to 7 digits of fractions of a second, which are left
    /// out).
    static let gamesLane: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let text = try decoder.singleValueContainer().decode(String.self)
            let whole = text.replacingOccurrences(of: #"\.\d+"#, with: "", options: .regularExpression)
            if let date = ISO8601DateFormatter().date(from: whole) {
                return date
            }
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Not a date: \(text)"))
        }
        return decoder
    }()
}
