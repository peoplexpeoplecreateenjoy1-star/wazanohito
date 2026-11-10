# わざのひと（WAZANOHITO）サイト

GitHub Pages で公開する、わざのひとのサイトです。事業者の情報は Googleスプレッドシートから読み込みます。

## ファイル
- index.html … ホーム（わざのひと一覧）
- about.html … わざのひとについて
- person.html … ひとのページ（person.html?id=karate のように、シートの「ID」で切り替わる）
- style.css … 見た目／app.js … シートを読んでページを組み立てる／i18n.js … 決まった文章の日本語・英語
- config.js … シートのURLとリンク先（ここだけ書き換えればよい）
- data/people.csv … 予備のデータ（シートが読めないときに表示）
- assets … ロゴ／photos … 写真（事業者ごとのフォルダ）

## 公開の手順
1. GitHubで新しいリポジトリ（例 wazanohito、Public）を作る
2. 「uploading an existing file」から、このフォルダの中身（index.html などとフォルダ）をまとめてドラッグして「Commit changes」
3. Settings → Pages → Branch を「main」「/(root)」にして Save。1〜2分で https://（アカウント名）.github.io/wazanohito/ が開く

## スプレッドシートとつなぐ
1. 「わざのひと_記入シート.xlsx」をGoogleドライブに上げ、Googleスプレッドシートとして開く（ファイル → Googleスプレッドシートとして保存）
2. ファイル → 共有 → ウェブに公開 → 「公開用」シート・「カンマ区切り形式（.csv）」→ 公開 → 出てきたURLをコピー
3. GitHubで config.js を開き、鉛筆のマークで編集。sheetCsvUrl: '' の '' の中にURLを貼って Commit
4. 以後、シートを書き換えると5分ほどでサイトに反映される

## 写真
- photos/（ID）/ に入れて、シートには「karate/1.jpg」のように photos より後ろを書く
- メインの写真と日々の様子の写真は、ホーム冒頭の写真の帯にも自動で使われる
- 写真は横1600px程度に縮めてから入れると軽い

## デザインやプログラムを変えたとき
各HTMLの「?v=20261111a」の数字を上げると、ブラウザに古い表示が残らない
