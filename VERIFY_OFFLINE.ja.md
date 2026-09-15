# PDF Pipeline Builder v1.0.0 オフライン確認手順

v1.0.0正式版として、Pipeline JSONの安全な読込、Quick Recipe、出力Preview、PDF Output結果表示、アプリ内確認ダイアログ、固定Editor高さ、浮かせて拡大、MiniMap、途中結果Preview、文書加工、保存・再利用をまとめて最終確認します。

## 1. 起動 / 通信

1. `dist/index.html` を直接開く。
2. 表示バージョンがv1.0.0であることを確認する。
3. InfoとEN / JA切替が動くことを確認する。
4. faviconと左上アイコンが `assets/favicon.svg` と一致することを確認する。
5. CSPに `connect-src 'none'` と `frame-src blob:` が含まれることを確認する。
6. Previewを含め、実行時に外部HTTP(S)、fetch、XHR、WebSocket、CDN、telemetry、PDFアップロードが発生しないことを確認する。

## 2. Canvas / Toolbar

1. 左パレット4グループが初期状態ですべて開き、個別に開閉できることを確認する。
2. Nodeをクリックして追加できること、パレットからCanvasへドラッグして落とした位置にも追加できることを確認する。
3. Canvas上のNodeをドラッグし、PortとEdgeがずれないことを確認する。
4. `− / % / ＋` と全体表示が動くことを確認する。
5. 補助線 / Grid吸着 / MiniMap / 浮かせて拡大がSVGアイコンになっていることを確認する。
6. 各アイコンのON状態と日英tooltip / aria-labelを確認する。
7. 四隅アイコンでCanvasを浮かせて拡大し、Palette / Inspectorを残したままCanvasが広がること、MiniMapがデスクトップ幅で表示されること、Escapeでも戻れることを確認する。
8. Edgeを直接選択・削除し、Undo / Redoを確認する。

## 3. 文書加工Node

1. 1 / 2 / 3と識別できる3ページPDFをPDF Inputへ読み込む。
2. Page Numbersを追加し、`番号のみ` / `n / 合計` / `Page n` / `Page n / 合計`、開始番号、6位置、文字サイズ、余白が反映されることを確認する。
3. Watermarkを追加し、ASCII文字、文字サイズ、濃さ、角度がPreviewと最終PDFへ一致して反映されることを確認する。
4. 日本語など非ASCIIのWatermark入力が技術的な例外ではなく入力エラーとして扱われることを確認する。
5. Text StampでDRAFT / CONFIDENTIAL / COPY / INTERNAL / SAMPLE / APPROVEDを切り替え、6位置、文字サイズ、余白、濃さと枠が反映されることを確認する。
6. `/Rotate` を持つ元PDFでも、0 / 90 / 180 / 270度の見た目に対して位置と文字向きが正しいことを確認する。

## 4. Node順序の意味

1. `Page Numbers → Reorder` では、先に付いた番号ごとページが移動することを確認する。
2. `Reorder → Page Numbers` では、並べ替え後の順番で番号が付くことを確認する。
3. `Stamp → Rotate` ではスタンプがページと一緒に回ることを確認する。
4. `Rotate → Stamp` では回転後の見た目を基準にスタンプが配置されることを確認する。
5. 同じ順序が途中結果Previewと最終PDFで一致することを確認する。

## 5. 途中結果Preview

1. PDF Inputを選択し、全ページがPreviewに表示されることを確認する。
2. Select / Reorder、Delete、Duplicate、Blank、Rotate、Reverse、Page Numbers、Watermark、Text Stampの各NodeでNode時点の結果を確認する。
3. Splitは `選択` / `残り` を切り替え、MergeはA → B → C…の順番を確認する。
4. PDF Outputでは最終入力時点をPreviewできることを確認する。
5. 7ページ以上のPDFで6ページずつ表示され、前へ / 次へで全ページを確認できることを確認する。
6. 選択Nodeまでに必要なPDF Inputだけ読み込めばPreviewでき、無関係な別Branchの未選択Inputで妨げられないことを確認する。
7. 必要なInput / 接続が不足している場合は、技術的な例外ではなく案内を表示することを確認する。
8. Preview更新後に古いBlob URLが残り続けないことをDevToolsで確認する。

## 6. 実PDF処理回帰

Select / Reorder、Delete、Duplicate、Insert Blank Page、Rotate、Reverse、Split、2〜6入力Merge、3種の文書加工Nodeを含む代表Pipelineを実行し、Previewと最終PDFのページ数・順序・回転・加工内容が一致することを確認する。空出力エラーも維持する。

## 7. Pipelineの保存 / 再利用

