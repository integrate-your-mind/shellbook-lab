import Foundation

@MainActor
final class ShellbookLabModel: ObservableObject {
  @Published var baseURLString: String {
    didSet {
      UserDefaults.standard.set(baseURLString, forKey: Self.baseURLKey)
    }
  }
  @Published var selectedPresenceStatus: PresenceStatus = .available
  @Published private(set) var dashboardState: LoadState<DashboardSnapshot> = .idle
  @Published private(set) var privacyState: LoadState<CommandPayload> = .idle
  @Published private(set) var handoffState: LoadState<CommandPayload> = .idle
  @Published private(set) var presenceState: LoadState<CommandPayload> = .idle

  private static let baseURLKey = "ShellbookLabBaseURL"
  private static let defaultBaseURL = "http://127.0.0.1:8791"

  init(baseURLString: String? = nil) {
    self.baseURLString = baseURLString
      ?? UserDefaults.standard.string(forKey: Self.baseURLKey)
      ?? Self.defaultBaseURL
  }

  func resetBaseURL() {
    baseURLString = Self.defaultBaseURL
  }

  func refreshDashboard() async {
    dashboardState = .loading
    do {
      dashboardState = .loaded(try await client().snapshot())
    } catch {
      dashboardState = .failed(message(for: error))
    }
  }

  func runPrivacyAudit() async {
    privacyState = .loading
    do {
      privacyState = .loaded(try await client().privacyAudit())
    } catch {
      privacyState = .failed(message(for: error))
    }
  }

  func generateHandoffPreview() async {
    handoffState = .loading
    do {
      handoffState = .loaded(try await client().handoffPreview())
    } catch {
      handoffState = .failed(message(for: error))
    }
  }

  func readPresence() async {
    presenceState = .loading
    do {
      presenceState = .loaded(try await client().readPresence())
    } catch {
      presenceState = .failed(message(for: error))
    }
  }

  func writePresence() async {
    presenceState = .loading
    do {
      presenceState = .loaded(try await client().writePresence(status: selectedPresenceStatus))
    } catch {
      presenceState = .failed(message(for: error))
    }
  }

  private func client() throws -> ShellbookLabClient {
    guard let url = URL(string: baseURLString), let scheme = url.scheme, ["http", "https"].contains(scheme) else {
      throw ShellbookLabClientError.invalidBaseURL
    }
    return ShellbookLabClient(baseURL: url)
  }

  private func message(for error: Error) -> String {
    (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
  }
}
