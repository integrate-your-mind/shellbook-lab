import SwiftUI

struct SettingsScreen: View {
  @Environment(\.dismiss) private var dismiss
  @ObservedObject var model: ShellbookLabModel

  var body: some View {
    Form {
      Section("Connection") {
        TextField("Base URL", text: $model.baseURLString)
          .textInputAutocapitalization(.never)
          .autocorrectionDisabled()
          .keyboardType(.URL)
          .accessibilityIdentifier("baseURL")
        Button("Reset to local dashboard") {
          model.resetBaseURL()
        }
      }
    }
    .navigationTitle("Settings")
    .toolbar {
      ToolbarItem(placement: .confirmationAction) {
        Button("Done") {
          dismiss()
        }
      }
    }
  }
}
