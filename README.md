# 🏁 Browser Othello

ブラウザでプレイできるオセロゲーム。React + Vite フロントエンド、Node.js + Express + Socket.IO バックエンドで構成されます。

## 機能

- **AI対戦**: 3段階の難易度（初級・中級・上級）
- **マルチプレイヤー**: ルーム作成/参加方式の2人対戦
- **自動パス処理**: 手がない場合、自動的に交代
- **Docker対応**: Ubuntuサーバーへ簡単にデプロイ可能

## プロジェクト構造

```
BrowserOthello/
├── shared/              # フロントエンド・バックエンド共通のゲームエンジン
│   └── othello.js       # ゲームロジック（EOAエクスポート）
├── frontend/            # React + Vite フロントエンド
│   ├── src/
│   │   ├── components/  # Reactコンポーネント
│   │   ├── store/       # Zustandストア
│   │   ├── services/    # Socket.IOクライアント
│   │   ├── ai/          # AIロジック（Minimax + αβ剪定）
│   │   └── styles/      # CSS
│   ├── package.json
│   └── vite.config.js
├── backend/             # Express + Socket.IO バックエンド
│   ├── server.js        # サーバー本体
│   ├── services/
│   │   └── RoomManager.js  # ルーム管理
│   └── package.json
├── nginx.conf           # リバースプロキシ設定
├── Dockerfile.frontend  # フロントエンドDockerイメージ
├── Dockerfile.backend   # バックエンドDockerイメージ
└── docker-compose.yml   # Docker Compose設定
```

## ローカル開発環境の起動

### 1. バックエンドを起動

```bash
cd backend
npm install
npm start
```

バックエンドは `http://localhost:5000` で起動します。

### 2. フロントエンドを起動

別のターミナルで：

```bash
cd frontend
npm install
npm run dev
```

フロントエンドは `http://localhost:3000` で起動し、API/ソケット通信をバックエンドにプロキシします。

## Dockerでのデプロイ（Ubuntuサーバー）

### 必要条件

- Docker Engine
- Docker Compose

### ステップ

1. **サーバーにプロジェクトをコピー**

   ```bash
   scp -r BrowserOthello user@your-server:/path/to/
   cd /path/to/BrowserOthello
   ```

2. **Dockerイメージをビルドして起動**

   ```bash
   docker compose up --build -d
   ```

3. **確認**

   ブラウザで `http://your-server-ip` にアクセスします。

4. **停止**

   ```bash
   docker compose down
   ```

### 環境変数（オプション）

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| `PORT` | `5000` | バックエンドのポート |
| `FRONTEND_URL` | `http://localhost:80` | フロントエンドURL（CORS用） |

## ゲームルール

- 標準的なオセロのルールに従います
- 黒（先手）から開始します
- 相手を挟んだ石を裏返します
- 手がない場合は自動的にパスされます
- 両者が手がない場合、ゲーム終了
- 多くの石を持ったプレイヤーの勝ちです

## AIアルゴリズム

- **初級**: ランダムな合法手を選択
- **中級**: Minimax + αβ剪定（探索深さ3）
- **上級**: Minimax + αβ剪定（探索深さ5）+ 位置評価重み

## ビルドエラーのトラブルシューティング

### `require()` is not defined in ESM module

すべてのモジュールがESM形式になっています。`require()` を使っている場合は `import` に変更してください。

### Socket.IO接続エラー

- バックエンドとフロントエンドの両方が起動していることを確認
- CORS設定（`FRONTEND_URL`）を正しく設定

### Dockerビルド失敗

```bash
docker compose down --rmi all -v
docker compose build --no-cache
```

## ライセンス

MIT License
