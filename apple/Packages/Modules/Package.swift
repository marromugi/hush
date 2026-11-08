// swift-tools-version: 6.2
import PackageDescription

let concurrency: [SwiftSetting] = [.enableUpcomingFeature("NonisolatedNonsendingByDefault")]
let mainActor: [SwiftSetting] = concurrency + [.defaultIsolation(MainActor.self)]

let package = Package(
  name: "Modules",
  platforms: [.iOS(.v18), .macOS(.v26)],
  products: [
    .library(name: "CoreEntrance", targets: ["CoreEntrance"]),
    .library(name: "Features", targets: ["Features"]),
  ],
  targets: [
    // Built by apple/scripts/build-core.sh.
    .binaryTarget(name: "HushFFI", path: "Frameworks/HushFFI.xcframework"),
    .target(name: "CoreBindings", dependencies: ["HushFFI"], swiftSettings: concurrency),
    .target(name: "CoreEntrance", dependencies: ["CoreBindings"], swiftSettings: concurrency),
    .target(
      name: "Features", dependencies: ["CoreEntrance"], resources: [.process("Colors.xcassets")],
      swiftSettings: mainActor),
    .testTarget(
      name: "CoreEntranceTests", dependencies: ["CoreEntrance"], swiftSettings: concurrency),
    .testTarget(
      name: "FeaturesTests", dependencies: ["Features", "CoreEntrance"], swiftSettings: mainActor),
  ]
)
