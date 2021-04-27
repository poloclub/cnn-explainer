# CNN Explainer

An interactive visualization system designed to help non-experts learn about Convolutional Neural Networks (CNNs)

[![build](https://github.com/poloclub/cnn-explainer/workflows/build/badge.svg)](https://github.com/poloclub/cnn-explainer/actions)
[![arxiv badge](https://img.shields.io/badge/arXiv-2004.15004-red)](http://arxiv.org/abs/2004.15004)
[![DOI:10.1109/TVCG.2020.3030418](https://img.shields.io/badge/DOI-10.1109/TVCG.2020.3030418-blue)](https://doi.org/10.1109/TVCG.2020.3030418)

<a href="https://youtu.be/HnWIHWFbuUQ" target="_blank"><img src="https://i.imgur.com/sCsudVg.png" style="max-width:100%;"></a>

For more information, check out our manuscript:

[**CNN Explainer: Learning Convolutional Neural Networks with Interactive Visualization**](https://arxiv.org/abs/2004.15004).
Wang, Zijie J., Robert Turko, Omar Shaikh, Haekyu Park, Nilaksh Das, Fred Hohman, Minsuk Kahng, and Duen Horng Chau.
*IEEE Transactions on Visualization and Computer Graphics (TVCG), 2020.*

## Live Demo

For a live demo, visit: http://poloclub.github.io/cnn-explainer/

## Running Locally

Clone or download this repository:

```bash
git clone git@github.com:poloclub/cnn-explainer.git

# use degit if you don't want to download commit histories
degit poloclub/cnn-explainer
```

Install the dependencies:

```bash
npm install
```

Then run CNN Explainer:

```bash
npm run dev
```

Navigate to [localhost:5000](https://localhost:5000). You should see CNN Explainer running in your broswer :)

To see how we trained the CNN, visit the directory [`./tiny-vgg/`](tiny-vgg).
If you want to use CNN Explainer with your own CNN model or image classes, see [#8](/../../issues/8) and [#14](/../../issues/14).

## Credits

CNN Explainer was created by 
<a href="https://zijie.wang/">Jay Wang</a>,
<a href="https://www.linkedin.com/in/robert-turko/">Robert Turko</a>, 
<a href="http://oshaikh.com/">Omar Shaikh</a>,
<a href="https://haekyu.com/">Haekyu Park</a>,
<a href="http://nilakshdas.com/">Nilaksh Das</a>,
<a href="https://fredhohman.com/">Fred Hohman</a>,
<a href="http://minsuk.com">Minsuk Kahng</a>, and
<a href="https://www.cc.gatech.edu/~dchau/">Polo Chau</a>,
which was the result of a research collaboration between 
Georgia Tech and Oregon State.

We thank
[Anmol Chhabria](https://www.linkedin.com/in/anmolchhabria),
[Kaan Sancak](https://kaansancak.com),
[Kantwon Rogers](https://www.kantwon.com), and the
[Georgia Tech Visualization Lab](http://vis.gatech.edu)
for their support and constructive feedback.

## Citation

```bibTeX
@article{wangCNNExplainerLearning2020,
  title = {{{CNN Explainer}}: {{Learning Convolutional Neural Networks}} with {{Interactive Visualization}}},
  shorttitle = {{{CNN Explainer}}},
  author = {Wang, Zijie J. and Turko, Robert and Shaikh, Omar and Park, Haekyu and Das, Nilaksh and Hohman, Fred and Kahng, Minsuk and Chau, Duen Horng},
  journal={IEEE Transactions on Visualization and Computer Graphics (TVCG)},
  year={2020},
  publisher={IEEE}
}
```

## License

The software is available under the [MIT License](https://github.com/poloclub/cnn-explainer/blob/master/LICENSE).

## Contact

If you have any questions, feel free to [open an issue](https://github.com/poloclub/cnn-explainer/issues/new/choose) or contact [Jay Wang](https://zijie.wang).