1. 文書加工Nodeを含むPipeline JSONを保存する。
2. 別のPDFを用意してPipeline JSONを開く。
3. 元PDF bytesが保存されておらず、各PDF Inputで再選択が必要になることを確認する。
4. 別PDFを再選択すると同じNode構成・設定でPreview / 実行できることを確認する。
5. Intro / Helpに、保存したPipelineを別のPDFにも再利用できる旨が表示されることを確認する。


## 8. Recipeライブラリ

1. 現在のPipelineを「提出用PDF仕上げ」などの名前でRecipe登録する。
2. Recipe一覧に名前、Node数、更新日時が表示されることを確認する。
3. 同名で再登録すると上書き確認が出ることを確認する。
4. Pipelineを別構成へ変更してからRecipeの「使う」を押し、登録時のNode / Edge / 設定 / 位置へ戻ることを確認する。
5. Recipe読込後、PDF Inputのファイル名・ページ数が空で、新しいPDF選択を待つ状態になることを確認する。
6. Recipeの「更新」で現在のPipelineへ置き換えられることを確認する。
7. Recipeの「削除」で確認が入り、取り消し時は残り、確定時だけ削除されることを確認する。
8. 30件上限を超えて登録できないことを確認する。
9. DevTools ApplicationでRecipeが `localStorage` に保存され、PDF bytes・Blob URL・元PDFファイル名・ページ数が含まれないことを確認する。
10. Pipeline JSON保存 / 読込は従来どおり動き、Recipeとは独立した持ち運び用形式であることを確認する。
11. 登録済みRecipeがノードエディタ上部に表示されることを確認する。
12. RecipeカードにPDF Input数と同じ数のPDF選択欄が表示され、クリック / ドロップでファイルを指定できることを確認する。
13. 「Canvasに反映」でアプリ内確認が表示され、確定後にRecipeのNode構成とカードで選んだPDFがCanvasへ反映されることを確認する。
14. 「このRecipeを使う」では現在のCanvasを変更せず、カードで選んだPDFを使った生成結果が出力Previewに表示されることを確認する。
15. 出力Previewの「PDFを保存」を押した時だけ保存が始まることを確認する。
16. Quick Recipeで選んだFile/PDF bytesがlocalStorageへ保存されないことを確認する。

## 9. スマートフォン幅

390px前後で以下を確認する。

- ページ全体に横スクロールが発生しない
- Palette内だけ横スクロールし、グループ開閉UIも画面外へはみ出さない
- 文書加工Nodeを選択できる
- Inspectorの各設定が画面外へはみ出さない
- Previewが3列になり、PDF枠 / ページ番号 / 前後ボタンがはみ出さない
- Canvasアイコンが44px相当のタップ領域を持つ
- ファイルチップが安全に折り返す
- Recipeボタンを含む実行 / 保存ボタンが重ならない
- Recipeダイアログが画面外へはみ出さず、登録 / 使う / 更新 / 削除のタップ領域が十分にある
- 長いファイル名で崩れない

## 10. 自己展開版

1. `dist/index.self-extract.html` を直接開く。
2. 文書加工Node / Preview / Split / 複数入力Mergeも通常版と同様に動く。
3. ビルド検査で通常版へbyte-for-byte復元できることを確認する。

### v1.0.0 正式版重点確認

1. CanvasへNode追加など未保存変更を加えた後、「Pipelineを開く」で有効なPipeline JSONを選ぶと、置換前にアプリ内確認が表示される。
2. 上記確認をキャンセルすると、Node / Edge / 選択PDF / Viewport / Undo履歴が変更されない。
3. 確定するとPipelineが読み込まれ、PDF Inputは再選択待ちになる。
4. 壊れたJSONまたは別app idのJSONを選んでも、現在のCanvasと選択PDFが消えない。
5. Quick Recipeは初期状態で閉じ、右向きchevronから個別に開閉できる。
6. 「Canvasに反映」は常にアプリ内確認を表示し、確定後だけRecipeと選択済みPDFをCanvasへ反映する。
7. 「このRecipeを使う」はCanvasを変更せず生成し、自動保存せず出力Previewを開く。
8. 出力Previewの「PDFを保存」を押した時だけダウンロードが始まる。
9. PDF OutputのInspectorは「結果」、その他Nodeは「途中結果」と表示される。
10. Recipe上書き / 更新 / 削除、Node削除、Input解除、Merge入力削減、サンプル置換、Pipeline JSON置換にブラウザー標準confirm / alert / promptを使わない。
11. PC日本語 / PC英語 / 390pxスマホで、横スクロール・固定UI重なり・ダイアログはみ出し・長いファイル名崩れがない。
12. `connect-src 'none'`、`frame-src blob:`、runtime network APIなし、Node Editor Core 1.0.0不変を確認する。
