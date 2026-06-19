import SwiftUI

struct ActionsView: View {
  @ObservedObject var store: ShellbookLabStore

  var body: some View {
    DetailShell(title: "Actions", subtitle: "Run local checks against the same dashboard API.") {
      InfoCard("Privacy audit", subtitle: "Scan the repository for publish blockers.") {
        Button {
          Task { await store.runPrivacyAudit() }
        } label: {
          Label("Run privacy audit", systemImage: "lock.shield")
        }
        .keyboardShortcut("p", modifiers: [.command, .shift])

        CommandStateView(state: store.privacyState)
      }

      InfoCard("Handoff preview", subtitle: "Generate a local continuation summary.") {
        Button {
          Task { await store.generateHandoffPreview() }
        } label: {
          Label("Generate handoff preview", systemImage: "doc.text")
        }

        CommandStateView(state: store.handoffState)
      }
    }
  }
}
