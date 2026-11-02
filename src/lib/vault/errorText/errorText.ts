import type { HushErrorKind } from "../hushError";

/** What to tell the person for each kind. Every kind needs an entry. */
const TEXT: Record<HushErrorKind, string> = {
  wrongPassphrase: "パスフレーズが違います。",
  wrongPassphraseOrSecretKey: "パスフレーズか Secret Key が違います。",
  invalidSecretKey: "Secret Key の形が違います。H1 から始まる文字をそのまま入れてください。",
  noSecretKey: "この端末には Secret Key がありません。",
  keychain: "キーチェーンを読み書きできませんでした。",
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
  decryption:
    "この日の日記を開けませんでした。ファイルが別の場所から移されたか、書き換えられています。",
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
