# GeminiScope 公開ガイド

このドキュメントでは、GeminiScopeアプリをWindows向けにビルド・公開する方法を説明します。

## 前提条件

ビルドに必要なツールがインストールされていることを確認してください：

- **Node.js** (v18以上推奨)
- **Rust** (最新安定版)
- **Windows SDK** (Windowsビルド用)
- **Microsoft Visual Studio C++ Build Tools** (Windows用)

### 必要な環境のインストール

1. **Node.js**: https://nodejs.org/ からダウンロード
2. **Rust**: https://www.rust-lang.org/tools/install からインストール
   ```bash
   rustc --version
   cargo --version
   ```
3. **Windows Build Tools**:
   - Visual Studio Installerから「C++ ビルド ツール」をインストール
   - または `npm install -g windows-build-tools`

## ビルドの準備

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 開発モードで動作確認

```bash
npm run tauri:dev
```

アプリが正常に起動することを確認してください。

## 本番ビルド

### Windowsインストーラーの作成

```bash
npm run tauri:build
```

ビルドが完了すると、以下の場所に成果物が生成されます：

```
src-tauri/target/release/
├── geminiscope_0.1.0_x64-setup.exe  # Windows インストーラー
├── geminiscope.exe                   # 実行ファイル
└── bundle/                           # 各種パッケージ形式
```

### ビルド出力の説明

- **`geminiscope_0.1.0_x64-setup.exe`**: 最も一般的な配布形式。ユーザーがダブルクリックでインストール可能
- **`geminiscope.exe`**: ポータブル版（インストール不要）
- **MSI/AppX**: `bundle`フォルダ内に生成される他のパッケージ形式

## 配布方法

### 1. 直接配布

- インストーラー（`.exe`）をユーザーに直接配布
- クラウドストレージ（Google Drive、OneDrive等）から共有
- 自社のホームページからダウンロード提供

### 2. GitHub Releases

1. GitHubでリポジトリを作成
2. Releasesページにアクセス
3. 「Draft a new release」をクリック
4. タグ、タイトル、説明を入力
5. ビルドした`geminiscope_0.1.0_x64-setup.exe`をアップロード
6. 「Publish release」で公開

### 3. Microsoft Store（Windows版）

配布前に必要な手順：

1. **Microsoft Partner Center**に登録（$19の登録料）
2. **アプリID**を取得し、`tauri.conf.json`に設定
3. **証明書**を設定
4. Store用に再ビルド

詳細: https://tauri.app/v1/guides/distribution/microsoft-store

### 4. 自動更新の設定

Tauriの自動更新機能を使うには：

1. 更新サーバーを用意（GitHub Releases、S3等）
2. `tauri.conf.json`に`updater`設定を追加
3. 更新チェック機能を実装

**詳細な手順**: [`UPDATES.md`](./UPDATES.md)を参照してください。

主な手順：
- 鍵ペアを生成して署名用に設定
- `updater.json`を作成してGitHubに配置
- ヘッダーの「更新を確認」ボタンから更新チェック

詳細: https://tauri.app/v1/guides/distribution/updater

## ビルド最適化

### サイズ削減

1. 不要なファイルを削除
2. UPX等で圧縮
3. `--release`フラグで最適化

```bash
npm run tauri:build -- -- --release
```

### パフォーマンス向上

- フロントエンドのバンドルサイズを削減
- 不要な依存関係を削除
- コード分割を実施

## トラブルシューティング

### ビルドエラー

**エラー: `link.exe not found`**
```bash
# Visual Studio Build Toolsをインストール
# または環境変数を設定
set VCVARSALL=C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat
```

**エラー: `cargo not found`**
```bash
# Rustを再インストール
# または PATH に Rust を追加
```

**エラー: `node_modules が見つからない`**
```bash
# 依存関係を再インストール
rm -rf node_modules
npm install
```

### 実行時のエラー

- ウイルス対策ソフトが誤検知する場合がある
- 証明書で署名すると検知率が下がる

## 証明書による署名（推奨）

1. **コードサイニング証明書を取得**
   - 商用証明機関（DigiCert等）
2. **証明書で署名**
   ```bash
   signtool sign /f your-cert.pfx /p password /t http://timestamp.digicert.com geminiscope.exe
   ```

## チェックリスト

ビルド前に確認：

- [ ] `tauri.conf.json`のバージョン番号を更新
- [ ] アプリアイコンが適切に設定されている
- [ ] 著作権情報が正しく記載されている
- [ ] ライセンスファイルが含まれている
- [ ] README.mdが最新の状態
- [ ] 環境変数の設定が必要な場合、説明文書を用意

## 次のステップ

1. **テスト**: ビルドしたアプリを複数のWindows環境でテスト
2. **フィードバック収集**: ベータテスターから意見を収集
3. **機能追加**: フィードバックに基づいて機能を改善
4. **正式リリース**: 準備が整ったら正式に公開

## 参考リンク

- [Tauri公式ドキュメント](https://tauri.app/)
- [React Routerドキュメント](https://reactrouter.com/)
- [Windows アプリの配布](https://tauri.app/v1/guides/distribution/windows)
- [コード署名の説明](https://docs.microsoft.com/ja-jp/windows/win32/win_cert/about-certificates)

