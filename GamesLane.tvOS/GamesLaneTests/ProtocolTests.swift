import XCTest
@testable import GamesLane

final class ProtocolTests: XCTestCase {
    func testInvocationIsJsonEndingWithTheRecordSeparator() throws {
        let text = try SignalRProtocol.invocation(id: "7", target: "WatchOnTv", arguments: ["tv:1", nil])

        XCTAssertEqual(text.last, SignalRProtocol.recordSeparator)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(text.dropLast().utf8)) as? [String: Any])
        XCTAssertEqual(object["type"] as? Int, 1)
        XCTAssertEqual(object["invocationId"] as? String, "7")
        XCTAssertEqual(object["target"] as? String, "WatchOnTv")
        let arguments = try XCTUnwrap(object["arguments"] as? [Any])
        XCTAssertEqual(arguments.first as? String, "tv:1")
        XCTAssertTrue(arguments.last is NSNull)
    }

    func testSplitKeepsAnIncompleteMessageForLater() {
        var buffer = "{\"type\":6}\u{1E}{\"type\":1,\"target\":\"A\"}\u{1E}{\"type\":3"

        XCTAssertEqual(SignalRProtocol.split(&buffer), ["{\"type\":6}", "{\"type\":1,\"target\":\"A\"}"])
        XCTAssertEqual(buffer, "{\"type\":3")
        buffer += ",\"invocationId\":\"1\"}\u{1E}"
        XCTAssertEqual(SignalRProtocol.split(&buffer), ["{\"type\":3,\"invocationId\":\"1\"}"])
        XCTAssertEqual(buffer, "")
    }

    func testParsesTheServersMessages() {
        guard case .invocation(let target, let arguments) = SignalRProtocol.parse(#"{"type":1,"target":"TvUpdated","arguments":[{"code":"ABC"}]}"#) else {
            return XCTFail("Not an invocation")
        }
        XCTAssertEqual(target, "TvUpdated")
        XCTAssertEqual((arguments.first as? [String: Any])?["code"] as? String, "ABC")

        guard case .completion(let id, let result, let error) = SignalRProtocol.parse(#"{"type":3,"invocationId":"2","result":null}"#) else {
            return XCTFail("Not a completion")
        }
        XCTAssertEqual(id, "2")
        XCTAssertNil(result)
        XCTAssertNil(error)

        guard case .completion(_, _, let refused) = SignalRProtocol.parse(#"{"type":3,"invocationId":"3","error":"No game"}"#) else {
            return XCTFail("Not a completion")
        }
        XCTAssertEqual(refused, "No game")
        guard case .ping = SignalRProtocol.parse(#"{"type":6}"#) else {
            return XCTFail("Not a ping")
        }
        guard case .close = SignalRProtocol.parse(#"{"type":7,"error":"Bye"}"#) else {
            return XCTFail("Not a close")
        }
    }

    func testHandshakeAnswer() {
        XCTAssertNil(SignalRProtocol.handshakeError("{}"))
        XCTAssertEqual(SignalRProtocol.handshakeError(#"{"error":"Unknown protocol"}"#), "Unknown protocol")
    }

    func testDecodesTheTvStatusWithDotNetDates() throws {
        let value: [String: Any] = [
            "code": "2HFMVK",
            "codeExpiresAt": "2026-11-22T01:45:06.1234567+00:00",
            "pairedWith": ["Ada", "Ben"],
            "viewer": ["name": "Ada", "icon": "🦊", "language": "he", "sessionId": NSNull(), "gameType": NSNull()],
        ]

        let status = try SignalRProtocol.decode(TvStatus.self, from: value)

        XCTAssertEqual(status.code, "2HFMVK")
        XCTAssertEqual(status.codeExpiresAt, ISO8601DateFormatter().date(from: "2026-11-22T01:45:06Z"))
        XCTAssertEqual(status.pairedWith, ["Ada", "Ben"])
        XCTAssertEqual(status.viewer?.language, "he")
        XCTAssertNil(status.viewer?.sessionId)
    }

    func testServerAddressFromTheBuildSetting() {
        XCTAssertEqual(ServerAddress.resolve(nil), ServerAddress.production)
        XCTAssertEqual(ServerAddress.resolve(" "), ServerAddress.production)
        XCTAssertEqual(ServerAddress.resolve("$(GAMESLANE_SERVER)"), ServerAddress.production)
        XCTAssertEqual(ServerAddress.resolve("42").absoluteString, "https://gameslane-pr-42.onrender.com")
        XCTAssertEqual(ServerAddress.resolve("http://localhost:5171/").absoluteString, "http://localhost:5171")
    }

    func testAddressesOnTheServer() {
        let local = URL(string: "http://192.168.1.20:5171")!

        XCTAssertEqual(ServerAddress.hubURL(local).absoluteString, "ws://192.168.1.20:5171/hubs/game")
        XCTAssertEqual(ServerAddress.hubURL(ServerAddress.production).absoluteString, "wss://gameslane.onrender.com/hubs/game")
        XCTAssertEqual(ServerAddress.pairingURL(ServerAddress.production, code: "ABC234").absoluteString, "https://gameslane.onrender.com/?tv=ABC234")
        XCTAssertEqual(ServerAddress.iconURL(local, icon: "/api/icons/1")?.absoluteString, "http://192.168.1.20:5171/api/icons/1")
        XCTAssertNil(ServerAddress.iconURL(local, icon: "🦊"))
    }

    func testChangesCountFromTheSecondUpdateOrRightAfterTheLobby() {
        var tracker = ChangeTracker()

        XCTAssertFalse(tracker.changed("chips", [1, 2]))
        XCTAssertFalse(tracker.changed("chips", [1, 2]))
        XCTAssertTrue(tracker.changed("chips", [1, 3]))

        tracker.lobby()
        XCTAssertTrue(tracker.changed("chips", [1, 3]))
        tracker.rendered()
        XCTAssertFalse(tracker.changed("chips", [1, 3]))

        tracker.reset()
        XCTAssertFalse(tracker.changed("shuffles", "1:4"))
    }

    func testSvgPathTokensAndImplicitLines() {
        XCTAssertEqual(SVGPath.tokenize("M3 64C-1 74 10.5.5"), [
            .command("M"), .number(3), .number(64), .command("C"), .number(-1), .number(74), .number(10.5), .number(0.5),
        ])
        let path = SVGPath.path("M0 0 10 0 10 10Z")
        XCTAssertEqual(path.boundingRect, CGRect(x: 0, y: 0, width: 10, height: 10))
    }

    func testSoundsAreBuiltWithinFullScale() {
        let fanfare = GameSounds.samples(.fanfare)

        XCTAssertEqual(Double(fanfare.count), (0.36 + 0.6 + 0.02) * SoundSynth.sampleRate, accuracy: 2)
        XCTAssertLessThanOrEqual(fanfare.map(abs).max() ?? 0, 1)
        XCTAssertGreaterThan(GameSounds.samples(.chip).map(abs).max() ?? 0, 0.01)
    }
}
