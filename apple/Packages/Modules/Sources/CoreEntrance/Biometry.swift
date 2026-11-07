internal import CoreBindings

/// How this device recognizes its owner.
public enum Biometry: Equatable, Sendable {
  case touchID
  case faceID
  case opticID
}

/// Whether this device has Touch ID or Face ID, and whether the vault opens
/// with it here.
public struct BiometryStatus: Equatable, Sendable {
  /// `nil` when the device has none.
  public var biometry: Biometry?
  public var isOn: Bool

  public init(biometry: Biometry?, isOn: Bool) {
    self.biometry = biometry
    self.isOn = isOn
  }
}

extension BiometryStatus {
  init(_ status: CoreBindings.BiometryStatus) {
    self.init(biometry: status.biometry.map(Biometry.init), isOn: status.on)
  }
}

extension Biometry {
  init(_ biometry: CoreBindings.Biometry) {
    switch biometry {
    case .touchId: self = .touchID
    case .faceId: self = .faceID
    case .opticId: self = .opticID
    }
  }
}
