import CoreEntrance
import SwiftUI
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

  @Test func lockingClosesTheVault() async {
    let model = VaultModel(vault: FakeVault(status: .unlocked))
    await model.load()

    model.lock()
    #expect(model.status == .locked)
  }

  @Test func lockingByHandAsksForFaceIdOnlyAfterTheAppComesBack() async throws {
    let vault = FakeVault(
      status: .unlocked, biometry: BiometryStatus(biometry: .faceID, isOn: true))
    let model = VaultModel(vault: vault)
    await model.load()

    await model.lockByHand().value
    #expect(model.status == .locked)
    #expect(model.biometry == .faceID)
    // The locked screen comes up in front of the person.
    #expect(model.sceneChanged(to: .active) == nil)
    #expect(await vault.biometryAsks == 0)

    model.sceneChanged(to: .background)
    await (try #require(model.sceneChanged(to: .active))).value
    #expect(await vault.biometryAsks == 1)
  }

  @Test func theLockedScreenOpensWithTouchIdWhenItIsOn() async throws {
    let vault = FakeVault(status: .locked, biometry: BiometryStatus(biometry: .touchID, isOn: true))
    let model = VaultModel(vault: vault)
    await model.load()

    await (try #require(model.sceneChanged(to: .active))).value

    #expect(model.status == .unlocked)
    #expect(model.biometry == .touchID)
    #expect(await vault.biometryAsks == 1)
  }

  @Test func aDismissedPromptIsAskedAgainOnlyAfterTheAppComesBack() async throws {
    let vault = FakeVault(
      status: .locked, biometry: BiometryStatus(biometry: .touchID, isOn: true),
      biometryFailure: .biometryCancelled)
    let model = VaultModel(vault: vault)
    await model.load()

    await (try #require(model.sceneChanged(to: .active))).value
    #expect(model.status == .locked)
    #expect(model.failure == nil)

    // The prompt itself takes the app out of the front and back.
    model.sceneChanged(to: .inactive)
    #expect(model.sceneChanged(to: .active) == nil)
    #expect(await vault.biometryAsks == 1)

    model.sceneChanged(to: .background)
    model.sceneChanged(to: .inactive)
    await (try #require(model.sceneChanged(to: .active))).value
    #expect(await vault.biometryAsks == 2)
  }

  @Test func theLockedScreenDoesNotAskWhenTouchIdIsOff() async throws {
    let vault = FakeVault(
      status: .locked, biometry: BiometryStatus(biometry: .touchID, isOn: false))
    let model = VaultModel(vault: vault)
    await model.load()

    await (try #require(model.sceneChanged(to: .active))).value

    #expect(model.status == .locked)
    #expect(model.biometry == nil)
    #expect(await vault.biometryAsks == 0)
  }
}
