import SwiftUI

struct ContentView: View {
  @ObservedObject var store: ShellbookLabStore
  @SceneStorage("selectedSection") private var selectedSectionID = MacSection.dashboard.rawValue

  private var selection: Binding<MacSection?> {
    Binding(
      get: { MacSection(rawValue: selectedSectionID) ?? .dashboard },
      set: { selectedSectionID = ($0 ?? .dashboard).rawValue }
    )
  }

  var body: some View {
    NavigationSplitView {
      SidebarView(selection: selection)
        .navigationSplitViewColumnWidth(min: 220, ideal: 260)
    } detail: {
      DetailView(section: selection.wrappedValue ?? .dashboard, store: store)
    }
    .toolbar {
      ToolbarItemGroup {
        Button {
          Task { await store.refreshDashboard() }
        } label: {
          Label("Refresh", systemImage: "arrow.clockwise")
        }
        .help("Refresh dashboard")

        SettingsLink {
          Label("Settings", systemImage: "gearshape")
        }
        .help("Open settings")
      }
    }
    .task {
      if case .idle = store.dashboardState {
        await store.refreshDashboard()
      }
    }
  }
}
