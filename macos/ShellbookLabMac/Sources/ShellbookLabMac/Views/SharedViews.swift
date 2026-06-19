import SwiftUI

struct DetailShell<Content: View>: View {
  let title: String
  let subtitle: String
  @ViewBuilder let content: Content

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 18) {
        VStack(alignment: .leading, spacing: 4) {
          Text(title)
            .font(.largeTitle.weight(.semibold))
          Text(subtitle)
            .foregroundStyle(.secondary)
        }
        content
      }
      .padding(24)
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .navigationTitle(title)
  }
}

struct InfoCard<Content: View>: View {
  let title: String
  let subtitle: String?
  @ViewBuilder let content: Content

  init(_ title: String, subtitle: String? = nil, @ViewBuilder content: () -> Content) {
    self.title = title
    self.subtitle = subtitle
    self.content = content()
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      VStack(alignment: .leading, spacing: 3) {
        Text(title)
          .font(.headline)
        if let subtitle {
          Text(subtitle)
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
      }
      content
    }
    .padding(16)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(.background)
    .clipShape(RoundedRectangle(cornerRadius: 8))
    .overlay {
      RoundedRectangle(cornerRadius: 8)
        .stroke(.quaternary)
    }
  }
}

struct MetricTile: View {
  let label: String
  let value: String
  let tone: String

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(label)
        .font(.caption)
        .foregroundStyle(.secondary)
      HStack {
        Text(value)
          .font(.title3.weight(.semibold))
        Spacer()
        StatusBadge(text: tone, tone: tone)
      }
    }
    .padding(12)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(.thinMaterial)
    .clipShape(RoundedRectangle(cornerRadius: 8))
  }
}

struct StatusBadge: View {
  let text: String
  let tone: String

  var body: some View {
    Text(text)
      .font(.caption.weight(.semibold))
      .padding(.horizontal, 8)
      .padding(.vertical, 3)
      .foregroundStyle(foreground)
      .background(background)
      .clipShape(Capsule())
  }

  private var foreground: Color {
    tone == "warn" || tone == "failed" || tone == "review" || tone == "stale" ? .black : .white
  }

  private var background: Color {
    tone == "warn" || tone == "failed" || tone == "review" || tone == "stale" ? .yellow : .green
  }
}

struct CommandStateView: View {
  let state: LoadState<CommandPayload>

  var body: some View {
    switch state {
    case .idle:
      Text("Not run yet")
        .foregroundStyle(.secondary)
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

struct FailureView: View {
  let message: String
  let retry: () -> Void

  var body: some View {
    InfoCard("Could not load Shellbook Lab", subtitle: message) {
      Button {
        retry()
      } label: {
        Label("Retry", systemImage: "arrow.clockwise")
      }
    }
  }
}
