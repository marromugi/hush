import CoreEntrance
import Testing

@testable import Features

struct VaultModelTests {
  @Test func aNewVaultShowsItsSecretKeyUntilItIsKept() async {
    let model = VaultModel(vault: FakeVault(status: .missing, secretKey: "H1-KEPT"))
    await model.load()

    await model.create(passphrase: "passphrase").value
    #expect(model.status == .unlocked)
    #expect(model.newSecretKey == "H1-KEPT")

    model.keptSecretKey()
    #expect(model.newSecretKey == nil)
  }

  @Test func aWrongPassphraseKeepsTheVaultLockedAndSaysSo() async {
    let model = VaultModel(vault: FakeVault(status: .locked, failure: .wrongPassphrase))
    await model.load()

    await model.unlock(passphrase: "wrong").value
    #expect(model.status == .locked)
    #expect(model.failure == .wrongPassphrase)
  }

  @Test func aDeviceWithoutTheSecretKeyAsksForIt() async {
    let model = VaultModel(vault: FakeVault(status: .locked, failure: .noSecretKey))
    await model.load()

    await model.unlock(passphrase: "passphrase").value
    #expect(model.status == .needsSecretKey)
  }

  @Test func lockingClosesTheVaultAndForgetsAnUnkeptSecretKey() async {
    let model = VaultModel(vault: FakeVault(status: .missing))
    await model.load()
    await model.create(passphrase: "passphrase").value

    model.lock()
    #expect(model.status == .locked)
    #expect(model.newSecretKey == nil)
  }
}
