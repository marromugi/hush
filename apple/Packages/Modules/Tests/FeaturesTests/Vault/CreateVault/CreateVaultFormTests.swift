import Testing

@testable import Features

struct CreateVaultFormTests {
  @Test func twoDifferentPassphrasesMakeNothingAndSaySo() {
    let form = CreateVaultForm(passphrase: "one", confirm: "two")
    var created: [String] = []

    form.submit { created.append($0) }
    #expect(created.isEmpty)
    #expect(form.mismatched)
  }

  @Test func thePassphraseTypedTwiceMakesTheVault() {
    let form = CreateVaultForm(passphrase: "same", confirm: "same")
    var created: [String] = []

    form.submit { created.append($0) }
    #expect(created == ["same"])
    #expect(!form.mismatched)
  }
}
