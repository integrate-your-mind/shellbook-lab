import SwiftUI

struct DashboardView: View {
  @ObservedObject var store: ShellbookLabStore
  private let columns = [GridItem(.adaptive(minimum: 180), spacing: 12)]

  var body: some View {
    DetailShell(title: "Dashboard", subtitle: "Local Shellbook Lab health, metrics, and recent activity.") {
      switch store.dashboardState {
      case .idle, .loading:
        ProgressView("Loading dashboard")
      case .failed(let message):
        FailureView(message: message) {
          Task { await store.refreshDashboard() }
        }
      case .loaded(let snapshot):
        InfoCard("Agent", subtitle: snapshot.health.summary ?? snapshot.health.title) {
          Grid(alignment: .leading, horizontalSpacing: 18, verticalSpacing: 8) {
            GridRow {
              Text("Handle").foregroundStyle(.secondary)
              Text(snapshot.handle).fontWeight(.semibold)
            }
            GridRow {
              Text("Presence").foregroundStyle(.secondary)
              Text(snapshot.presence.summary ?? snapshot.presence.title)
            }
          }
        }

        LazyVGrid(columns: columns, spacing: 12) {
          ForEach(snapshot.metrics) { metric in
            MetricTile(label: metric.label, value: metric.value, tone: metric.tone)
          }
        }

        InfoCard("Activity feed", subtitle: "Recent wrapper events") {
          if snapshot.feed.isEmpty {
            Text("No activity recorded yet.")
              .foregroundStyle(.secondary)
          } else {
            ForEach(snapshot.feed.prefix(6)) { item in
              VStack(alignment: .leading, spacing: 3) {
                Text(item.text)
                Text(item.time)
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }
              Divider()
            }
          }
        }
      }
    }
  }
}
