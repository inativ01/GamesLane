import XCTest
@testable import GamesLane

final class TextsTests: XCTestCase {
    private let hebrew = Texts(code: "he", table: [
        "Seat {n}": "מקום {n}",
        "At least {n} players must be seated.": "צריך לפחות {n} שחקנים במקומות.",
        "{color}: {dice}": "{color}: {dice}",
        "Pair": "זוג",
    ])

    func testTranslatesAndFillsTheVaryingParts() {
        XCTAssertEqual(hebrew.t("Seat {n}", ["n": 2]), "מקום 2")
        XCTAssertEqual(hebrew.t("Not translated {n}", ["n": 3]), "Not translated 3")
        XCTAssertEqual(hebrew.t("Seat {n}"), "מקום {n}")
        XCTAssertTrue(hebrew.isRightToLeft)
        XCTAssertFalse(Texts.english.isRightToLeft)
    }

    func testServerTextsMatchTranslationsWithVaryingParts() {
        XCTAssertEqual(hebrew.server("Pair"), "זוג")
        XCTAssertEqual(hebrew.server("At least 4 players must be seated."), "צריך לפחות 4 שחקנים במקומות.")
        // Keys that are mostly varying parts do not match other texts.
        XCTAssertEqual(hebrew.server("Red: 5"), "Red: 5")
        XCTAssertEqual(hebrew.server(nil), "")
    }

    func testLanguageCodesAsInI18n() {
        XCTAssertEqual(Texts.languageCode("fr-CA"), "fr")
        XCTAssertEqual(Texts.languageCode("zh-Hant"), "zh-TW")
        XCTAssertEqual(Texts.languageCode("zh-HK"), "zh-TW")
        XCTAssertEqual(Texts.languageCode("zh-Hans-HK"), "zh-CN")
        XCTAssertEqual(Texts.languageCode("zh"), "zh-CN")
        XCTAssertEqual(Texts.deviceLanguage(["de-DE", "he-IL", "en"]), "he")
        XCTAssertEqual(Texts.deviceLanguage(["de-DE"]), "en")
    }
}
