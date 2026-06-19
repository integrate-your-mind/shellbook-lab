import SwiftUI

enum AppTab: String, CaseIterable, Identifiable {
  case dashboard
  case actions
  case presence

  var id: String { rawValue }

  var title: String {
    switch self {
    case .dashboard: "Dashboard"
    case .actions: "Actions"
    case .presence: "Presence"
    }
  }

  var systemImage: String {
    switch self {
    case .dashboard: "gauge.with.dots.needle.67percent"
    case .actions: "checklist"
    case .presence: "person.2.wave.2"
    }
  }
}

struct AppView: View {
  @StateObject private var model = ShellbookLabModel()
  @State private var selectedTab: AppTab = .dashboard
  @State private var showingSettings = false

  var body: some View {
    TabView(selection: $selectedTab) {
      DashboardScreen(model: model, showSettings: { showingSettings = true })
        .tabItem { Label(AppTab.dashboard.title, systemImage: AppTab.dashboard.systemImage) }
        .tag(AppTab.dashboard)

      ActionsScreen(model: model, showSettings: { showingSettings = true })
        .tabItem { Label(AppTab.actions.title, systemImage: AppTab.actions.systemImage) }
        .tag(AppTab.actions)

      PresenceScreen(model: model, showSettings: { showingSettings = true })
        .tabItem { Label(AppTab.presence.title, systemImage: AppTab.presence.systemImage) }
        .tag(AppTab.presence)
    }
    .sheet(isPresented: $showingSettings) {
      NavigationStack {
        SettingsScreen(model: model)
      }
    }
  }
}

#Preview {
  AppView()
}
