import CoreEntrance

extension Biometry {
  /// As Apple names it, as in `Touch ID`.
  var name: String {
    switch self {
    case .touchID: "Touch ID"
    case .faceID: "Face ID"
    case .opticID: "Optic ID"
    }
  }
}
