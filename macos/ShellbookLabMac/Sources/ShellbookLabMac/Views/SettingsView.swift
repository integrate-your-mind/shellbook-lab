import SwiftUI

struct SettingsView: View {
  @ObservedObject var store: ShellbookLabStore

  var body: some View {
    Form {
      Section("Local API") {
        TextField("Base URL", text: $store.baseURLString)
          .textFieldStyle(.roundedBorder)
        Text("Defaults to \(ShellbookLabStore.defaultBaseURL).")
          .font(.caption)
          .foregroundStyle(.secondary)
        HStack {
          Button("Reset") {
            store.resetBaseURL()
          }
          Button("Refresh Dashboard") {
            Task { await store.refreshDashboard() }
          }
        }
      }
    }
    .padding(20)
  }
}
