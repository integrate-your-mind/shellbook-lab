import SwiftUI

struct ErrorSection: View {
  let message: String
  let retry: () -> Void

  var body: some View {
    Section("Error") {
      Label(message, systemImage: "exclamationmark.triangle")
        .foregroundStyle(.red)
      Button {
        retry()
      } label: {
        Label("Retry", systemImage: "arrow.clockwise")
      }
    }
  }
}
