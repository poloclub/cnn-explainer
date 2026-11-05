# CNN Explainer

[English](README.md) | 简体中文 | [日本語](README.ja.md) | [Deutsch](README.de.md)

通过交互式可视化，帮助没有专业背景的读者学习卷积神经网络（CNN）。

[![build](https://github.com/poloclub/cnn-explainer/workflows/build/badge.svg)](https://github.com/poloclub/cnn-explainer/actions)
[![arXiv](https://img.shields.io/badge/arXiv-2004.15004-red)](https://arxiv.org/abs/2004.15004)
[![DOI](https://img.shields.io/badge/DOI-10.1109/TVCG.2020.3030418-blue)](https://doi.org/10.1109/TVCG.2020.3030418)

## 在线体验

访问 [CNN Explainer](https://poloclub.github.io/cnn-explainer/)，在右上角语言选择器中选择“简体中文”，或使用地址参数 `?lang=zh-CN`。也支持日语（`?lang=ja`）和德语（`?lang=de`）。未指定语言或语言不受支持时，显示英文。

语言切换会重新加载页面，以重新绘制可视化中的文字。请注意：此功能在本次贡献合并并部署后才会出现在上游在线演示中；合并前可在本地体验。

汉化包含教学文章、图注、界面控件、错误提示、类别名称及可视化说明。ReLU、Softmax、logit 等术语保留常用英文写法。原有视频和动画图片内嵌文字仍为英文，配套说明和视频章节已翻译。第三方推荐组件及嵌入式 YouTube 播放器使用其自身的语言设置。

## 本地运行

安装 Node.js 和 npm 后，克隆本仓库并进入目录：

```bash
git clone https://github.com/poloclub/cnn-explainer.git
cd cnn-explainer
npm install
npm run dev
```

在浏览器中打开 [本地中文版](http://localhost:3000/?lang=zh-CN)。构建生产版本：

```bash
npm run build
```

模型训练代码见 [`tiny-vgg/`](tiny-vgg)。如需使用自己的模型或图像类别，请参阅 [#8](https://github.com/poloclub/cnn-explainer/issues/8) 和 [#14](https://github.com/poloclub/cnn-explainer/issues/14)。

## 翻译维护

短文本集中在 [`src/locales/`](src/locales/)，分别使用 `zh-CN.js`、`ja.js` 和 `de.js`；键为原英文文本，缺少翻译时自动回退到英文。教学正文的各语言分支位于 [`src/article/Article.svelte`](src/article/Article.svelte)，共用样式、公式及交互逻辑。请保持所有语言的章节锚点、引用链接和交互功能一致。运行 `node tests/i18n.mjs` 可检查语言回退、URL 参数保留、词典完整性及文章锚点和资源。

模型层名、文件名、数据键及类别顺序保持原样，只在显示时翻译。添加界面文字时，请调用 `t()`，并在中文词典中补充译文。

## 论文与引用

[**CNN Explainer: Learning Convolutional Neural Networks with Interactive Visualization**](https://arxiv.org/abs/2004.15004)

Zijie J. Wang、Robert Turko、Omar Shaikh、Haekyu Park、Nilaksh Das、Fred Hohman、Minsuk Kahng 和 Duen Horng Chau。发表于 *IEEE Transactions on Visualization and Computer Graphics (TVCG), 2020*。

```bibtex
@article{wangCNNExplainerLearning2020,
  title = {{{CNN Explainer}}: {{Learning Convolutional Neural Networks}} with {{Interactive Visualization}}},
  shorttitle = {{{CNN Explainer}}},
  author = {Wang, Zijie J. and Turko, Robert and Shaikh, Omar and Park, Haekyu and Das, Nilaksh and Hohman, Fred and Kahng, Minsuk and Chau, Duen Horng},
  journal={IEEE Transactions on Visualization and Computer Graphics (TVCG)},
  year={2020},
  publisher={IEEE}
}
```

## 作者与致谢

CNN Explainer 由 [Jay Wang](https://zijie.wang/)、[Robert Turko](https://www.linkedin.com/in/robert-turko/)、[Omar Shaikh](http://oshaikh.com/)、[Haekyu Park](https://haekyu.com/)、[Nilaksh Das](http://nilakshdas.com/)、[Fred Hohman](https://fredhohman.com/)、[Minsuk Kahng](http://minsuk.com) 和 [Polo Chau](https://www.cc.gatech.edu/~dchau/) 创建，是佐治亚理工学院与俄勒冈州立大学合作研究的成果。

感谢 [Anmol Chhabria](https://www.linkedin.com/in/anmolchhabria)、[Kaan Sancak](https://kaansancak.com)、[Kantwon Rogers](https://www.kantwon.com) 和[佐治亚理工学院可视化实验室](http://vis.gatech.edu)提供支持和建设性反馈。

## 许可证与联系

本软件采用 [MIT 许可证](LICENSE)。如有问题，请[提交 Issue](https://github.com/poloclub/cnn-explainer/issues/new/choose)，或联系 [Jay Wang](https://zijie.wang)。
