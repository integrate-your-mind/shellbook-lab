import SwiftUI

struct ActionsScreen: View {
  @ObservedObject var model: ShellbookLabModel
  let showSettings: () -> Void

  var body: some View {
    NavigationStack {
      List {
        Section("Privacy") {
          Button {
            Task { await model.runPrivacyAudit() }
          } label: {
            Label("Run privacy audit", systemImage: "lock.shield")
          }
          .accessibilityIdentifier("runPrivacyAudit")
          CommandStateView(state: model.privacyState)
        }

        Section("Handoff") {
          Button {
            Task { await model.generateHandoffPreview() }
          } label: {
            Label("Generate handoff preview", systemImage: "doc.text")
          }
          .accessibilityIdentifier("generateHandoffPreview")
          CommandStateView(state: model.handoffState)
        }
      }
      .navigationTitle("Actions")
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
    }
  }
}

struct CommandStateView: View {
  let state: LoadState<CommandPayload>

  var body: some View {
    switch state {
    case .idle:
      EmptyView()
    case .loading:
      ProgressView()
    case .failed(let message):
      Label(message, systemImage: "exclamationmark.triangle")
        .foregroundStyle(.red)
    case .loaded(let payload):
      Label(payload.result.summary ?? payload.result.title, systemImage: payload.result.ok ? "checkmark.circle" : "xmark.octagon")
        .foregroundStyle(payload.result.ok ? .green : .red)
    }
  }
}
