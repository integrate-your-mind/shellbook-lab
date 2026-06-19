import Foundation

struct ShellbookLabClient {
  let baseURL: URL

  func snapshot() async throws -> DashboardSnapshot {
    try await get("api/snapshot")
  }

  func privacyAudit() async throws -> CommandPayload {
    try await get("api/privacy")
  }

  func handoffPreview() async throws -> CommandPayload {
    try await get("api/handoff-preview")
  }

  func readPresence() async throws -> CommandPayload {
    try await get("api/presence")
  }

  func writePresence(status: PresenceStatus) async throws -> CommandPayload {
    try await post("api/presence", body: PresenceRequest(status: status))
  }

  private func get<Value: Decodable>(_ path: String) async throws -> Value {
    let url = baseURL.appending(path: path)
    let (data, response) = try await URLSession.shared.data(from: url)
    try validate(response: response)
    return try JSONDecoder().decode(Value.self, from: data)
  }

  private func post<Value: Decodable, Body: Encodable>(_ path: String, body: Body) async throws -> Value {
    let url = baseURL.appending(path: path)
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONEncoder().encode(body)

    let (data, response) = try await URLSession.shared.data(for: request)
    try validate(response: response)
    return try JSONDecoder().decode(Value.self, from: data)
  }

  private func validate(response: URLResponse) throws {
    guard let response = response as? HTTPURLResponse else {
      throw ShellbookLabClientError.invalidResponse
    }
    guard 200..<300 ~= response.statusCode else {
      throw ShellbookLabClientError.httpStatus(response.statusCode)
    }
  }
}

enum ShellbookLabClientError: LocalizedError, Equatable {
  case invalidBaseURL
  case invalidResponse
  case httpStatus(Int)

  var errorDescription: String? {
    switch self {
    case .invalidBaseURL:
      "Enter a valid local Shellbook Lab URL."
    case .invalidResponse:
      "Shellbook Lab returned an invalid response."
    case .httpStatus(let status):
      "Shellbook Lab returned HTTP \(status)."
    }
  }
}
