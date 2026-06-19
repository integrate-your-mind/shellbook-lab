import Foundation

enum LoadState<Value> {
  case idle
  case loading
  case loaded(Value)
  case failed(String)
}

struct DashboardSnapshot: Decodable, Equatable {
  let handle: String
  let modules: [ModulePlan]
  let metrics: [DashboardMetric]
  let sessions: [AgentSession]
  let feed: [FeedItem]
  let health: CommandResult
  let analytics: CommandResult
  let presence: CommandResult
}

struct ModulePlan: Decodable, Equatable, Identifiable {
  let id: String
  let title: String
  let command: String
  let maturity: String
  let description: String

  enum CodingKeys: String, CodingKey {
    case id
    case title
    case name
    case command
    case maturity
    case description
    case summary
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    id = try container.decode(String.self, forKey: .id)
    title = try container.decodeIfPresent(String.self, forKey: .title)
      ?? container.decode(String.self, forKey: .name)
    command = try container.decode(String.self, forKey: .command)
    maturity = try container.decode(String.self, forKey: .maturity)
    description = try container.decodeIfPresent(String.self, forKey: .description)
      ?? container.decodeIfPresent(String.self, forKey: .summary)
      ?? ""
  }
}

struct DashboardMetric: Decodable, Equatable, Identifiable {
  var id: String { label }
  let label: String
  let value: String
  let tone: String
}

struct AgentSession: Decodable, Equatable, Identifiable {
  var id: String { "\(agent)-\(repo)-\(duration)" }
  let agent: String
  let repo: String
  let status: String
  let duration: String
}

struct FeedItem: Decodable, Equatable, Identifiable {
  var id: String { "\(time)-\(text)" }
  let time: String
  let text: String
}

struct CommandPayload: Decodable, Equatable {
  let result: CommandResult
}

struct CommandResult: Decodable, Equatable {
  let ok: Bool
  let title: String
  let summary: String?
}

enum PresenceStatus: String, CaseIterable, Identifiable, Encodable {
  case available
  case busy
  case reviewing
  case offline

  var id: String { rawValue }

  var label: String {
    rawValue.capitalized
  }
}

struct PresenceRequest: Encodable {
  let status: PresenceStatus
}
