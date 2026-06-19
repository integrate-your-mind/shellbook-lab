// swift-tools-version: 5.9
import PackageDescription

let package = Package(
  name: "ShellbookLabMac",
  platforms: [
    .macOS(.v14)
  ],
  products: [
    .executable(name: "ShellbookLabMac", targets: ["ShellbookLabMac"])
  ],
  targets: [
    .executableTarget(name: "ShellbookLabMac"),
    .testTarget(name: "ShellbookLabMacTests", dependencies: ["ShellbookLabMac"])
  ]
)
