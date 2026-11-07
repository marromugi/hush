import CoreEntrance
import SwiftUI

extension AppError {
  var text: LocalizedStringKey {
    switch self {
    case .emptyPassphrase: "パスフレーズを入力してください。"
    case .wrongPassphrase: "パスフレーズが違います。"
    case .wrongPassphraseOrSecretKey: "パスフレーズか Secret Key が違います。"
    case .invalidSecretKey: "Secret Key の形が違います。H1 から始まる文字をそのまま入れてください。"
    case .noSecretKey: "この端末には Secret Key がありません。"
    case .newerVault: "新しい版のアプリで作られた日記帳です。アプリを更新してください。"
    case .outdatedVault: "古い形式の日記帳のため、この版のアプリでは開けません。日記帳を作り直してください。"
    case .brokenVault: "日記帳のファイルが壊れているため開けません。"
    case .keychain: "キーチェーンを読み書きできませんでした。"
    case .newerEntry: "新しい版のアプリで書かれた日記です。アプリを更新してください。"
    case .brokenEntry: "この日の日記のファイルが壊れているため開けません。"
    case .unexpected: "思いがけない問題が起きました。"
    }
  }
}
