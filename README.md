# GeminiScope

CSVファイルを処理するための、Google Gemini AIを活用したデスクトップアプリケーション。

## 特徴

- 🚀 **高速処理**: 大量のCSVファイルを効率的に処理
- 🤖 **AI駆動**: Google Gemini AIによる高度なデータ変換と分析
- 📊 **柔軟な設定**: カスタマイズ可能なプロンプトと出力カラム
- 📝 **テンプレート管理**: よく使う設定をテンプレートとして保存
- 💾 **簡単エクスポート**: 処理結果をCSV形式で出力
- 🎨 **モダンUI**: TailwindCSSによる美しいインターフェース

## 必要な環境

- Windows 10/11
- Google Gemini APIキー

## クイックスタート

1. アプリを起動
2. 設定アイコン（⚙️）をクリック
3. Google Gemini APIキーを入力
4. CSVファイルを選択
5. プロンプトを編集（例: 「商品名を大文字に変換してください」）
6. 処理開始ボタンをクリック
7. 完了後、CSVエクスポート

## インストール

### ビルド済みアプリ（推奨）

最新のリリースからWindowsインストーラーをダウンロードしてインストールしてください。

### 開発者向け：ソースからビルド

詳細は[`DEPLOYMENT.md`](./DEPLOYMENT.md)を参照してください。

```bash
# 依存関係のインストール
npm install

# 開発モードで起動
npm run tauri:dev

# 本番ビルド
npm run tauri:build
```

## 使い方

1. **Google Gemini APIキーを設定**
   - 設定ダイアログからAPIキーを入力

2. **CSVファイルを読み込む**
   - 「ファイルを選択」ボタンからCSVファイルを選択

3. **処理設定を行う**
   - プロンプトを編集（必要な変換内容を記述）
   - 出力カラムを指定
   - 並列処理数を調整（デフォルト: 1）

4. **処理を実行**
   - 「処理開始」ボタンをクリック
   - 進捗をリアルタイムで確認

5. **結果をエクスポート**
   - 処理完了後、「CSVをエクスポート」から結果を保存

## プロジェクト構成

```
geminiscope/
├── app/                      # フロントエンド（React）
│   ├── components/          # UIコンポーネント
│   ├── hooks/               # カスタムフック
│   ├── routes/              # ルーティング
│   ├── stores/              # 状態管理（Zustand）
│   └── utils/               # ユーティリティ
├── src-tauri/               # バックエンド（Rust/Tauri）
└── public/                  # 静的ファイル
```

## 技術スタック

- **フロントエンド**: React 19, React Router 7, TailwindCSS 4
- **バックエンド**: Tauri 2, Rust
- **状態管理**: Zustand
- **AI API**: Google Gemini API
- **CSV処理**: PapaParse

## ライセンス

MIT License

## 貢献

プルリクエストやイシューの報告を歓迎します！

## サポート

問題が発生した場合は、GitHubのIssuesセクションで報告してください。

---

Built with ❤️ using Tauri, React, and React Router.
