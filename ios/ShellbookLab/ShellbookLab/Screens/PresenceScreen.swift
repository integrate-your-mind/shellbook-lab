import SwiftUI

struct PresenceScreen: View {
  @ObservedObject var model: ShellbookLabModel
  let showSettings: () -> Void

  var body: some View {
    NavigationStack {
      List {
        Section("Status") {
          Picker("Status", selection: $model.selectedPresenceStatus) {
            ForEach(PresenceStatus.allCases) { status in
              Text(status.label).tag(status)
            }
          }
          Button {
            Task { await model.writePresence() }
          } label: {
            Label("Update presence", systemImage: "person.crop.circle.badge.checkmark")
          }
          .accessibilityIdentifier("updatePresence")
          Button {
            Task { await model.readPresence() }
          } label: {
            Label("Read current presence", systemImage: "eye")
          }
          .accessibilityIdentifier("readPresence")
        }

        Section("Current") {
          CommandStateView(state: model.presenceState)
        }
      }
      .navigationTitle("Presence")
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button {
            showSettings()
          } label: {
            Image(systemName: "gearshape")
          }
          .accessibilityLabel("Settings")
        }
      }
      .task {
        await model.readPresence()
      }
    }
  }
}
