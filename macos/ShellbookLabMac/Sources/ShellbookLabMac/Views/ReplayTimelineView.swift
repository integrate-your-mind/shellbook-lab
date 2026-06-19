import SwiftUI

struct ReplayTimelineView: View {
  @ObservedObject var store: ShellbookLabStore

  var body: some View {
    DetailShell(title: "Replay Timeline", subtitle: "Redacted wrapped-command history with next actions.") {
      switch store.dashboardState {
      case .idle, .loading:
        ProgressView("Loading replay")
      case .failed(let message):
        FailureView(message: message) {
          Task { await store.refreshDashboard() }
        }
      case .loaded(let snapshot):
        if snapshot.replay.isEmpty {
          InfoCard("No replay frames") {
            Text("Run shellbook-lab wrap <command> to capture a replay frame.")
              .foregroundStyle(.secondary)
          }
        } else {
          ForEach(snapshot.replay) { frame in
            InfoCard(frame.command, subtitle: "\(frame.label) in \(frame.repo)") {
              HStack(spacing: 12) {
                StatusBadge(text: frame.status, tone: frame.status)
                Text(frame.duration)
                  .foregroundStyle(.secondary)
                Text(frame.endedAt)
                  .foregroundStyle(.secondary)
                  .lineLimit(1)
              }
              Text(frame.nextAction)
            }
          }
        }
      }
    }
  }
}
