import Foundation
import Security
import UIKit

/// The TV's login: on first launch the app registers the TV (`POST /api/tv/register` with its name) and keeps the login
/// token it gets in the Keychain, one per server. The token never expires; a TV that loses it registers again and must
/// be paired again.
enum TvAccount {
    private static let service = "com.gameslane.tv.token"

    private struct Registration: Decodable {
        let tvId: String
        let accessToken: String
    }

    /// The token kept for `server`, or nil.
    static func load(for server: URL) -> String? {
        var query = baseQuery(server)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess, let data = item as? Data else {
            return nil
        }
        return String(data: data, encoding: .utf8)
    }

    static func save(_ token: String, for server: URL) {
        forget(server)
        var item = baseQuery(server)
        item[kSecValueData as String] = Data(token.utf8)
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(item as CFDictionary, nil)
    }

    static func forget(_ server: URL) {
        SecItemDelete(baseQuery(server) as CFDictionary)
    }

    /// Registers the TV with `server` under its name and keeps the token. Throws when the server cannot be reached or
    /// refuses (e.g. too many registrations from this address).
    static func register(with server: URL) async throws -> String {
        var request = URLRequest(url: server.appendingPathComponent("api/tv/register"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let name = await UIDevice.current.name
        request.httpBody = try JSONEncoder().encode(["name": name])
        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else {
            throw HubError(message: "The TV could not be registered.")
        }
        let registration = try JSONDecoder().decode(Registration.self, from: data)
        save(registration.accessToken, for: server)
        return registration.accessToken
    }

    private static func baseQuery(_ server: URL) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: server.absoluteString,
        ]
    }
}
