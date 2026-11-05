import { toHushError } from "@/lib/vault/hushError";
import type { HushErrorKind } from "@/lib/vault/hushError";

/** What to tell the person for each kind. Every kind needs an entry. */
const TEXT: Record<HushErrorKind, string> = {
  wrongPassphrase: "パスフレーズが違います。",
  wrongPassphraseOrSecretKey: "パスフレーズか Secret Key が違います。",
  invalidSecretKey: "Secret Key の形が違います。H1 から始まる文字をそのまま入れてください。",
  noSecretKey: "この端末には Secret Key がありません。",
  keychain: "キーチェーンを読み書きできませんでした。",
  noBiometry: "この端末では Touch ID も Face ID も使えません。",
  biometryCancelled: "指紋や顔で確かめるのをやめました。",
  biometryFailed: "指紋や顔で確かめられませんでした。パスフレーズで開いてください。",
  biometricKeychain: "指紋や顔で開くための鍵を読み書きできませんでした。",
  noKeptKey: "指紋や顔では開けなくなりました。パスフレーズで開いてください。",
  emptyPassphrase: "パスフレーズを入力してください。",
  noVault: "まだ日記帳がありません。",
  vaultExists: "日記帳はすでにあります。",
  locked: "ロックされています。もう一度解錠してください。",
  invalidDate: "日付の形が正しくありません。",
  newerVaultVersion: "新しい版のアプリで作られた日記帳です。アプリを更新してください。",
  outdatedVault:
    "古い形式の日記帳のため、この版のアプリでは開けません。日記帳を作り直してください。",
  brokenVault: "日記帳のファイルが壊れているため開けません。",
  newerEntryVersion: "新しい版のアプリで書かれた日記です。アプリを更新してください。",
  brokenEntry: "この日の日記のファイルが壊れているため開けません。",
  newerImageVersion: "新しい版のアプリで保存された画像です。アプリを更新してください。",
  brokenImage: "画像のファイルが壊れているため開けません。",
  invalidImageId: "画像の名前の形が正しくありません。",
  noImage: "画像のファイルが見つかりません。",
  unsupportedPicture: "JPEG・PNG・GIF 以外の画像は保存できません。",
  embedPages: "動画を出す準備ができませんでした。アプリを開き直してください。",
  music:
    "ミュージックで流せませんでした。ミュージックを使う許可と、プレイリストが残っているかを確かめてください。",
  decryption: "ファイルを開けませんでした。別の場所から移されたか、書き換えられています。",
  encryption: "日記を暗号化できませんでした。",
  keyDerivation: "日記帳の設定が正しくないため、鍵を作れませんでした。",
  random: "乱数を作れませんでした。もう一度試してください。",
  io: "ファイルの読み書きに失敗しました。",
  tauri: "アプリの内部で問題が起きました。もう一度試してください。",
  unknown: "思いがけない問題が起きました。",
};

export function errorText(kind: HushErrorKind): string {
  return TEXT[kind];
}

/** What to tell the person about `failure`, whatever was thrown. */
export function failureText(failure: unknown): string {
  return errorText(toHushError(failure).kind);
}
