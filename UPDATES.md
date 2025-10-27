# 自動更新機能の実装ガイド

このドキュメントでは、GeminiScopeアプリに実装された自動更新機能の使い方と設定方法を説明します。

## 概要

Tauri Updaterプラグインを使用して、アプリの自動更新機能を実装しています。ユーザーは簡単なボタンクリックで新しいバージョンに更新できます。

## セットアップ手順

### 1. 鍵ペアの生成

更新の署名に必要な鍵ペアを生成します：

```bash
# Tauri CLIを使用して鍵を生成
npx @tauri-apps/cli signer generate -w ~/.tauri/myapp.key
```

このコマンドで以下が生成されます：
- **秘密鍵**: `~/.tauri/myapp.key`（絶対に公開しない）
- **公開鍵**: ターミナルに表示される`pubkey`（これを設定ファイルに設定）

### 2. 設定ファイルの更新

`src-tauri/tauri.conf.json`に公開鍵とエンドポイントを設定：

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/updater.json"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

### 3. リリースバンドルを生成

ビルド時にリリースバンドルを生成します：

```bash
npm run tauri:build
```

以下のファイルが生成されます：
- `src-tauri/target/release/` 内の実行ファイル
- `src-tauri/target/release/bundle/` 内のバンドル

### 4. リリースバンドルへの署名

生成されたバンドルに署名します：

```bash
# Windows用
npx @tauri-apps/cli signer update \
  --key ~/.tauri/myapp.key \
  --updater-url https://example.com/updater.json \
  src-tauri/target/release/bundle/nsis/geminiscope_0.1.0_x64-setup.exe
```

### 5. アップデーター設定ファイルを作成

GitHubリポジトリに `updater.json` を作成：

```json
{
  "version": "0.1.0",
  "notes": "初回リリース",
  "pub_date": "2024-01-01T00:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "更新ファイルの署名（署名コマンドで生成される）",
      "url": "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/download/v0.1.0/geminiscope_0.1.0_x64-setup.exe"
    }
  }
}
```

### 6. GitHubにアップロード

1. GitHubでリリースを作成
2. 署名済みインストーラーをアップロード
3. `updater.json`をリポジトリのmainブランチにプッシュ

## 使用方法

### 開発者向け

#### 新しいバージョンをリリースする手順

1. **バージョン番号の更新**
   ```bash
   # package.json
   "version": "0.1.1"
   
   # src-tauri/Cargo.toml
   version = "0.1.1"
   
   # src-tauri/tauri.conf.json
   "version": "0.1.1"
   ```

2. **ビルドと署名**
   ```bash
   npm run tauri:build
   npx @tauri-apps/cli signer update --key ~/.tauri/myapp.key src-tauri/target/release/bundle/nsis/geminiscope_0.1.1_x64-setup.exe
   ```

3. **updater.jsonの更新**
   ```json
   {
     "version": "0.1.1",
     "notes": "バグ修正とパフォーマンス改善",
     "pub_date": "2024-01-15T00:00:00Z",
     "platforms": {
       "windows-x86_64": {
         "signature": "新しい署名",
         "url": "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/download/v0.1.1/geminiscope_0.1.1_x64-setup.exe"
       }
     }
   }
   ```

4. **リリースの公開**
   - GitHub Releasesにバージョン0.1.1を公開
   - updater.jsonをコミット

### ユーザー向け

#### アプリ内での更新方法

1. **手動チェック**
   - ヘッダーの「更新を確認」ボタンをクリック
   - 新しいバージョンがあれば通知が表示

2. **自動更新**
   - ダイアログで「今すぐ更新」をクリック
   - ダウンロードとインストールが自動で実行
   - 完了後、アプリが自動的に再起動

## トラブルシューティング

### 更新がダウンロードできない

**原因**: ネットワーク接続の問題
**対処**: インターネット接続を確認

### 署名エラー

**原因**: 公開鍵が一致しない
**対処**: 設定ファイルの`pubkey`を確認

### 更新後アプリが起動しない

**原因**: インストール中のエラー
**対処**: 
1. アプリを完全にアンインストール
2. 最新版を手動でダウンロードして再インストール

## セキュリティの注意事項

1. **秘密鍵の保護**
   - `~/.tauri/myapp.key`は絶対に公開しない
   - バージョン管理に追加しない（`.gitignore`に追加）
   
   ```gitignore
   # .gitignore に追加
   **/*.key
   ```

2. **公開鍵の検証**
   - ユーザーは公開鍵で署名を検証
   - 改ざんされたファイルはインストールできない

3. **HTTPSの使用**
   - updater.jsonとダウンロードURLはHTTPS必須
   - GitHub Releasesを使用することを推奨

## 設定オプション

`tauri.conf.json`の`updater`セクションで設定可能：

| オプション | 説明 | デフォルト |
|---------|-----|---------|
| `active` | 自動更新を有効にする | `true` |
| `endpoints` | 更新情報を取得するURL | `[]` |
| `dialog` | ダイアログを表示するか | `true` |
| `pubkey` | 公開鍵 | 必須 |
| `windows` | Windows用の詳細設定 | `{}` |

## 参考リンク

- [Tauri Updater公式ドキュメント](https://tauri.app/v1/guides/distribution/updater)
- [署名の詳細](https://tauri.app/v1/api/cli/#signer)

## チェックリスト

新しいバージョンをリリースする前に確認：

- [ ] バージョン番号を更新
- [ ] ビルドしてテスト
- [ ] バンドルに署名
- [ ] updater.jsonを更新
- [ ] GitHub Releasesにアップロード
- [ ] updater.jsonをコミット
- [ ] 既存のインストールで更新をテスト

