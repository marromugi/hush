import CoreEntrance
import Testing

@testable import Features

struct LockSettingsModelTests {
  @Test func turningTouchIdOnKeepsItOn() async throws {
    let vault = FakeVault(
      status: .unlocked, biometry: BiometryStatus(biometry: .touchID, isOn: false))
    let model = LockSettingsModel(vault: vault)
    await model.load()

    await model.setOn(true).value

    #expect(model.status == BiometryStatus(biometry: .touchID, isOn: true))
    #expect(try await vault.biometryStatus().isOn)
  }

  @Test func aFailedChangeLeavesItAsItWasAndSaysWhy() async {
    let vault = FakeVault(
      status: .unlocked, failure: .biometricKeychain,
      biometry: BiometryStatus(biometry: .touchID, isOn: false))
    let model = LockSettingsModel(vault: vault)
    await model.load()

    await model.setOn(true).value

    #expect(model.status?.isOn == false)
    #expect(model.failure == .biometricKeychain)
    #expect(!model.busy)
  }
}
