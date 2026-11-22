import Foundation

/// Poker Heist's public state (`PokerHeistState` in Sessions/PokerHeistSession.cs). Seats are session seats; `chips`
/// has one list per stage (white, yellow, orange, red) with one entry per seat. Cards are short text such as "10♥".
struct PokerHeistState: Decodable, Equatable {
    struct Card: Decodable, Equatable {
        let key: String
        let name: String
        let kind: String
        let text: String
    }

    struct Announcement: Decodable, Equatable {
        let seat: Int
        let card: String
        let text: String
    }

    struct Decision: Decodable, Equatable {
        let card: String
        let choice: String
        let seat: Int?
        let value: String?
        let voters: [Int]
        let agreed: [Int]
        let isOpen: Bool
        let isDone: Bool
        let isSkipped: Bool
    }

    struct Result: Decodable, Equatable {
        let seat: Int
        let card: String
        let text: String
        let passed: Bool?
    }

    struct RevealedHand: Decodable, Equatable {
        let seat: Int
        let cards: [String]
        let name: String
        let inOrder: Bool
        let ranking: String
        let values: [String]
        let wrongRanking: Bool
        let wrongValues: [Int]
    }

    let mode: String
    let cards: [Card]
    let newCards: [String]
    let preparingCard: String?
    let redrawnSeat: Int?
    let redrawConfirmed: Bool
    let skippedStages: [Int]
    let lockedChips: [Int]
    let announcements: [Announcement]
    let decisions: [Decision]
    let results: [Result]
    let pendingSeat: Int?
    let pendingStep: String
    let shownFromSeat: Int?
    let shownToSeat: Int?
    let succeeded: Bool?
    let heist: Int
    let stage: Int
    let phase: String
    let vaults: Int
    let alarms: Int
    let communityCards: [[String]]
    let jokerSwaps: [Int]
    let jokerSeats: [Int]
    let chips: [[Int?]]
    let middleChips: [Int]
    let readySeats: [Int]
    let preparedSeats: [Int]
    let playingSeats: [Int]
    let revealOrder: [Int]
    let revealed: [RevealedHand]
    let shuffles: Int

    /// The seat's chip in `stage`, or nil.
    func chip(_ stage: Int, _ seat: Int) -> Int? {
        stage >= 0 && stage < chips.count && seat >= 0 && seat < chips[stage].count ? chips[stage][seat] : nil
    }
}
