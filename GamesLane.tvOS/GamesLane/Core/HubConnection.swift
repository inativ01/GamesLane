import Foundation

/// An error from the hub: a call refused by the server, or the connection not being open.
struct HubError: Error, Equatable {
    let message: String
}

/// A connection to the game hub (SignalR's JSON protocol over a WebSocket, see `SignalRProtocol`), with the login token
/// sent as a bearer token. As in common.js, each side sends a keep-alive every 5 seconds and 10 seconds of silence from
/// the server counts as a lost connection. A lost connection is opened again after 0, 2, 5, then every 10 seconds;
/// `onConnected` runs after every handshake, and `onUnauthorized` when the server refuses the token.
@MainActor
final class HubConnection {
    static let keepAliveInterval: TimeInterval = 5
    static let serverTimeout: TimeInterval = 10
    static let retryDelays: [TimeInterval] = [0, 2, 5, 10]

    var onConnected: (() -> Void)?
    var onDisconnected: (() -> Void)?
    var onUnauthorized: (() -> Void)?
    private(set) var isConnected = false

    private let url: URL
    private let token: () -> String?
    private let session = URLSession(configuration: .default)
    private var handlers: [String: ([Any]) -> Void] = [:]
    private var task: URLSessionWebSocketTask?
    private var pending: [String: CheckedContinuation<Any?, Error>] = [:]
    private var nextId = 0
    private var buffer = ""
    private var handshakeDone = false
    private var lastReceived = Date()
    private var generation = 0
    private var attempt = 0
    private var running = false
    private var timers: Task<Void, Never>?

    init(url: URL, token: @escaping () -> String?) {
        self.url = url
        self.token = token
    }

    /// Runs `handler` with the arguments whenever the server calls `target`.
    func on(_ target: String, handler: @escaping ([Any]) -> Void) {
        handlers[target] = handler
    }

    func start() {
        guard !running else {
            return
        }
        running = true
        attempt = 0
        connect()
    }

    func stop() {
        running = false
        drop()
    }

    /// Calls the hub method `method` and returns its result (nil for none).
    func invoke(_ method: String, _ arguments: Any?...) async throws -> Any? {
        guard isConnected, let task else {
            throw HubError(message: "Not connected.")
        }
        nextId += 1
        let id = String(nextId)
        let text = try SignalRProtocol.invocation(id: id, target: method, arguments: arguments)
        return try await withCheckedThrowingContinuation { continuation in
            pending[id] = continuation
            task.send(.string(text)) { [weak self] error in
                guard error != nil else {
                    return
                }
                Task { @MainActor in
                    self?.pending.removeValue(forKey: id)?.resume(throwing: HubError(message: "Not connected."))
                }
            }
        }
    }

    private func connect() {
        generation += 1
        let current = generation
        var request = URLRequest(url: url)
        if let token = token() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let task = session.webSocketTask(with: request)
        self.task = task
        buffer = ""
        handshakeDone = false
        lastReceived = Date()
        task.resume()
        task.send(.string(SignalRProtocol.handshake)) { [weak self] error in
            guard error != nil else {
                return
            }
            Task { @MainActor in self?.fail(current) }
        }
        receive(current)
        timers?.cancel()
        timers = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(Self.keepAliveInterval))
                guard let self, self.generation == current, !Task.isCancelled else {
                    return
                }
                if Date().timeIntervalSince(self.lastReceived) > Self.serverTimeout {
                    self.fail(current)
                    return
                }
                if self.handshakeDone {
                    self.task?.send(.string(SignalRProtocol.ping)) { _ in }
                }
            }
        }
    }

    private func receive(_ current: Int) {
        task?.receive { [weak self] result in
            Task { @MainActor in
                guard let self, self.generation == current else {
                    return
                }
                switch result {
                case .success(.string(let text)):
                    self.received(text, current)
                case .success(.data(let data)):
                    self.received(String(decoding: data, as: UTF8.self), current)
                case .success:
                    break
                case .failure:
                    self.fail(current)
                    return
                }
                if self.generation == current {
                    self.receive(current)
                }
            }
        }
    }

    private func received(_ text: String, _ current: Int) {
        lastReceived = Date()
        buffer += text
        for message in SignalRProtocol.split(&buffer) {
            guard generation == current else {
                return
            }
            if !handshakeDone {
                if SignalRProtocol.handshakeError(message) != nil {
                    fail(current)
                    return
                }
                handshakeDone = true
                isConnected = true
                attempt = 0
                onConnected?()
                continue
            }
            switch SignalRProtocol.parse(message) {
            case .invocation(let target, let arguments):
                handlers[target]?(arguments)
            case .completion(let id, let result, let error):
                if let error {
                    pending.removeValue(forKey: id)?.resume(throwing: HubError(message: error))
                } else {
                    pending.removeValue(forKey: id)?.resume(returning: result)
                }
            case .close:
                fail(current)
            case .ping, .other:
                break
            }
        }
    }

    // Closes the connection; any call still waiting fails.
    private func drop() {
        generation += 1
        timers?.cancel()
        timers = nil
        task?.cancel(with: .goingAway, reason: nil)
        task = nil
        let wasConnected = isConnected
        isConnected = false
        handshakeDone = false
        for continuation in pending.values {
            continuation.resume(throwing: HubError(message: "Not connected."))
        }
        pending.removeAll()
        if wasConnected {
            onDisconnected?()
        }
    }

    // The connection was lost or refused: it is opened again after a while, unless the token was refused.
    private func fail(_ current: Int) {
        guard generation == current else {
            return
        }
        let refused = (task?.response as? HTTPURLResponse)?.statusCode == 401
        drop()
        guard running else {
            return
        }
        if refused {
            running = false
            onUnauthorized?()
            return
        }
        let delay = Self.retryDelays[min(attempt, Self.retryDelays.count - 1)]
        attempt += 1
        let next = generation
        Task { [weak self] in
            try? await Task.sleep(for: .seconds(delay))
            guard let self, self.running, self.generation == next else {
                return
            }
            self.connect()
        }
    }
}
