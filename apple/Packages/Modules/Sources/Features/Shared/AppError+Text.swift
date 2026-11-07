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
    case .noBiometry: "この端末では Touch ID も Face ID も使えません。"
    case .biometryCancelled: "指紋や顔で確かめるのをやめました。"
    case .biometryFailed: "指紋や顔で確かめられませんでした。パスフレーズで開いてください。"
    case .biometricKeychain: "指紋や顔で開くための鍵を読み書きできませんでした。"
    case .noKeptKey: "指紋や顔では開けなくなりました。パスフレーズで開いてください。"
    case .newerEntry: "新しい版のアプリで書かれた日記です。アプリを更新してください。"
    case .brokenEntry: "この日の日記のファイルが壊れているため開けません。"
    case .unsupportedPicture: "JPEG・PNG・GIF 以外の画像は保存できません。"
    case .newerImage: "新しい版のアプリで保存された画像です。アプリを更新してください。"
    case .brokenImage: "画像のファイルが壊れているため開けません。"
    case .invalidImageId: "画像の名前の形が正しくありません。"
    case .noImage: "画像のファイルが見つかりません。"
    case .link: "リンク先のページを読み込めませんでした。"
    case .unreadableLink: "このリンクは読み込めません。"
    case .embedPages: "動画を出す準備ができませんでした。アプリを開き直してください。"
    case .unexpected: "思いがけない問題が起きました。"
    }
  }
}
