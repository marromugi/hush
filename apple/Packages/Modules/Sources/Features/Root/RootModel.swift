import CoreEntrance
import Observation

@Observable
public final class RootModel {
  /// `nil` until the first read finishes.
  public private(set) var status: VaultStatus?

  private let core: Core

  public init(core: Core) {
    self.core = core
  }

  public func load() async {
    status = await core.vaultStatus()
  }
}
