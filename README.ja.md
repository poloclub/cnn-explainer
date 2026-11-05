# CNN Explainer

[English](README.md) | [简体中文](README.zh-CN.md) | 日本語 | [Deutsch](README.de.md)

畳み込みニューラルネットワーク（CNN）の仕組みを、専門知識がなくても対話型の可視化で学べるツールです。

## 利用方法

[オンラインデモ](https://poloclub.github.io/cnn-explainer/)の言語メニューから「日本語」を選ぶか、URL に `?lang=ja` を追加します。この機能は変更のマージとデプロイ後にオンラインデモへ反映されます。それまではローカルで確認できます。

英語、簡体字中国語、日本語、ドイツ語に対応しています。言語を指定しない場合や未対応の言語を指定した場合は英語になります。言語を切り替えると、図中の文字も更新するためページを再読み込みします。他のクエリーパラメーターと記事のアンカーは保持されます。

記事、図の説明、操作ボタン、エラー表示、クラス名、可視化の注釈を翻訳しています。元の動画とアニメーション画像内の文字は英語のままです。外部の推薦ウィジェットや YouTube の操作画面は、それぞれの言語設定に従います。

## ローカルで実行

Node.js と npm を用意し、次を実行します。

```bash
git clone https://github.com/poloclub/cnn-explainer.git
cd cnn-explainer
npm install
npm run dev
```

[ローカルの日本語版](http://localhost:3000/?lang=ja)を開いてください。本番用ビルドと翻訳の回帰テスト：

```bash
npm run build
node tests/i18n.mjs
```

学習コードは [`tiny-vgg/`](tiny-vgg) にあります。独自モデルやクラスを使う場合は [#8](https://github.com/poloclub/cnn-explainer/issues/8) と [#14](https://github.com/poloclub/cnn-explainer/issues/14) を参照してください。

## 翻訳の保守

短い UI テキストは [`src/locales/ja.js`](src/locales/ja.js)、記事は [`src/article/Article.svelte`](src/article/Article.svelte) の日本語分岐にあります。各言語の記事はスタイル、数式、アンカー、操作処理を共有します。新しい UI テキストは `t()` で表示し、すべての言語の辞書に同じ英語キーを追加してください。翻訳がない場合は英語に戻ります。モデルの識別子、重み、クラスの順序は変更せず、表示文字列だけを翻訳します。

## 論文・開発者・ライセンス

[**CNN Explainer: Learning Convolutional Neural Networks with Interactive Visualization**](https://arxiv.org/abs/2004.15004) — Zijie J. Wang、Robert Turko、Omar Shaikh、Haekyu Park、Nilaksh Das、Fred Hohman、Minsuk Kahng、Duen Horng Chau。*IEEE Transactions on Visualization and Computer Graphics (TVCG), 2020*。

Georgia Tech と Oregon State の共同研究です。[開発者と謝辞](README.md#credits)、[BibTeX の引用情報](README.md#citation)もご覧ください。ソフトウェアは [MIT ライセンス](LICENSE)で提供されます。質問は [Issue](https://github.com/poloclub/cnn-explainer/issues/new/choose) または [Jay Wang](https://zijie.wang/) へお寄せください。
