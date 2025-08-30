# audio-meta 開発ガイド

## プロジェクト概要

audio-metaは、音楽ファイルのメタデータを管理するデスクトップアプリケーションです。
ユーザーが指定したディレクトリ内の音楽ファイルを読み込み、ID3タグなどのメタデータを表示・編集する機能を提供します。

## アーキテクチャ

本アプリケーションは**クリーンアーキテクチャ**と**ドメイン駆動設計（DDD）**を採用したTauriベースのデスクトップアプリケーションです。

### システム構成

- **バックエンド層** (Rust + Tauri)
  - **Use Case Layer**: アプリケーションサービス (ビジネスフローの制御)
  - **Domain Layer**: ドメインモデル (ビジネスロジックとルール)
  - **Infrastructure Layer**: 外部システムとの連携 (ファイルシステム、外部API)
- **フロントエンド層** (SolidJS + TanStack Router)
  - **Routes**: TanStack Routerによるルーティング管理
  - **Tauri Commands Layer**: バックエンドとの通信インターフェース
- **IPC通信**: TauriのAPIを使用してフロントエンドとバックエンド間を非同期通信
- **外部システム**: バックエンドを通じて音楽ファイル (.mp3等) の読み書き

## 開発方針

- **型安全性**: TypeScriptとRustによる静的型検査でランタイムエラーを防止
- **選択的テスト**: 重要なビジネスロジックやデータ処理部分に絞ったユニットテスト
- **関心の分離**: 各層の責務を明確に分割し、保守性と拡張性を確保
- **エラーハンドリング**: Rustの`Result`型とフロントエンドの`neverthrow`による明示的なエラー処理
- **コード品質**: Biome、Clippy、rustfmtによる自動フォーマット・リントで一貫性を保持

## 開発フロー

1. **要件定義**: ドメインモデルとユースケースの設計
2. **バックエンド実装**: ドメイン層 → ユースケース層 → インフラ層の順で実装
3. **フロントエンド実装**: Tauriコマンド定義 → UIコンポーネント → 機能統合
4. **テスト**: 重要なビジネスロジックやデータ処理部分にユニットテストを追加

## Git運用ルール

### ブランチ戦略

- **mainブランチ**: 常に安定した状態を保つ
- **featureブランチ**: 新機能の開発やバグ修正はこのブランチで行う。ブランチ名は`feature/機能名`や`fix/バグ内容`の形式にする。

### コミット

- **コミットメッセージテンプレート**: `[タイプ]: [内容]`
  - タイプ: feat, fix, docs, style, refactor, test, chore
  - 例: `feat: ユーザー認証機能を追加`

### プルリクエスト

- `gh pr create --base main --title "[タイトル]" --body ""`コマンドでPRを作成する。
  - タイトルに変更内容を簡潔に記述する。 
  - コードレビューツールが自動でbodyを作成するので、空文字を指定する。
- コードレビューツールを使用してPRの内容が自動でレビューされる。レビュワーを指定する必要はない。


## バックエンド

### 役割

デスクトップアプリのビジネスロジックとシステム入出力を担い、フロントエンドからのリクエストを受けてユースケース層で処理し、必要に応じてインフラ層へアクセスします。型安全なデータ転送と明示的なエラーハンドリングを提供します。

### 技術スタック

- 言語: Rust
- ビルドツール: Cargo
- ランタイム: Tauri
- データ検証・シリアライズ: serde, serde_json
- エラーハンドリング: thiserror, anyhow
- 非同期: tokio
- テスト: cargo test
- リント・フォーマット: Clippy, rustfmt

### ディレクトリ構成

- `src-tauri/src/main.rs`: Tauriアプリケーションのエントリーポイント
- `src-tauri/src/lib.rs`: Tauriの設定およびコマンド登録
- `src-tauri/src/domain`: ドメイン層（エンティティ、値オブジェクト、ビジネスロジック）
- `src-tauri/src/use_case`: ユースケース層（アプリケーションサービス）
  - `src-tauri/src/use_case/dto`: 汎用DTO（Data Transfer Object）
  - `src-tauri/src/use_case/use_cases`: ユースケース実装（ユースケース固有のDTO含む）
- `src-tauri/src/infra`: インフラ層（ファイルシステム、リポジトリ実装など）
  - ドメインのトレイトを実装するモジュールを配置
- `src-tauri/src/utils`: 汎用ユーティリティ

### コマンド

