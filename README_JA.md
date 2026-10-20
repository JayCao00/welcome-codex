<div align="center">

# welcome-codex

**Codex のコールドスタートに、彩りのあるオープニングを。**

<a href="media/welcome-jay.mp4"><img src="media/readme-preview.gif" alt="虹色の welcome Jay の手書きがリボンを経てノットアイコンになる起動アニメーション" width="800"></a>

<br>

![macOS](https://img.shields.io/badge/macOS-13%2B-000000?logo=apple&logoColor=white)
![Version](https://img.shields.io/badge/version-2.4.3-167DAD)
![Swift](https://img.shields.io/badge/Swift-AppKit-F05138?logo=swift&logoColor=white)
![Rendering](https://img.shields.io/badge/Canvas-Vector-25855A)

虹色の手書き `welcome Jay` がノットへとつながり、やさしく拡大して Codex へ。<br>
ネイティブウインドウに追従 · 完全終了後の起動時のみ再生 · サウンドなし

[プレビュー](#アニメーション) · [インストール](#インストール) · [使い方](#使い方) · [よくある質問](#よくある質問)

[简体中文](README.md) · [English](README_EN.md) · **日本語**

</div>

---

## アニメーション

`welcome` を書いたあと、少し間を置いて `Jay` を描きます。最後の一筆がカラフルなリボンに変わり、途切れることなくノットアイコンへ。ゆっくり拡大したあと、アプリへフェードします。

| 特徴 | 動作 |
| --- | --- |
| 多彩な手書き | 虹色の線に、やわらかな透過感と動くハイライト |
| なめらかなつながり | 手書き、リボン、アイコンを連続したパスで描画 |
| 鮮明な拡大 | 画面のネイティブ解像度でベクター輪郭を描画 |
| ウインドウに追従 | 位置・サイズ・全画面状態を記憶し、起動時にも補正 |
| 静かなテンポ | 0.8 倍速、12.75 秒、音声なし |
| 起動時のみ再生 | 実行中のアプリを再度クリックしても再生しない |

[4K / 60 fps の動画を見る](media/welcome-jay.mp4)。上の GIF は縮小プレビューです。実際の起動時は動画ではなく、ローカルの Canvas をリアルタイムで描画します。

## インストール

**macOS 13 以降**と、Swift を含む **Xcode Command Line Tools** が必要です。未導入の場合は `xcode-select --install` を実行してください。

> このバージョンの対象は `/Applications/ChatGPT.app`、bundle identifier は `com.openai.codex` です。Codex のインストール先が異なる場合は、先に [macos/main.swift](macos/main.swift) と [scripts/build.sh](scripts/build.sh) のパスを変更してください。

```sh
git clone https://github.com/JayCao00/welcome-codex.git
cd welcome-codex
zsh scripts/build.sh
zsh scripts/install.sh
```

ビルドにはローカルのアドホック署名を使用し、追加ランタイムのダウンロードは不要です。次の項目を作成します。

| 項目 | 保存先 |
| --- | --- |
| ランチャー | `~/Applications/ChatGPT Welcome Jay.app` |
| ショートカット | `~/Desktop/ChatGPT Welcome Jay.app` |
| 起動監視 | `~/Library/LaunchAgents/local.jay.welcome.plist` |

## 使い方

普段どおり Codex を開いてください。インストールされたランチャーやデスクトップのショートカットも使えます。

- **完全終了後に起動**：アニメーションを一度再生してからアプリへ切り替えます。
- **アプリが実行中**：ウインドウをアクティブにするだけで、再生しません。
- **スキップ**：`Escape` または `Command + .`。
- **手動で再生**：Codex 実行中に、メニューバーのきらめきアイコンから `Play welcome Jay` を選びます。
- **Codex を終了**：アニメーションとメニューバーのアイコンが消えます。バックグラウンドの監視は次の起動を待ちます。

通常のウインドウは macOS 標準の角丸、最大化時は画面の作業領域に合わせます。フルスクリーン再生はメニューバー、Dock、ノッチの安全領域を含む画面全体を覆います。再生中はシステムバーを一時的に自動非表示にし、終了またはスキップ時に元の表示設定に戻します。Codex がフルスクリーンの Space を復元する間は、保存済みの全画面状態を維持します。

## よくある質問

<details>
<summary><strong>Codex の改変や画面収録の権限は必要ですか？</strong></summary>

不要です。元のアプリ、Dock のアイコン、チャットデータは変更しません。アクセシビリティや画面収録の権限も不要です。取得するのはウインドウ位置などのシステムメタデータであり、画面の内容は読み取りません。実行時のネットワークリクエストや API 呼び出しもありません。

</details>

<details>
<summary><strong>ウインドウを閉じて開き直しても再生されないのはなぜですか？</strong></summary>

ウインドウを閉じることと、アプリの終了は異なります。Codex を完全に終了（`Command + Q`）し、新しいプロセスとして起動した場合のみ再生します。ログイン時に監視が開始されても、それだけでは再生しません。メニューの `Quit Welcome Jay` は現在のログインセッションの監視のみ停止します。

</details>

<details>
<summary><strong>ウインドウの状態はどこに保存されますか？</strong></summary>

`~/Library/Application Support/Welcome Jay/window-placement.json` に保存します。Codex がアクティブな間は 0.5 秒ごと、およびアプリの切り替え時に記録します。初回は Codex の `electron-main-window-bounds` を代わりに使用できます。再生中は 0.1 秒ごとに実際のウインドウを確認し、2 回連続で同じ状態を取得すると反映します。ディスプレイを外した場合は利用可能な画面に合わせます。全画面状態を記憶できるよう、先に監視をインストールしてから切り替えてください。

</details>

<details>
<summary><strong>文字やアニメーションを変更できますか？</strong></summary>

現在は個人向けの `welcome Jay` に固定されており、名前の入力設定はありません。アニメーションと手書きのパスは [animation.js](animation.js)、ノットのパスは [knot-paths.js](knot-paths.js) で変更できます。編集後に再ビルド・再インストールしてください。[preview.html](preview.html) を直接開くと、サーバーなしでループ再生を確認できます。ネイティブ起動時は一度だけ再生します。

</details>

<details>
<summary><strong>再生が終わると Codex の読み込みも完了していますか？</strong></summary>

読み込み状況は監視せず、固定の長さで再生します。遅い環境では、切り替え後もアプリの読み込みが続く場合があります。WebKit が停止した場合は 20 秒の保護タイマーで閉じます。対象アプリを起動できない場合はシステムのダイアログを表示します。

</details>

## アンインストール

```sh
zsh scripts/uninstall.sh
```

LaunchAgent とデスクトップのリンクを削除し、インストールされたランチャーをゴミ箱に移動します。プロジェクトのソースと動画は残ります。

## 開発と検証

<details>
<summary><strong>リポジトリ構成、動画出力、検証ツール</strong></summary>

```text
welcome-codex/
├── README.md / README_EN.md / README_JA.md
├── animation.js           # 手書き、色、タイムライン
├── knot-paths.js          # ノットと連続するリボンのパス
├── preview.html           # ローカルプレビュー
├── macos/                # Swift ウインドウと起動・終了の監視
├── scripts/              # ビルド、インストール、削除、動画出力
├── tools/                # 出力と回帰検証
└── media/                # README GIF と 4K 動画
```

任意の 4K 動画出力には Node.js、Playwright、Google Chrome が必要です。

```sh
zsh scripts/render.sh
```

必要に応じて `NODE_BINARY` と `NODE_PATH` を指定してください。スクリプトは、このマシンの Codex 同梱 Node ランタイムも検出します。動画は起動処理には使用しません。

README の GIF は macOS 標準フレームワークで再出力できます。

```sh
swift tools/export-readme.swift media/welcome-jay.mp4 media/readme-preview.gif
```

| ツール | 検証内容 |
| --- | --- |
| `scripts/build.sh` | ネイティブのコンパイルと署名 |
| `tools/verify-placement.cjs` | 座標、最大化、全画面、角丸、切断された画面、不正な状態ファイル |
| `tools/verify-startup.cjs` | 独立テストアプリの起動、再生抑止、終了処理、実際のウインドウ境界の一致 |
| `tools/verify-vector.cjs` | 色、連続性、デスクトップ・モバイルサイズ、Retina 描画 |
| `tools/inspect-video.swift` | 動画トラック情報と 1 秒ごとのフレーム抽出 |

ネイティブの検証には有効な macOS デスクトップセッションが必要です。起動テストは独立したアプリを使うため、実際の Codex を終了する必要はありません。

`tools/trace-knot.py` はパス制作向けの任意ツールです。NumPy、Pillow、SciPy、scikit-image が必要ですが、ビルド・実行時の依存関係ではありません。

</details>

## 参考と謝辞

- [dragon-codex-boot](https://github.com/yushua0808-cpu/dragon-codex-boot)：ネイティブ再生とアプリイベント監視の設計を参考にしました。
- Jay 提供の参考動画と Apple Event 2021 のオープニング：動き、手書きの配色、流れの参考です。元の録画は配布していません。
- [Bootstrap Icons](https://icons.getbootstrap.com/)：ノット輪郭の比率を参考にしています。MIT ライセンスについては [第三者の権利に関する表示](THIRD_PARTY_NOTICES.md) を参照してください。

個人向けのカスタマイズであり、OpenAI や Apple とは関係ありません。更新履歴は [CHANGELOG](CHANGELOG.md) を参照してください。

---

<div align="center">

**welcome Jay.**<br>
<sub>彩りのある一筆から、次の創作へ。</sub>

[简体中文](README.md) · [English](README_EN.md) · [日本語](README_JA.md)

</div>
