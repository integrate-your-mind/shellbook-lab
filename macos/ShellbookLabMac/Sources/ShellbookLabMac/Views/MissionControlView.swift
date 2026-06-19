import SwiftUI

struct MissionControlView: View {
  @ObservedObject var store: ShellbookLabStore

  var body: some View {
    DetailShell(title: "Mission Control", subtitle: "Agent readiness derived from local presence and wrapped runs.") {
      switch store.dashboardState {
      case .idle, .loading:
        ProgressView("Loading missions")
      case .failed(let message):
        FailureView(message: message) {
          Task { await store.refreshDashboard() }
        }
      case .loaded(let snapshot):
        if snapshot.missions.isEmpty {
          InfoCard("No missions yet") {
            Text("Run shellbook-lab wrap to seed Mission Control.")
              .foregroundStyle(.secondary)
          }
        } else {
          ForEach(snapshot.missions) { mission in
            InfoCard(mission.agent, subtitle: mission.repo) {
              HStack(spacing: 12) {
                StatusBadge(text: mission.status, tone: mission.status)
                Text("last run \(mission.lastRunAge)")
                  .foregroundStyle(.secondary)
                Text("duration \(mission.duration)")
                  .foregroundStyle(.secondary)
                Text("exit \(mission.exitCode.map(String.init) ?? "none")")
                  .foregroundStyle(.secondary)
              }
              Text(mission.nextAction)
                .font(.body)
            }
          }
        }
      }
    }
  }
}
