import AppKit
import SwiftUI

final class ShellbookLabAppDelegate: NSObject, NSApplicationDelegate {
  func applicationDidFinishLaunching(_ notification: Notification) {
    NSApp.setActivationPolicy(.regular)
    NSApp.activate(ignoringOtherApps: true)

    DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
      WindowPlacement.placeMainWindow()
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
      WindowPlacement.placeMainWindow()
    }
  }
}

@main
struct ShellbookLabMacApp: App {
  @NSApplicationDelegateAdaptor(ShellbookLabAppDelegate.self) private var appDelegate
  @StateObject private var store = ShellbookLabStore()

  var body: some Scene {
    WindowGroup("Shellbook Lab", id: "main") {
      ContentView(store: store)
        .frame(minWidth: 980, minHeight: 680)
    }
    .commands {
      CommandMenu("Shellbook Lab") {
        Button("Refresh Dashboard") {
          Task { await store.refreshDashboard() }
        }
        .keyboardShortcut("r", modifiers: [.command])

        Button("Run Privacy Audit") {
          Task { await store.runPrivacyAudit() }
        }
        .keyboardShortcut("p", modifiers: [.command, .shift])
      }
    }

    Settings {
      SettingsView(store: store)
        .frame(width: 420)
    }
  }
}
