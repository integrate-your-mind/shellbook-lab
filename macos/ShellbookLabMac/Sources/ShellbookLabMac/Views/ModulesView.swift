import SwiftUI

struct ModulesView: View {
  @ObservedObject var store: ShellbookLabStore

  var body: some View {
    DetailShell(title: "Modules", subtitle: "The ten Shellbook Lab extension areas and their CLI commands.") {
      switch store.dashboardState {
      case .idle, .loading:
        ProgressView("Loading modules")
      case .failed(let message):
        FailureView(message: message) {
          Task { await store.refreshDashboard() }
        }
      case .loaded(let snapshot):
        ForEach(snapshot.modules) { module in
          InfoCard(module.title, subtitle: module.command) {
            HStack {
              StatusBadge(text: module.maturity, tone: module.maturity == "mvp" ? "ok" : "warn")
              Text(module.description)
                .foregroundStyle(.secondary)
            }
          }
        }
      }
    }
  }
}
