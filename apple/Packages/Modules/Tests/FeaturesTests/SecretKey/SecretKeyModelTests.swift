import CoreEntrance
import Testing

@testable import Features

struct SecretKeyModelTests {
  @Test func theSecretKeyIsShownAsKept() async {
    let model = SecretKeyModel(vault: FakeVault(status: .unlocked, secretKey: "H1-KEPT"))

    await model.load()

    #expect(model.reading == .read("H1-KEPT"))
  }

  @Test func aSecretKeyThatCannotBeReadSaysWhy() async {
    let model = SecretKeyModel(vault: FakeVault(status: .unlocked, failure: .noSecretKey))

    await model.load()

    #expect(model.reading == .failed(.noSecretKey))
  }
}
