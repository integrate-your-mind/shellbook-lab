import XCTest
@testable import ShellbookLabMac

final class ShellbookLabMacTests: XCTestCase {
  func testDecodesDashboardSnapshotWithMissionAndReplay() throws {
    let json = """
    {
      "handle": "@bunny",
      "modules": [
        { "id": "agent-ops-dashboard", "name": "Agent Ops Dashboard", "command": "dashboard", "maturity": "mvp", "summary": "Local web dashboard" }
      ],
      "metrics": [
        { "label": "Shellbook", "value": "Ready", "tone": "ok" }
      ],
      "sessions": [
        { "agent": "codex", "repo": "shellbook-lab", "status": "idle", "duration": "0s" }
      ],
      "feed": [
        { "time": "now", "text": "Dashboard ready." }
      ],
      "missions": [
        { "agent": "codex", "repo": "shellbook-lab", "status": "idle", "lastRun": "no wrapped runs", "lastRunAge": "none", "duration": "0s", "exitCode": null, "nextAction": "Run shellbook-lab wrap." }
      ],
      "replay": [
        { "id": "evt-1", "label": "codex", "command": "node --version", "repo": "shellbook-lab", "status": "ok", "duration": "1s", "endedAt": "2026-06-19T00:00:00.000Z", "nextAction": "Capture proof." }
      ],
      "health": { "ok": true, "title": "doctor", "summary": "Shellbook Lab ready." },
      "analytics": { "ok": true, "title": "analytics", "summary": "0 runs." },
      "presence": { "ok": true, "title": "presence", "summary": "codex is available." }
    }
    """

    let snapshot = try JSONDecoder().decode(DashboardSnapshot.self, from: Data(json.utf8))

    XCTAssertEqual(snapshot.handle, "@bunny")
    XCTAssertEqual(snapshot.modules[0].title, "Agent Ops Dashboard")
    XCTAssertEqual(snapshot.missions[0].status, "idle")
    XCTAssertEqual(snapshot.replay[0].command, "node --version")
  }

  @MainActor
  func testStoreDefaultsAndBaseURLValidation() throws {
    let store = ShellbookLabStore(baseURLString: "not a url")

    XCTAssertEqual(ShellbookLabStore.defaultBaseURL, "http://127.0.0.1:8791")
    XCTAssertThrowsError(try store.client()) { error in
      XCTAssertEqual(error as? ShellbookLabClientError, .invalidBaseURL)
    }

    store.resetBaseURL()
    XCTAssertEqual(store.baseURLString, ShellbookLabStore.defaultBaseURL)
    XCTAssertNoThrow(try store.client())
  }

  func testPresenceStatusLabelsMatchAPIValues() {
    XCTAssertEqual(PresenceStatus.available.label, "Available")
    XCTAssertEqual(PresenceStatus.reviewing.rawValue, "reviewing")
    XCTAssertEqual(PresenceStatus.allCases.count, 4)
  }
}
