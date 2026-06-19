import AppKit

struct DisplayDescriptor: Equatable {
  let name: String
  let visibleFrame: CGRect
}

enum WindowPlacement {
  private static let preferredDisplayNameTokens = ["samsung", "ls32", "odyssey"]

  static func preferredDisplay(from displays: [DisplayDescriptor]) -> DisplayDescriptor? {
    if let namedDisplay = displays
      .filter({ display in
        preferredDisplayNameTokens.contains { token in
          display.name.localizedCaseInsensitiveContains(token)
        }
      })
      .min(by: { $0.visibleFrame.minX < $1.visibleFrame.minX }) {
      return namedDisplay
    }

    return displays.min(by: { $0.visibleFrame.minX < $1.visibleFrame.minX })
  }

  static func windowFrame(
    for display: DisplayDescriptor,
    preferredSize: CGSize = CGSize(width: 1100, height: 780),
    minimumSize: CGSize = CGSize(width: 720, height: 560),
    margin: CGFloat = 40
  ) -> CGRect {
    let visibleFrame = display.visibleFrame
    let availableWidth = max(minimumSize.width, visibleFrame.width - margin * 2)
    let availableHeight = max(minimumSize.height, visibleFrame.height - margin * 2)
    let width = min(preferredSize.width, availableWidth)
    let height = min(preferredSize.height, availableHeight)
    let x = visibleFrame.minX + margin
    let y = visibleFrame.maxY - height - margin

    return CGRect(x: x, y: max(visibleFrame.minY + margin, y), width: width, height: height)
  }

  static func placeMainWindow() {
    let displays = NSScreen.screens.map { screen in
      DisplayDescriptor(name: screen.localizedName, visibleFrame: screen.visibleFrame)
    }

    guard
      let display = preferredDisplay(from: displays),
      let window = NSApp.windows.first(where: { $0.isVisible && $0.canBecomeMain }) ?? NSApp.keyWindow ?? NSApp.mainWindow
    else {
      return
    }

    window.setFrame(windowFrame(for: display), display: true)
    window.makeKeyAndOrderFront(nil)
  }
}