- `bun run dev`: **開発サーバー起動** Tauriバックエンドとフロントエンドの両方を起動する。
- `bun run lint:back`: **リント実行**
- `bun run fmt:back`: **フォーマット実行** フォーマットはコミット前に自動で実行されるため、手動で実行する必要はない。
- `bun run test:back`: **テスト実行** cargo testでユニットテストを実行する。

上記および[フロントエンドのコマンド](#コマンド-1)以外の`package.json`のscriptsは手動で実行することを禁止する。

### 実装ガイド

ドメイン駆動設計に基づき各層を分離し、型安全性とテスト容易性を重視する。
Context 7 MCP Serverを利用してRustクレートやライブラリのドキュメントを参照することができる。

#### ドメイン層

- 純粋なビジネスロジックを実装し、外部依存を持たないようにする。
- ユニットテストを書きやすくするため、副作用を持たない設計とする。

#### インフラ層

- ドメイン層のトレイトを実装し、ファイルシステムやデータベースなどのIO操作を行う。
- テスト時には外部IOを不要にするインメモリリポジトリ（モック）を提供する。

#### ユースケース層

- ドメインとインフラを組み合わせ、アプリケーションサービスとしてビジネスフローを実装する。
- 入出力はDTOにマッピングして返却する。

#### Tauriコマンド

- 必ず `Result<T, AppError>` を返し、`thiserror`で定義したエラー型を使用する。

#### DTO

- `serde::{Serialize, Deserialize}` をderiveし、後方互換性を保持する。

#### テスト

- 各モジュールファイル内に `#[cfg(test)] mod tests` を作成し、ユニットテストを記述する。
- テストは同一ファイル内の `mod tests` にまとめ、`cargo test` で実行する。
- 外部IOを排除するため、インメモリリポジトリやモック実装を活用する。
- Given/When/Then構文で記述する。

#### コード例

```rust
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
  #[error("IOエラーが発生しました: {0}")]
  Io(#[from] std::io::Error),
  #[error("不正な入力です: {0}")]
  Validation(String),
}

#[derive(Serialize, Deserialize)]
pub struct ListFilesRequest {
  pub directory: String,
}

#[derive(Serialize, Deserialize)]
pub struct ListFilesResponse {
  pub files: Vec<String>,
}

#[tauri::command]
async fn list_files(req: ListFilesRequest) -> Result<ListFilesResponse, AppError> {
  let repo = FileSystemRepository::new();
  let files = repo.list(req.directory).await?;
  Ok(ListFilesResponse { files })
}
```

## フロントエンド

### 役割

デスクトップアプリのUIを提供し、ユーザー操作をバックエンドに伝える。

### 技術スタック

- 言語: TypeScript
- パッケージマネージャー: Bun
- UIライブラリ・状態管理: SolidJS
- ルーティング: TanStack Router
- UIコンポーネント: Kobalte, TanStack Table
- スタイリング: Tailwind CSS
- エラーハンドリング: neverthrow
- バリデーション: Arktype
- テスト: Vitest
- リント・フォーマット: Biome

### ディレクトリ構成

- `src/routes`: TanStack Routerによるルーティング定義
- `src/tauri`: Tauriバックエンドとの通信層
  - `src/tauri/commands`: Tauriコマンド定義
  - `src/tauri/dto`: データ転送オブジェクト
- `src/components`: 汎用UIコンポーネント
- `src/primitives`: 汎用SolidJSプリミティブ
- `src/utils`: 汎用ユーティリティ
- そのほか汎用的なものは`src/schemas`、`src/providers`のように`src/`以下に配置する。
- `src/features`: 機能別モジュール
  - 機能ごとに`features/{domain}`ディレクトリを作成する。
  - `features/{domain}/`中に、`components`、`primitives`、`schemas`などを配置する。
  - `features/{domain}/index.ts`で各機能が公開するAPIをまとめてエクスポートする。
- `src/main.tsx`: アプリケーションのエントリーポイント。編集禁止。
- `src/routeTree.gen.ts`: ルート定義の自動生成ファイル。編集禁止。
- `src/styles.css`: グローバルスタイルのエントリCSS・Tailwind CSSの設定

### コマンド

- `bun run dev`: **開発サーバー起動** Tauriバックエンドとフロントエンドの両方を起動する。
- `bun run dev:front-mock`: **フロントエンドモックサーバー起動**
  フロントエンドとしてのみ起動し、Tauriバックエンドをモックする。フロントエンドの動作確認をブラウザ上で行いたい場合や、フロントエンドの単体テストを行う場合に使用する。
- `bun run lint:front`: **リント実行**
- `bun run test:front --run`: **テスト実行**
  `--run`オプションを付けて1度だけ実行する。ウォッチモードは使用しないこと。
- `bun run fmt:front`: **フォーマット実行** フォーマットはコミット前に自動で実行されるため、手動で実行する必要はない。

上記および[バックエンドのコマンド](#コマンド)以外の`package.json`のscriptsは手動で実行することを禁止する。

- `bun add`: **パッケージ追加**
- `bun remove`: **パッケージ削除**

### 実装ガイド

使用するライブラリやフレームワークのベストプラクティスに従う。
Context 7 MCP Serverを利用してライブラリのドキュメントを参照することができる。

#### パスエイリアス

- `@/`で`src/`を参照する。

#### Tauriとの通信

- Tauriとの通信は、`src/tauri`ディレクトリ内で定義されたコマンドを介して行う。
- Tauriと直接通信するコードは`src/tauri`ディレクトリ内に限定する。
- コマンドは必ず型を定義する。
- コマンドには必ずモック実装を用意する。

#### SolidJS プリミティブ

- `interface`でプリミティブの返却値の型を定義する。
- 必要に応じて型やプリミティブの関数にドキュメントコメントを付与する。
- `create`や`use`で始まる関数名にする。

例:

```ts
import { type Accessor, createSignal } from "solid-js";

interface Counter {
  count: Accessor<number>;
  increment: () => void;
  decrement: () => void;
}

const createCounter = (): Counter => {
  const [count, setCount] = createSignal(0);
  return {
    count,
    increment: () => setCount(count() + 1),
    decrement: () => setCount(count() - 1),
  };
};
```

#### SolidJS ディレクティブ

- `declare module "solid-js"`でJSXの`Directives`に型を追加する。
- 未使用の警告を防ぐために、関数定義の直前に`// biome-ignore lint/correctness/noUnusedVariables: ディレクティブとして使うため`を付与する。
- 未使用の警告を防ぐために、関数定義の直後で関数を参照する。同じ行に`// tsの未使用警告を防ぐ措置`とコメントをつける。

例：

```ts
import type { Accessor, Setter } from "solid-js";

declare module "solid-js" {
  namespace JSX {
    interface Directives {
      model: [Accessor<string>, Setter<string>];
    }
  }
}

// biome-ignore lint/correctness/noUnusedVariables: ディレクティブとして使うため
const model = (
  el: HTMLInputElement,
  value: [Accessor<string>, Setter<string>]
) => {
  // (省略)
};
model; // tsの未使用警告を防ぐ措置
```

#### エラーハンドリング

- `neverthrow`を使用し、`try-catch`は使用しない。
- 失敗する可能性がある関数はすべて`Result<T, E>`を返す。
  - 非同期関数の場合は`ResultAsync<T, E>`を返す。`Promise<Result<T, E>>`は使用しない。

#### 汎用UIコンポーネント

- `src/components`内に定義する。
- 基本的にはKobalteのコンポーネントをラップして定義する。
- Tailwind CSSを使用してスタイリングする。
  - コンポーネント使用側で`class` propからスタイルを上書きできるようにする。スタイルのマージには`cn`を使用する。
- 親子関係がある場合、`Object.assign()`を使用してエクスポートする。

  例:

  ```ts
  export const Table = Object.assign(TableRoot, {
    Header: TableHeader,
    HeaderRow: TableHeaderRow,
    HeaderCell: TableHeaderCell,
    Body: TableBody,
    Row: TableRow,
    Cell: TableCell,
    Footer: TableFooter,
  });
  ```

#### スタイリング

- Tailwind CSSを使用する。
- 条件付きクラスには`cn`を使用する。
- スタイルが複雑な場合、`cn`を使用して役割ごとにクラスのまとまりを分割する。

#### テスト

- Vitestでユニットテストを作成する。
- `bun run test:front --run`でテストを実行する。
- テストコードは`*.test.ts`または`*.test.tsx`のファイル名にする。
- テスト名には、関数名やコンポーネント名をそのまま使用するか、日本語の簡潔な説明を使用する。
- Given/When/Then構文を使用してテストケースを記述する。
- SolidJSのテストは https://docs.solidjs.com/guides/testing#writing-tests を参照する。
