# PDF Pipeline Builder

[![GitHub Pages](https://github.com/ttomohisa/htmlapps-pdf-pipeline-builder/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ttomohisa/htmlapps-pdf-pipeline-builder/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Single HTML](https://img.shields.io/badge/distribution-single%20HTML-0ea5e9)](https://ttomohisa.github.io/htmlapps-pdf-pipeline-builder/)

[English README](README.md)

PDFの処理手順をノードで組み立て、繰り返し使えるPipelineとして保存できる、完全ローカル処理の単一HTML Webアプリです。途中結果を確認しながら処理を組み、よく使う手順はRecipeとして保存して、別のPDFへ再利用できます。

## 🚀 デモ

### [GitHub PagesでPDF Pipeline Builderを開く](https://ttomohisa.github.io/htmlapps-pdf-pipeline-builder/)

GitHub Pagesから最初のHTMLを読み込んだ後、選択したPDF、途中結果Preview、Recipe実行、生成PDFは端末内で処理されます。アプリから選択したPDFをサーバーへアップロードしません。

[![PDF Pipeline Builderの画面](assets/screenshot.png)](https://ttomohisa.github.io/htmlapps-pdf-pipeline-builder/)

## 主な機能

- **PDF処理をNode Pipelineとして組み立て** — Input、ページ操作、文書加工、分岐、Merge、Outputを、実行したい順番で接続できます。
- **最終実行前に途中結果を確認** — Nodeを選ぶと、その時点のPDFを右側でPreviewできます。PDF Outputでは「結果」として表示し、拡大確認もできます。
- **Recipeで処理手順をすぐ再利用** — Pipelineをブラウザー内Recipeとして保存し、ノードエディタ上部で別PDFを指定して、Canvasへ反映するか、Canvasを変更せず出力Previewまで実行できます。
- **分岐と再結合** — Splitで`選択 / 残り`へ分岐し、Mergeで2〜6入力を決めた順番で結合できます。
- **文書仕上げもNode化** — ページ番号、テキストウォーターマーク、プリセットスタンプをPipelineの好きな位置へ追加できます。
- **PC / スマートフォンで編集** — Nodeのクリック追加とドラッグ追加、Paletteグループ開閉、Undo / Redo、Pan / Zoom / 全体表示、MiniMap、補助線、Grid吸着、浮かせて拡大に対応します。
- **単一HTML・完全ローカル処理** — `pdf-lib`とNode Editor Coreを内包し、実行時外部通信を行いません。PDF bytesはPipeline JSONやRecipeへ保存しません。

## すぐに使う

### Webで使う

[デモを開く](https://ttomohisa.github.io/htmlapps-pdf-pipeline-builder/)だけで利用できます。インストールやアカウント登録は不要です。

### 単一HTMLで使う

1. リリースZIPをダウンロードするか、このリポジトリをクローンします。
2. Windowsでは `build-standalone.bat`、または `node build.mjs` を実行します。
3. 生成された `dist/index.html` を現在のChromium系ブラウザで開きます。
4. 生成後は `dist/index.html` 1ファイルを任意の場所へコピーでき、ネットワーク接続なしでも利用できます。

単一HTMLの**ビルドにはNode.jsが必要**です。生成済みの `dist/index.html` を使うだけならNode.jsは不要です。

## 使い方

1. **PDF Input** Nodeを1つ以上置き、ローカルPDFを選択します。
2. PaletteからNodeをクリック、またはCanvasへドラッグして追加します。
3. 処理したい順番でNodeを接続します。分岐が必要な場合はSplit / Mergeを使います。
4. Nodeを選択すると、右側で設定と途中結果を確認できます。**PDF Output**を選択した場合は最終の「結果」として表示します。
5. 最後のページ列を**PDF Output**へ接続し、出力ファイル名を設定してPipelineを実行します。生成後にPDFを保存します。
6. 持ち運び・バックアップ用ならPipeline JSON、同じ処理をこのブラウザーですぐ使い直すならRecipeとして保存します。

### Quick Recipe

保存したRecipeはノードエディタの上に表示され、初期状態では折りたたまれています。

- Recipeを開き、必要なPDF InputごとにPDFを選択またはドロップします。
- **Canvasに反映**：確認ダイアログを表示した後、現在のCanvasをRecipeへ置き換え、選択済みPDFも引き継いで編集できます。
- **このRecipeを使う**：現在のCanvasを変更せずRecipeを別Graphとして実行し、ローカルの**出力プレビュー**を開きます。Preview内の**PDFを保存**を押した時だけダウンロードします。
- Recipeへ保存するのは処理手順と設定です。元PDF bytes、生成PDF bytes、Quick Recipeで一時選択したファイル、元PDFのファイル名・ページ数は保存しません。

### Pipeline JSON

Pipeline JSONはバックアップ、別端末への移動、Git管理などに向いています。Node、Edge、設定、位置、Viewport、出力ファイル名は復元しますが、元PDFは再選択が必要です。

未保存のCanvas変更がある状態でPipeline JSONを開く場合は、アプリ内確認ダイアログを表示します。キャンセルすれば、現在のGraphと選択済みPDFはそのまま保持されます。

## 処理Node

| グループ | Node |
| --- | --- |
| Input / Output | PDF Input、PDF Output |
| ページ操作 | ページ選択・並べ替え、ページ削除、ページ複製、空白ページ挿入、Rotate、Reverse Pages |
| 分岐 / 結合 | Split Pages、Merge Pages（2〜6入力） |
| 文書加工 | Page Numbers、Watermark、Text Stamp |

`all`、`1-3,5`、`3,1,2` などのページ指定は、**そのNodeへ到達した時点のページ列**を基準にします。そのためNodeの順番には意味があります。たとえば `並べ替え → ページ番号` なら並べ替え後の順番で採番し、`ページ番号 → 並べ替え` なら番号が付いたページごと移動します。

## Previewと出力

途中結果Previewは、選択したNodeに必要な上流だけを評価します。別BranchのPDFが未選択でも、関係ないBranchのPreviewを妨げません。

- 1回に最大6ページを表示し、前後ボタンで続きへ移動
- Splitでは`選択 / 残り`を切り替え
- 各Previewページを拡大表示可能
- PDF Outputだけは「途中結果」ではなく**「結果」**として表示
- Preview / 出力表示は一時的なローカルBlob PDFを使用し、外部URLからPDFデータを読み込みません

Preview表示にはブラウザー内蔵のPDF表示機能を使用します。主要対象はChrome / Edgeです。

## GitHub Pagesで公開する

このリポジトリには、単一HTMLをビルド・検証し、`dist/`をGitHub Pagesへ自動公開するワークフローが含まれています。

1. リポジトリ名を `htmlapps-pdf-pipeline-builder` としてGitHubへプッシュします。
2. **Settings → Pages → Build and deployment → Source** で **GitHub Actions** を選択します。
3. `main`へプッシュするか、Actions画面から **Deploy standalone app to GitHub Pages** を手動実行します。
4. 成功後、`https://ttomohisa.github.io/htmlapps-pdf-pipeline-builder/` で公開されます。

ワークフローは `dist/index.html`、`dist/index.self-extract.html`、生成ManifestもBuild Artifactとして保存します。

## 開発とビルド

```text
.
├─ src/index.template.html          # アプリ本体テンプレート
├─ src/vendor/node-editor-core.mjs # Node Editor Core 1.0.0
├─ src/vendor/pdf-lib.min.js        # 内包済みpdf-lib
├─ app.config.json                  # アプリ情報 / ビルド方針
├─ dependencies.json                # 依存定義
├─ dependencies.lock.json           # 固定バージョン / ハッシュ
├─ build.mjs                        # 単一HTML / Self Extract生成
├─ build-standalone.bat             # Windows用ビルド入口
├─ tests/                           # 回帰テスト
├─ assets/                          # favicon / screenshot
└─ dist/                            # 生成物
```

ビルド:

```bash
node build.mjs
```

テスト:

```bash
npm test
```

GitHub Actionsと同等のリポジトリ検証は、Windows / PowerShellで次を実行します。

```powershell
.\scripts\check-repository.ps1
```

正式版の確認項目は [VERIFY_OFFLINE.ja.md](VERIFY_OFFLINE.ja.md) を参照してください。

## プライバシーと外部通信

生成したHTMLは、読み込み後のPDF処理を完全ローカルで行う設計です。

- Content Security Policyに `connect-src 'none'` を設定
- アプリ実行時に `fetch`、`XMLHttpRequest`、`WebSocket` を使用しない
- 途中結果 / 結果Previewは `frame-src blob:` で許可したローカルBlob PDFだけを表示
- 元PDF bytesはメモリ上だけに保持し、Pipeline JSONやRecipeへ書き込まない
- Recipeはこのブラウザーの`localStorage`へ保存。永続保存を利用できない場合はセッション内メモリへフォールバックし、画面に警告を表示
- GitHub Pages版では最初のHTML配信は発生しますが、選択したPDF内容をアプリから送信しません

完全にネットワークを切って使う場合は、生成済みの `dist/index.html` をローカルで開いてください。

## 制限事項

- Preview表示はブラウザー内蔵のPDF表示機能に依存します。主要対象はChrome / Edgeです。
- Watermarkのカスタム文字はASCII文字に限定しています。v1.0.0では日本語フォントなどのカスタムフォント埋め込みは行いません。
- 電子署名付きPDFを加工すると署名は無効になる場合があります。
- 出力PDFはページを再構成するため、しおり、添付ファイル、フォーム、署名、Outlineなどの文書レベル情報を引き継げない場合があります。
- 大容量PDFや複雑な分岐を持つPipelineでは、完全ローカル処理のため端末メモリを多く使用します。
- Recipeはブラウザー内保存です。バックアップ、別端末への移動、Git管理にはPipeline JSONを使ってください。
- 元PDF bytesを保存しないため、Pipeline JSONを開き直した場合やRecipeをCanvasへ読み込んだ場合はPDF Inputの再選択が必要です。

## 使用ライブラリ

| ライブラリ | バージョン | ライセンス | 用途 |
| --- | ---: | --- | --- |
| pdf-lib | 1.17.1 | MIT | PDF読み込み、ページ複製・変換、文書加工、PDF生成 |
| Node Editor Core | 1.0.0 | Project source | Graph編集、Port / Edge、選択、Viewport、Undo / Redo、MiniMap、保存形式 |

実行時CDNから依存ライブラリを読み込みません。詳細は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) を参照してください。

## コントリビューション

バグ報告や機能提案はGitHub Issuesからお願いします。開発への参加方法は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## ライセンス

Copyright © 2026 ttomohisa

このプロジェクトは [MIT License](LICENSE) で公開されています。
