PDF Pipeline Builder v1.0.0

Browser Kitty向けの、完全ローカル処理を前提としたPDF Pipeline Builderです。

v1.0.0は最初の正式版です。PDF処理をNode Pipelineとして組み、途中結果を確認し、Pipeline JSONやブラウザー内Recipeとして保存・再利用できます。

正式版の主な確認項目:
- Quick Recipeの「Canvasに反映」は確認後に編集用Canvasへ読み込む
- Quick Recipeの「このRecipeを使う」は現在のCanvasを変更せず、出力プレビューを開く
- 出力プレビューから「PDFを保存」を押した時だけ保存する
- PDF Outputノードの右Inspectorは「結果」と表示する
- Pipeline JSON読込をキャンセルした場合、Canvasと選択済みPDFを保持する
- PC / スマートフォン / 日本語 / 英語
- 単一HTML / 完全ローカル処理 / CSP / 外部通信なし

詳しい使い方は README.ja.md、確認項目は VERIFY_OFFLINE.ja.md を参照してください。
