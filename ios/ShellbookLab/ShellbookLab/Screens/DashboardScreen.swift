import SwiftUI

struct DashboardScreen: View {
  @ObservedObject var model: ShellbookLabModel
  let showSettings: () -> Void

  var body: some View {
    NavigationStack {
      List {
        switch model.dashboardState {
        case .idle, .loading:
          ProgressView("Loading dashboard")
        case .failed(let message):
          ErrorSection(message: message) {
            Task { await model.refreshDashboard() }
          }
        case .loaded(let snapshot):
          Section("Agent") {
            LabeledContent("Handle", value: snapshot.handle)
            LabeledContent("Health", value: snapshot.health.summary ?? snapshot.health.title)
            LabeledContent("Presence", value: snapshot.presence.summary ?? snapshot.presence.title)
          }

          Section("Metrics") {
            ForEach(snapshot.metrics) { metric in
              LabeledContent(metric.label, value: metric.value)
            }
          }

          Section("Modules") {
            ForEach(snapshot.modules) { module in
              VStack(alignment: .leading, spacing: 6) {
                Text(module.title)
                  .font(.headline)
                Text(module.command)
                  .font(.caption)
                  .foregroundStyle(.secondary)
                Text(module.description)
                  .font(.subheadline)
                  .foregroundStyle(.secondary)
              }
              .accessibilityElement(children: .combine)
            }
          }

          Section("Activity") {
            ForEach(snapshot.feed) { item in
              VStack(alignment: .leading, spacing: 4) {
                Text(item.text)
                Text(item.time)
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }
            }
          }
        }
      }
      .navigationTitle("Shellbook Lab")
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button {
            showSettings()
          } label: {
            Image(systemName: "gearshape")
          }
          .accessibilityLabel("Settings")
        }
        ToolbarItem(placement: .topBarTrailing) {
          Button {
            Task { await model.refreshDashboard() }
          } label: {
            Image(systemName: "arrow.clockwise")
          }
          .accessibilityLabel("Refresh dashboard")
        }
      }
      .task {
        await model.refreshDashboard()
      }
    }
  }
}
