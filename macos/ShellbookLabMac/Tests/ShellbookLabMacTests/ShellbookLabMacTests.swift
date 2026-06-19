import XCTest
@testable import ShellbookLabMac

final class ShellbookLabMacTests: XCTestCase {
  func testWindowPlacementPrefersLeftmostSamsungDisplay() {
    let displays = [
      DisplayDescriptor(name: "Built-in Retina Display", visibleFrame: CGRect(x: 0, y: 0, width: 1728, height: 1084)),
      DisplayDescriptor(name: "LS32D70xE", visibleFrame: CGRect(x: 1728, y: 28, width: 3360, height: 1890)),
      DisplayDescriptor(name: "LS32CG51x", visibleFrame: CGRect(x: -2880, y: -413, width: 1440, height: 2560)),
      DisplayDescriptor(name: "Odyssey G5", visibleFrame: CGRect(x: -1440, y: -413, width: 1440, height: 2560))
    ]

    let display = WindowPlacement.preferredDisplay(from: displays)

    XCTAssertEqual(display?.name, "LS32CG51x")
  }

  func testWindowPlacementFallsBackToLeftmostDisplay() {
    let displays = [
      DisplayDescriptor(name: "Built-in Retina Display", visibleFrame: CGRect(x: 0, y: 0, width: 1728, height: 1084)),
      DisplayDescriptor(name: "External", visibleFrame: CGRect(x: -1200, y: 0, width: 1200, height: 900))
    ]

    let display = WindowPlacement.preferredDisplay(from: displays)

    XCTAssertEqual(display?.name, "External")
  }

  func testWindowFrameStaysInsideVisibleDisplay() {
    let display = DisplayDescriptor(name: "LS32CG51x", visibleFrame: CGRect(x: -2880, y: -413, width: 1440, height: 2560))

    let frame = WindowPlacement.windowFrame(for: display)

    XCTAssertEqual(frame.origin.x, -2840)
    XCTAssertEqual(frame.size.width, 1100)
    XCTAssertEqual(frame.size.height, 780)
    XCTAssertTrue(display.visibleFrame.contains(frame))
  }

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
