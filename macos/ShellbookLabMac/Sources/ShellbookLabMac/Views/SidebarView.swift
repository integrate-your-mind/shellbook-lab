import SwiftUI

struct SidebarView: View {
  @Binding var selection: MacSection?

  var body: some View {
    List(selection: $selection) {
      Section("Shellbook Lab") {
        ForEach(MacSection.allCases) { section in
          HStack(spacing: 10) {
            Image(systemName: section.systemImage)
              .foregroundStyle(.secondary)
              .frame(width: 18)

            VStack(alignment: .leading, spacing: 2) {
              Text(section.title)
                .lineLimit(1)
              Text(section.detail)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            }
          }
          .tag(section)
        }
      }
    }
    .listStyle(.sidebar)
    .navigationTitle("Shellbook Lab")
  }
}
