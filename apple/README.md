# Hush の Swift 版

Hush を SwiftUI で作り直しているアプリです。iOS と macOS で動きます。

- 金庫や日記の読み書きは、Rust のコア（`core/`）が受け持ちます。
- Swift からは、`ffi/` のクレートを通してコアを呼びます。
- Tauri 版とは別のアプリなので、両方を同じ端末に入れられます。データも別のフォルダに置きます。

## 動かす

Rust のコアをビルドして、Swift から呼べる形にします。コアを変えたら、もう一度実行します。

```sh
apple/scripts/build-core.sh
```

Xcode のプロジェクトを作ります。`apple/project.yml` を変えたときも、もう一度実行します。

```sh
cd apple && xcodegen generate
```

あとは `apple/Hush.xcodeproj` を開いて実行します。

## 整形の確認

```sh
apple/scripts/lint.sh
```
