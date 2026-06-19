import XCTest
@testable import ShellbookLab

final class ShellbookLabTests: XCTestCase {
  func testDecodesDashboardSnapshot() throws {
    let json = """
    {
      "handle": "@bunny",
      "modules": [
        {
          "id": "agent-ops",
          "name": "Agent Ops Dashboard",
          "command": "dashboard",
          "maturity": "ready",
          "summary": "Local view"
        }
      ],
      "metrics": [
        { "label": "Shellbook", "value": "Ready", "tone": "ok" }
      ],
      "sessions": [
        { "agent": "codex", "repo": "shellbook-lab", "status": "ok", "duration": "3s" }
      ],
      "feed": [
        { "time": "now", "text": "Dashboard ready." }
      ],
      "health": { "ok": true, "title": "doctor", "summary": "Shellbook Lab ready." },
      "analytics": { "ok": true, "title": "analytics", "summary": "1 wrapped run." },
      "presence": { "ok": true, "title": "presence", "summary": "codex is available." }
    }
    """

    let snapshot = try JSONDecoder().decode(DashboardSnapshot.self, from: Data(json.utf8))

    XCTAssertEqual(snapshot.handle, "@bunny")
    XCTAssertEqual(snapshot.modules.first?.title, "Agent Ops Dashboard")
    XCTAssertEqual(snapshot.modules.first?.description, "Local view")
    XCTAssertEqual(snapshot.modules.first?.command, "dashboard")
    XCTAssertEqual(snapshot.metrics.first?.value, "Ready")
    XCTAssertEqual(snapshot.sessions.first?.status, "ok")
  }

  func testPresenceStatusLabelsMatchAPIValues() {
    XCTAssertEqual(PresenceStatus.allCases.map(\.rawValue), ["available", "busy", "reviewing", "offline"])
    XCTAssertEqual(PresenceStatus.reviewing.label, "Reviewing")
  }

  @MainActor
  func testModelDefaultsAndResetBaseURL() {
    let model = ShellbookLabModel(baseURLString: "https://example.test")
    XCTAssertEqual(model.baseURLString, "https://example.test")

    model.resetBaseURL()

    XCTAssertEqual(model.baseURLString, "http://127.0.0.1:8791")
  }
}
