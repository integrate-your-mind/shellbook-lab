import SwiftUI

struct DetailView: View {
  let section: MacSection
  @ObservedObject var store: ShellbookLabStore

  var body: some View {
    switch section {
    case .dashboard:
      DashboardView(store: store)
    case .mission:
      MissionControlView(store: store)
    case .replay:
      ReplayTimelineView(store: store)
    case .actions:
      ActionsView(store: store)
    case .presence:
      PresenceView(store: store)
    case .modules:
      ModulesView(store: store)
    }
  }
}
