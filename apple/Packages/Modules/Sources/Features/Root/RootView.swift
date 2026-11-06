import CoreEntrance
import SwiftUI

public struct RootView: View {
  let model: RootModel

  public init(model: RootModel) {
    self.model = model
  }

  public var body: some View {
    VaultStatusView(status: model.status)
      .task { await model.load() }
  }
}
