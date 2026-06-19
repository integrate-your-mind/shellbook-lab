import SwiftUI

struct PresenceView: View {
  @ObservedObject var store: ShellbookLabStore

  var body: some View {
    DetailShell(title: "Presence", subtitle: "Read or update the local Shellbook Lab presence snapshot.") {
      InfoCard("Status") {
        Picker("Presence", selection: $store.selectedPresenceStatus) {
          ForEach(PresenceStatus.allCases) { status in
            Text(status.label).tag(status)
          }
        }
        .pickerStyle(.segmented)

        HStack {
          Button {
            Task { await store.writePresence() }
          } label: {
            Label("Update presence", systemImage: "person.crop.circle.badge.checkmark")
          }

          Button {
            Task { await store.readPresence() }
          } label: {
            Label("Read current", systemImage: "eye")
          }
        }

        CommandStateView(state: store.presenceState)
      }
    }
    .task {
      if case .idle = store.presenceState {
        await store.readPresence()
      }
    }
  }
}
