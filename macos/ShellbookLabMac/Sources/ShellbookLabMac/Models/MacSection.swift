import Foundation

enum MacSection: String, CaseIterable, Identifiable {
  case dashboard
  case mission
  case replay
  case actions
  case presence
  case modules

  var id: String { rawValue }

  var title: String {
    switch self {
    case .dashboard: "Dashboard"
    case .mission: "Mission Control"
    case .replay: "Replay Timeline"
    case .actions: "Actions"
    case .presence: "Presence"
    case .modules: "Modules"
    }
  }

  var detail: String {
    switch self {
    case .dashboard: "Health and metrics"
    case .mission: "Agent readiness"
    case .replay: "Recent wrapped runs"
    case .actions: "Privacy and handoff"
    case .presence: "Local team state"
    case .modules: "Ten extension areas"
    }
  }

  var systemImage: String {
    switch self {
    case .dashboard: "gauge.with.dots.needle.67percent"
    case .mission: "dot.scope"
    case .replay: "clock.arrow.circlepath"
    case .actions: "checklist"
    case .presence: "person.2.wave.2"
    case .modules: "square.grid.2x2"
    }
  }
}
