<script>
  import { locale } from '../i18n.js';
	import HyperparameterView from '../detail-view/Hyperparameterview.svelte';
  import Youtube from './Youtube.svelte';

	let softmaxEquation = `$$\\text{Softmax}(x_{i}) = \\frac{\\exp(x_i)}{\\sum_j \\exp(x_j)}$$`;
	let reluEquation = `$$\\text{ReLU}(x) = \\max(0,x)$$`;

  let currentPlayer;
</script>

<style>
	#description {
    margin-bottom: 60px;
    margin-left: auto;
    margin-right: auto;
    max-width: 78ch;
  }

  #description h2 {
    color: #444;
    font-size: 40px;
    font-weight: 450;
    margin-bottom: 12px;
    margin-top: 60px;
  }

  #description h4 {
    color: #444;
    font-size: 32px;
    font-weight: 450;
    margin-bottom: 8px;
    margin-top: 44px;
  }

  #description h6 {
    color: #444;
    font-size: 24px;
    font-weight: 450;
    margin-bottom: 8px;
    margin-top: 44px;
  }

  #description p {
    margin: 16px 0;
  }

  #description p img {
    vertical-align: middle;
  }

  #description .figure-caption {
    font-size: 13px;
    margin-top: 5px;
  }

  #description ol {
    margin-left: 40px;
  }

  #description p, 
  #description div,
  #description li {
    color: #555;
    font-size: 17px;
    line-height: 1.6;
  }

  #description small {
    font-size: 12px;
  }

  #description ol li img {
    vertical-align: middle;
  }

  #description .video-link {
    color: #3273DC;
    cursor: pointer;
    font-weight: normal;
    text-decoration: none;
  }

  #description ul {
      list-style-type: disc;
      margin-top: -10px;
      margin-left: 40px;
      margin-bottom: 15px;
  }
    
  #description a:hover, 
  #description .video-link:hover {
    text-decoration: underline;
  }

  .figure, .video {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
</style>

{#if locale === 'zh-CN'}
<body>
  <div id="description">
    <h2>什么是卷积神经网络？</h2>
    <p>在机器学习中，分类器会为数据点分配类别标签。例如，<em>图像分类器</em>会根据图像中的物体输出类别标签（如鸟、飞机）。<em>卷积神经网络</em>（Convolutional Neural Network，简称 CNN）非常擅长解决这类分类问题！</p>
    <p>CNN 是一种神经网络，也就是用于识别数据中模式的算法。神经网络通常由分层组织的神经元组成，每个神经元都有可学习的权重和偏置。下面从基本组成部分开始认识 CNN。</p>
    <ol>
      <li><strong>张量</strong>可以理解为 n 维矩阵。上方 CNN 中，除输出层外，张量都是三维的。</li>
      <li><strong>神经元</strong>可以理解为一个接收多个输入、产生单个输出的函数。上方用<span style="color:#FF7577;">红色</span>到<span style="color:#60A7D7;">蓝色</span>的<strong>激活图</strong>表示神经元的输出。</li>
      <li><strong>层</strong>是一组执行相同运算、具有相同超参数的神经元。</li>
      <li><strong>卷积核权重和偏置</strong>在训练阶段调整，使分类器适应任务和数据集。每个神经元使用各自的参数。可视化用<span style="color:#BC8435;">黄色</span>到<span style="color:#39988F;">绿色</span>的发散色标表示这些参数。点击神经元可在<em>交互式公式视图</em>中查看具体数值，也可在<em>卷积展开解释视图</em>中将鼠标悬停于卷积核或偏置上查看。</li>
      <li>CNN 表示一个<strong>可微的评分函数</strong>，在可视化的输出层中体现为<strong>类别得分</strong>。</li>
    </ol>
    <p>如果学过神经网络，你可能已熟悉这些术语。那么 CNN 有什么不同？它使用一种特殊的层——卷积层，特别适合从图像及类似图像的数据中学习。CNN 可用于多种计算机视觉任务，例如<a href="http://ijcsit.com/docs/Volume%207/vol7issue5/ijcsit20160705014.pdf" title="CNN 的应用">图像处理、分类、分割和目标检测</a>。</p>
    <p>CNN Explainer 展示了一个简单 CNN 如何进行图像分类。网络较小，因此准确率并不完美，但适合入门学习！这里使用的 <a href="http://cs231n.stanford.edu/" title="斯坦福 CS231n 课程介绍的 Tiny VGG 网络">Tiny VGG</a> 架构包含了许多先进 CNN 使用的层和运算，只是规模更小，便于理解。</p>

      <h2>网络中每一层的作用是什么？</h2>
      <p>接下来逐层了解这个网络。阅读时，可以随时点击上方可视化中的各个部分，或将鼠标悬停其上进行探索。</p>
      <h4 id='article-input'>输入层</h4>
      <p>最左侧的输入层表示送入 CNN 的图像。这里使用 RGB 图像，因此输入层有三个通道，分别对应红、绿、蓝。点击上方的 <img class="is-rounded" width="12%" height="12%" src="PUBLIC_URL/assets/figures/network_details.png" alt="网络详情按钮"/> 按钮，即可显示本层及其他层的尺寸和色标等详细信息。</p>
      <h4 id='article-convolution'>卷积层</h4>
      <p>卷积层是 CNN 的基础。它包含训练得到的卷积核（权重），用于提取能够区分不同图像的特征，这正是分类所需的！与卷积层交互时，可以看到前一层与当前层之间的连线。每条连线表示一个独立的卷积核，通过卷积运算生成当前卷积神经元的输出，即激活图。</p>
    <p>卷积神经元将每个卷积核与前一层对应通道上的局部窗口逐元素相乘并求和。每个卷积核产生一个中间结果。将所有中间结果逐元素相加，再加上训练得到的偏置，就得到该卷积神经元的输出。</p>
    <p>以上方 Tiny VGG 的第一个卷积层为例：本层有 10 个神经元，前一层有 3 个。这里的卷积层与前一层的所有通道相连，每个神经元都接收前一层全部神经元的输出。将鼠标悬停于第一个卷积层最上方的激活图，可以看到它使用了 3 个不同的卷积核。</p>
    <div class="figure">
      <img src="PUBLIC_URL/assets/figures/convlayer_overview_demo.gif" alt="点击第一个卷积层最上方的激活图" width=60% height=60% align="middle"/>
      <div class="figure-caption">图 1：将鼠标悬停于第一个卷积层最上方的激活图，可以看到生成它所用的 3 个卷积核。点击激活图，可查看各卷积核的卷积运算。</div>
    </div>

    <p>卷积核尺寸是网络架构设计者指定的超参数。为了生成激活图，需要将网络学到的卷积核与前一层输出的局部窗口逐元素相乘并求和。Tiny VGG 使用步幅 1，即每次运算后卷积核移动 1 个像素。设计者可以调整步幅，以适应数据集。对全部 3 个卷积核分别执行此操作，就得到 3 个中间结果。</p>
    <div class="figure">
      <img src="PUBLIC_URL/assets/figures/convlayer_detailedview_demo.gif" alt="点击第一个卷积层最上方的激活图" />
      <div class="figure-caption">图 2：卷积核作用于输入，生成上述激活图最上方的中间结果。</div>
    </div>
    <p>然后将这 3 个中间结果逐元素相加，再加上网络学到的偏置。所得二维张量就是上方第一个卷积层最上方神经元的激活图。每个神经元的激活图都通过同样的过程生成。</p>
    <p>因此，第一个卷积层一共使用 3 × 10 = 30 个不同的卷积核，每个尺寸为 3 × 3。卷积层与前一层的连接方式是网络架构设计的一部分，会影响卷积核数量。试着点击可视化中的不同位置，跟随上面的例子理解卷积运算！</p>
    <h6>理解超参数</h6>
    <p><HyperparameterView/></p>
    <ol>
      <li><strong>填充（Padding）</strong>通常用于处理卷积核超出激活图边界的情况。填充有助于保留边缘信息，并可<a href="https://arxiv.org/pdf/1603.07285.pdf" title="参见第 13 页">保持输入的空间尺寸</a>，从而构建更深的网络。虽然有<a href="https://arxiv.org/pdf/1811.11718.pdf" title="主要填充方法概述">多种填充方法</a>，但零填充因简单、高效而最为常见。它在输入边缘对称地补零。<a href="https://papers.nips.cc/paper/4824-imagenet-classification-with-deep-convolutional-neural-networks.pdf" title="AlexNet">AlexNet</a> 等高性能 CNN 都采用了这种方法。</li>
      <li><strong>卷积核尺寸（Kernel size）</strong>也称滤波器尺寸，指在输入上滑动的窗口大小。这一超参数对图像分类有很大影响。较小的卷积核能够提取细致的局部特征；在上方可视化中，它也使每层的空间尺寸缩小得较少，从而允许堆叠更深的网络。较大的卷积核覆盖范围更大，适合提取较大尺度的特征，但在此设置下会更快地减小输出尺寸。最终应根据任务和数据集选择尺寸。图像分类中，小卷积核通常有利于<a href="https://arxiv.org/pdf/1409.1556.pdf" title="了解深层网络为何有效">堆叠更多层，学习更复杂的特征</a>。</li>
      <li><strong>步幅（Stride）</strong>表示卷积核每次移动的像素数。例如 Tiny VGG 的卷积层使用步幅 1：先在输入的 3 × 3 窗口上逐元素相乘并求和，得到一个输出值，再向右移动一个像素进行下一次运算。步幅越小，采样的位置越多，输出空间尺寸也越大；步幅越大，采样越稀疏，输出尺寸越小。设计者还需确保卷积核能够按所选步幅对齐输入边界。尝试在上方交互演示中改变输入尺寸、卷积核尺寸和步幅，理解这一约束！</li>
    </ol>
    <h4>激活函数</h4>
    <h6 id='article-relu'>ReLU</h6>
    <p>神经网络在现代技术中广泛应用。深层 CNN 能够逐层学习更多特征，而其<a href="https://arxiv.org/pdf/1512.03385.pdf" title="ResNet">高准确率</a>的一个重要来源是非线性。ReLU 为模型引入非线性，使其能够表示非线性的决策边界。如果没有非线性激活函数，多个线性层的组合仍然是线性变换，无法获得同样的表达能力。与 <em>Sigmoid</em> 等其他非线性函数相比，<a href="https://arxiv.org/pdf/1906.01975.pdf" title="参见第 29 页">实验表明</a>，使用 ReLU 的 CNN 通常训练得更快。</p>
    <p>ReLU 激活函数对每个元素执行以下数学运算：{reluEquation}</p>
    <div class="figure">
    <img src="PUBLIC_URL/assets/figures/relu_graph.png" alt="ReLU 函数图像" width="30%" height="30%"/>
      <div class="figure-caption">图 3：ReLU 激活函数将所有负值置为 0。</div>
    </div>
    <p>ReLU 逐元素作用于输入张量。例如，输入 2.24 时，因为它大于 0，输出仍是 2.24；负值则变为 0。点击上方网络中的 ReLU 神经元即可观察这一过程。在这里的架构中，每个卷积层之后都使用整流线性单元（ReLU）。留意它如何改变不同神经元的激活图！</p>
    <h6 id='article-softmax'>Softmax</h6>
    <p>{softmaxEquation} Softmax 的关键作用是让输出之和为 1，从而把模型得分转换为类别概率。点击最后一层即可查看这一运算。注意，展平后的 logit（未归一化的标量得分）并不限定在 0 到 1 之间。它们使用<span style="color:#FFC385;">浅橙色</span>到<span style="color:#C44103;">深橙色</span>的色标表示。经过 Softmax 后，每个类别就对应一个概率！</p>
    <p>普通归一化和 Softmax 有何不同？两者都能将数值调整到 0 到 1 的范围。训练神经网络时需要反向传播，我们希望正确类别拥有较强的信号。Softmax 可以看作 argmax 的一种平滑、可微替代：它通过指数运算突出较大的 logit，而简单的线性缩放不会产生同样的效果。</p>
    <div class="figure">
    <img src="PUBLIC_URL/assets/figures/softmax_animation.gif" alt="Softmax 交互式公式视图"/>
      <div class="figure-caption">图 4：在 Softmax 交互式公式视图中，可探索用颜色表示的 logit 及公式，理解类别得分如何归一化为概率。</div>
    </div>
    <h4 id='article-pooling'>池化层</h4>
    <p>不同 CNN 架构有多种池化层，它们都用于逐步减小特征图的空间尺寸，降低后续网络的参数数量和计算量。上方 Tiny VGG 使用的是最大池化（Max-Pooling）。</p>
    <p>设计最大池化层时，需要指定窗口尺寸和步幅。窗口按给定步幅在输入上滑动，每次只保留窗口中的最大值作为输出。点击上方网络中的池化神经元，可以查看这一过程。</p>
    <p>这里的 Tiny VGG 使用 2 × 2 窗口和步幅 2，每个窗口保留一个最大值，使激活值数量减少 75%。这提高了计算效率，也有助于减轻过拟合。</p>
    <h4 id='article-flatten'>展平层</h4>
    <p>展平层将三维张量转换为一维向量，以适配用于分类的全连接层。例如，5 × 5 × 2 的张量会转换成长度为 50 的向量。前面的卷积层从图像中提取特征，接下来需要据此进行分类：展平后的特征送入全连接层计算类别得分，再由 Softmax 转换为概率。点击任意输出类别即可查看这一层。</p>

    <h2>交互功能</h2>
    <ol>
      <li><strong>上传自己的图像：</strong>点击 <img class="icon is-rounded" src="PUBLIC_URL/assets/figures/upload_image_icon.png" alt="上传图像按钮"/>，观察图像如何被分到 10 个类别中。探索网络中的神经元，可以理解激活图和提取的特征。</li>
      <li><strong>更改激活图色标：</strong>调整 <img class="is-rounded" width="12%" height="12%" src="PUBLIC_URL/assets/figures/heatmap_scale.png" alt="色标范围选择器"/>，比较不同抽象层次上的激活值。</li>
      <li><strong>了解网络详情：</strong>点击 <img class="is-rounded" width="12%" height="12%" src="PUBLIC_URL/assets/figures/network_details.png" alt="网络详情按钮"/>，查看各层尺寸和色标等信息。</li>
      <li><strong>模拟网络运算：</strong>点击 <img class="icon is-rounded" src="PUBLIC_URL/assets/figures/play_button.png" alt="播放按钮"/> 播放动画，或在<em>交互式公式视图</em>中将鼠标悬停于输入或输出区域，理解它们之间的映射和运算。</li>
      <li><strong>学习各层功能：</strong>点击<em>交互式公式视图</em>中的 <img class="icon is-rounded" src="PUBLIC_URL/assets/figures/info_button.png" alt="说明按钮"/>，跳转到文章对应章节。</li>
    </ol>

    <h2>视频教程（英文）</h2>
    <ul>
      <li class="video-link" on:click={currentPlayer.play(0)}>CNN Explainer 简介 <small>(0:00–0:22)</small></li>
      <li class="video-link" on:click={currentPlayer.play(27)}><em>概览</em> <small>(0:27–0:37)</small></li>
      <li class="video-link" on:click={currentPlayer.play(37)}>卷积<em>展开解释视图</em> <small>(0:37–0:46)</small></li>
      <li class="video-link" on:click={currentPlayer.play(46)}>卷积、ReLU 与池化的<em>交互式公式视图</em> <small>(0:46–1:21)</small></li>
      <li class="video-link" on:click={currentPlayer.play(82)}>展平<em>展开解释视图</em> <small>(1:22–1:41)</small></li>
      <li class="video-link" on:click={currentPlayer.play(101)}>Softmax <em>交互式公式视图</em> <small>(1:41–2:02)</small></li>
      <li class="video-link" on:click={currentPlayer.play(126)}>交互学习：理解分类 <small>(2:06–2:28)</small></li>
      <li class="video-link" on:click={currentPlayer.play(149)}>交互式教学文章 <small>(2:29–2:54)</small></li>
    </ul>
    <div class="video">
      <Youtube videoId="HnWIHWFbuUQ" playerId="demo_video" bind:this={currentPlayer}/>
    </div>

    <h2>CNN Explainer 是如何实现的？</h2>
    <p>CNN Explainer 使用支持浏览器内 GPU 加速的深度学习库 <a href="https://js.tensorflow.org/"><em>TensorFlow.js</em></a>，加载预训练模型并进行可视化。整个交互系统用 JavaScript 编写，采用 <a href="https://svelte.dev/"><em>Svelte</em></a> 框架和 <a href="https://d3js.org/"><em>D3.js</em></a> 可视化库。只需一个浏览器，就可以开始学习 CNN！</p>

    <h2>谁开发了 CNN Explainer？</h2>
    <p>CNN Explainer 由 <a href="https://zijie.wang/">Jay Wang</a>、<a href="https://www.linkedin.com/in/robert-turko/">Robert Turko</a>、<a href="http://oshaikh.com/">Omar Shaikh</a>、<a href="https://haekyu.com/">Haekyu Park</a>、<a href="http://nilakshdas.com/">Nilaksh Das</a>、<a href="https://fredhohman.com/">Fred Hohman</a>、<a href="http://minsuk.com">Minsuk Kahng</a> 和 <a href="https://www.cc.gatech.edu/~dchau/">Polo Chau</a> 创建，是佐治亚理工学院与俄勒冈州立大学合作研究的成果。感谢 Anmol Chhabria、Kaan Sancak、Kantwon Rogers 和佐治亚理工学院可视化实验室的支持与建设性反馈。本研究部分受 NSF 项目 IIS-1563816、CNS-1704701、NASA NSTRF、DARPA GARD，以及 Intel、NVIDIA、Google 和 Amazon 的资助。</p>
  </div>
</body>

{:else if locale === 'ja'}
<body>
  <div id="description">
    <h2>畳み込みニューラルネットワークとは？</h2>
    <p>機械学習では、分類器がデータにクラスラベルを割り当てます。例えば、<em>画像分類器</em>は画像に写る物体に応じて、鳥や飛行機などのラベルを出力します。<em>畳み込みニューラルネットワーク</em>（Convolutional Neural Network、CNN）は、このような画像分類を得意とするニューラルネットワークです。</p>
    <p>CNN は、データに含まれるパターンを認識するアルゴリズムです。ニューラルネットワークは通常、層状に並ぶニューロンで構成され、それぞれが学習可能な重みとバイアスを持ちます。まず基本的な構成要素を見てみましょう。</p>
    <ol>
      <li><strong>テンソル</strong>は、n 次元の行列と考えられます。上の CNN では、出力層以外のテンソルは三次元です。</li>
      <li><strong>ニューロン</strong>は、複数の入力を受け取り、出力を生成する関数と考えられます。上の図では、ニューロンの出力を赤から青の色で示す<strong>活性化マップ</strong>として表しています。</li>
      <li><strong>層</strong>は、同じ演算を行い、同じハイパーパラメーターを持つニューロンの集まりです。</li>
      <li><strong>カーネルの重みとバイアス</strong>は、学習時に調整され、分類器がタスクやデータセットに適応できるようにします。各ニューロンは独自のパラメーターを使います。図では黄色から緑の発散カラースケールで表しています。ニューロンをクリックすると<em>対話型数式ビュー</em>で値を確認できます。<em>畳み込みの展開説明ビュー</em>でカーネルやバイアスにマウスを重ねても確認できます。</li>
      <li>CNN は<strong>微分可能なスコア関数</strong>を表します。出力層では、それを<strong>クラスごとのスコア</strong>として表示しています。</li>
    </ol>
    <p>ニューラルネットワークを学んだことがあれば、これらの用語はおなじみかもしれません。CNN の特徴は、画像や画像に似たデータから学ぶのに適した畳み込み層を使うことです。CNN は、<a href="http://ijcsit.com/docs/Volume%207/vol7issue5/ijcsit20160705014.pdf">画像処理、分類、領域分割、物体検出</a>など、さまざまなコンピュータービジョンのタスクに利用されます。</p>
    <p>CNN Explainer では、小さな CNN による画像分類を観察できます。小規模なので精度は完璧ではありませんが、入門には適しています。ここで使う <a href="http://cs231n.stanford.edu/">Tiny VGG</a> は、高性能な CNN と共通する層や演算を小さな規模で備え、仕組みを理解しやすくしています。</p>

      <h2>ネットワークの各層は何をするのか？</h2>
      <p>ネットワークを一層ずつ見ていきましょう。読みながら上の図をクリックしたり、マウスを重ねたりして、自由に操作してください。</p>
      <h4 id='article-input'>入力層</h4>
      <p>左端の入力層は、CNN に入力する画像を表します。RGB 画像を使うため、入力には赤・緑・青に対応する三つのチャネルがあります。上の <img class="is-rounded" width="12%" height="12%" src="PUBLIC_URL/assets/figures/network_details.png" alt="ネットワーク詳細ボタン"/> ボタンをクリックすると、この層や他の層のサイズ、カラースケールなどの詳細を表示できます。</p>
      <h4 id='article-convolution'>畳み込み層</h4>
      <p>畳み込み層は CNN の基盤です。学習済みのカーネル（重み）を使い、画像を区別するための特徴を抽出します。畳み込み層を操作すると、前の層からの接続が表示されます。各接続は異なるカーネルを表し、畳み込み演算によって現在のニューロンの出力、すなわち活性化マップを生成します。</p>
    <p>各カーネルと、前の層の対応するチャネルにある局所領域を要素ごとに掛け合わせ、その和を求めます。カーネルごとに一つの中間結果が得られます。すべての中間結果を要素ごとに足し、学習済みのバイアスを加えると、畳み込みニューロンの出力になります。</p>
    <p>上の Tiny VGG の最初の畳み込み層には 10 個のニューロンがあり、前の層には 3 個あります。このネットワークでは、各畳み込みニューロンは前の層の全チャネルと接続しています。最初の畳み込み層の一番上の活性化マップにマウスを重ねると、三つの異なるカーネルが使われていることが分かります。</p>
    <div class="figure">
      <img src="PUBLIC_URL/assets/figures/convlayer_overview_demo.gif" alt="最初の畳み込み層の一番上の活性化マップを選択" width=60% height=60% align="middle"/>
      <div class="figure-caption">図 1：最初の畳み込み層の一番上の活性化マップにマウスを重ねると、三つのカーネルが表示されます。クリックすると、それぞれの畳み込み演算を確認できます。</div>
    </div>

    <p>カーネルサイズは、ネットワークの設計者が指定するハイパーパラメーターです。活性化マップを生成するには、学習済みカーネルと前の層の局所領域を要素ごとに掛け合わせ、和を求めます。Tiny VGG のストライドは 1 なので、演算のたびにカーネルを 1 ピクセル動かします。ストライドはデータに合わせて調整できます。三つのカーネルすべてにこの操作を行い、三つの中間結果を得ます。</p>
    <div class="figure">
      <img src="PUBLIC_URL/assets/figures/convlayer_detailedview_demo.gif" alt="最初の畳み込み層の一番上の活性化マップを選択" />
      <div class="figure-caption">図 2：入力にカーネルを適用し、対象の活性化マップの一番上の中間結果を計算しています。</div>
    </div>
    <p>次に、三つの中間結果を要素ごとに足し、学習したバイアスを加えます。得られた二次元テンソルが、最初の畳み込み層の一番上のニューロンの活性化マップです。他のニューロンの活性化マップも同じ方法で生成します。</p>
    <p>したがって、最初の畳み込み層では、3 × 3 のカーネルを 3 × 10 = 30 個使います。前の層との接続方法はネットワーク設計の一部であり、必要なカーネル数に影響します。図のさまざまな部分をクリックし、上の例をたどって畳み込み演算を確認してみましょう。</p>
    <h6>ハイパーパラメーターを理解する</h6>
    <p><HyperparameterView/></p>
    <ol>
      <li><strong>パディング（Padding）</strong>は、カーネルが活性化マップの境界を越える場合に使います。境界付近の情報を保持し、<a href="https://arxiv.org/pdf/1603.07285.pdf">入力の空間サイズを維持する</a>のに役立つため、より深いネットワークを設計できます。<a href="https://arxiv.org/pdf/1811.11718.pdf">さまざまな方法</a>がありますが、簡単で計算効率のよいゼロパディングが広く使われます。入力の周囲に対称にゼロを追加する方法で、<a href="https://papers.nips.cc/paper/4824-imagenet-classification-with-deep-convolutional-neural-networks.pdf">AlexNet</a> などでも採用されています。</li>
      <li><strong>カーネルサイズ（Kernel size）</strong>はフィルターサイズとも呼ばれ、入力上を動く窓の大きさです。小さいカーネルは細かな局所特徴を捉えます。上の例では出力サイズの減少も小さいため、層を深く重ねられます。大きいカーネルは広い範囲の特徴に適しますが、この設定では空間サイズを速く縮小します。タスクやデータセットに合わせて選ぶ必要があります。画像分類では小さいカーネルにより、<a href="https://arxiv.org/pdf/1409.1556.pdf">多くの層を重ねて複雑な特徴を学習</a>しやすくなります。</li>
      <li><strong>ストライド（Stride）</strong>は、カーネルを一度に動かすピクセル数です。Tiny VGG の畳み込み層はストライド 1 を使います。3 × 3 の領域で積和を計算し、次の演算では右へ 1 ピクセル動かします。小さいストライドでは多くの位置から情報を取り出せるため、出力の空間サイズも大きくなります。大きいストライドでは位置の間隔が広がり、出力が小さくなります。設計時には、選んだストライドで窓が入力の境界に適切に揃うことも確認します。上のデモで入力サイズ、カーネルサイズ、ストライドを変えてみましょう。</li>
    </ol>
    <h4>活性化関数</h4>
    <h6 id='article-relu'>ReLU</h6>
    <p>深い CNN は、層を重ねることで多くの特徴を学習します。その<a href="https://arxiv.org/pdf/1512.03385.pdf">高い精度</a>を支える重要な要素が非線形性です。ReLU は非線形性を導入し、非線形な決定境界を表現できるようにします。非線形な活性化関数がなければ、線形な層をいくつ重ねても全体は線形変換のままです。また、<em>Sigmoid</em> などと比べ、ReLU を使う CNN は通常より速く学習できることが<a href="https://arxiv.org/pdf/1906.01975.pdf">実験で示されています</a>。</p>
    <p>ReLU 活性化関数は、各要素に次の演算を行います：{reluEquation}</p>
    <div class="figure">
    <img src="PUBLIC_URL/assets/figures/relu_graph.png" alt="ReLU 関数のグラフ" width="30%" height="30%"/>
      <div class="figure-caption">図 3：ReLU 活性化関数は、すべての負の値を 0 にします。</div>
    </div>
    <p>ReLU は入力テンソルの各要素に作用します。例えば 2.24 は 0 より大きいので出力も 2.24 です。負の値は 0 になります。上の ReLU ニューロンをクリックすると、この操作を観察できます。このネットワークでは各畳み込み層の後に ReLU（整流線形ユニット）を適用します。活性化マップがどのように変わるか確認してください。</p>
    <h6 id='article-softmax'>Softmax</h6>
    <p>{softmaxEquation} Softmax は、出力の合計が 1 になるようにスコアを変換し、クラス確率として扱えるようにします。最後の層をクリックすると演算を確認できます。平坦化後の logit（正規化前のスカラー値）は、0 から 1 の間に制限されていません。薄いオレンジから濃いオレンジのカラースケールで表しています。Softmax を通すと、各クラスに確率が対応します。</p>
    <p>通常の正規化と Softmax はどう違うのでしょうか。どちらも値を 0 から 1 の範囲に調整できますが、学習では誤差逆伝播のために微分可能な関数が必要です。Softmax は argmax の滑らかで微分可能な代わりとして考えられます。指数関数によって大きな logit を強調する点が、単純な線形スケーリングと異なります。</p>
    <div class="figure">
    <img src="PUBLIC_URL/assets/figures/softmax_animation.gif" alt="Softmax の対話型数式ビュー"/>
      <div class="figure-caption">図 4：Softmax の対話型数式ビューでは、色で表した logit と数式を操作し、クラススコアが確率に変換される仕組みを学べます。</div>
    </div>
    <h4 id='article-pooling'>プーリング層</h4>
    <p>プーリングにはいくつかの種類がありますが、いずれも特徴マップの空間サイズを徐々に小さくし、後続の層のパラメーター数や計算量を減らします。上の Tiny VGG は最大プーリング（Max-Pooling）を使います。</p>
    <p>最大プーリングでは、窓のサイズとストライドを指定します。窓を入力上で動かし、各窓内の最大値だけを出力します。上のプーリングニューロンをクリックすると、この操作を観察できます。</p>
    <p>ここでは 2 × 2 の窓とストライド 2 を使い、各領域で最大値を一つ残すため、活性化値の数は 75% 減少します。これにより計算効率が上がり、過学習の抑制にも役立ちます。</p>
    <h4 id='article-flatten'>平坦化層</h4>
    <p>平坦化層（Flatten）は、三次元テンソルを一次元ベクトルに変換し、分類に使う全結合層へ渡します。例えば 5 × 5 × 2 のテンソルは長さ 50 のベクトルになります。畳み込み層が抽出した特徴を平坦化し、全結合層でクラスごとのスコアを計算した後、Softmax で確率に変換します。出力クラスをクリックすると、この層を確認できます。</p>

    <h2>対話機能</h2>
    <ol>
      <li><strong>自分の画像をアップロード：</strong><img class="icon is-rounded" src="PUBLIC_URL/assets/figures/upload_image_icon.png" alt="画像アップロードボタン"/> をクリックし、画像が 10 クラスのどれに分類されるかを確認できます。ニューロンを調べることで、活性化マップや抽出した特徴を理解できます。</li>
      <li><strong>活性化マップのカラースケールを変更：</strong><img class="is-rounded" width="12%" height="12%" src="PUBLIC_URL/assets/figures/heatmap_scale.png" alt="カラースケール範囲の選択"/> を調整し、異なる抽象度での活性化値を比較できます。</li>
      <li><strong>ネットワークの詳細を確認：</strong><img class="is-rounded" width="12%" height="12%" src="PUBLIC_URL/assets/figures/network_details.png" alt="ネットワーク詳細ボタン"/> をクリックすると、層のサイズやカラースケールを表示できます。</li>
      <li><strong>演算をシミュレーション：</strong><img class="icon is-rounded" src="PUBLIC_URL/assets/figures/play_button.png" alt="再生ボタン"/> でアニメーションを再生できます。<em>対話型数式ビュー</em>で入力や出力にマウスを重ねると、それぞれの対応関係や演算を確認できます。</li>
      <li><strong>各層の役割を学習：</strong><em>対話型数式ビュー</em>の <img class="icon is-rounded" src="PUBLIC_URL/assets/figures/info_button.png" alt="説明ボタン"/> をクリックすると、記事の該当箇所に移動します。</li>
    </ol>

    <h2>動画チュートリアル（英語）</h2>
    <ul>
      <li class="video-link" on:click={currentPlayer.play(0)}>CNN Explainer の紹介 <small>(0:00–0:22)</small></li>
      <li class="video-link" on:click={currentPlayer.play(27)}><em>概要</em> <small>(0:27–0:37)</small></li>
      <li class="video-link" on:click={currentPlayer.play(37)}>畳み込みの<em>展開説明ビュー</em> <small>(0:37–0:46)</small></li>
      <li class="video-link" on:click={currentPlayer.play(46)}>畳み込み・ReLU・プーリングの<em>対話型数式ビュー</em> <small>(0:46–1:21)</small></li>
      <li class="video-link" on:click={currentPlayer.play(82)}>平坦化の<em>展開説明ビュー</em> <small>(1:22–1:41)</small></li>
      <li class="video-link" on:click={currentPlayer.play(101)}>Softmax の<em>対話型数式ビュー</em> <small>(1:41–2:02)</small></li>
      <li class="video-link" on:click={currentPlayer.play(126)}>対話しながら分類を理解する <small>(2:06–2:28)</small></li>
      <li class="video-link" on:click={currentPlayer.play(149)}>対話型チュートリアル記事 <small>(2:29–2:54)</small></li>
    </ul>
    <div class="video">
      <Youtube videoId="HnWIHWFbuUQ" playerId="demo_video" bind:this={currentPlayer}/>
    </div>

    <h2>CNN Explainer はどのように実装されているのか？</h2>
    <p>CNN Explainer は、ブラウザー内で GPU による高速化が可能な深層学習ライブラリー <a href="https://js.tensorflow.org/">TensorFlow.js</a> を使い、学習済みモデルを読み込んで可視化します。システムは JavaScript で記述され、<a href="https://svelte.dev/">Svelte</a> をフレームワークに、<a href="https://d3js.org/">D3.js</a> を可視化に使用しています。ブラウザーがあれば CNN の学習を始められます。</p>

    <h2>CNN Explainer の開発者</h2>
    <p>CNN Explainer は <a href="https://zijie.wang/">Jay Wang</a>、<a href="https://www.linkedin.com/in/robert-turko/">Robert Turko</a>、<a href="http://oshaikh.com/">Omar Shaikh</a>、<a href="https://haekyu.com/">Haekyu Park</a>、<a href="http://nilakshdas.com/">Nilaksh Das</a>、<a href="https://fredhohman.com/">Fred Hohman</a>、<a href="http://minsuk.com">Minsuk Kahng</a>、<a href="https://www.cc.gatech.edu/~dchau/">Polo Chau</a> が制作した、ジョージア工科大学とオレゴン州立大学の共同研究の成果です。Anmol Chhabria、Kaan Sancak、Kantwon Rogers、ジョージア工科大学可視化研究室の支援と建設的な意見に感謝します。本研究は NSF 助成 IIS-1563816、CNS-1704701、NASA NSTRF、DARPA GARD、および Intel、NVIDIA、Google、Amazon からの支援を一部受けています。</p>
  </div>
</body>

{:else if locale === 'de'}
<body>
  <div id="description">
    <h2>Was ist ein Convolutional Neural Network?</h2>
    <p>Beim maschinellen Lernen weist ein Klassifikator einem Datenpunkt eine Klasse zu. Ein <em>Bildklassifikator</em> erkennt zum Beispiel, ob ein Bild einen Vogel oder ein Flugzeug zeigt. Ein <em>Convolutional Neural Network</em> (CNN), auf Deutsch ein faltendes neuronales Netz, eignet sich besonders gut für solche Aufgaben.</p>
    <p>Ein CNN ist ein neuronales Netz: ein Algorithmus, der Muster in Daten erkennt. Solche Netze bestehen gewöhnlich aus Neuronen, die in Schichten angeordnet sind und lernbare Gewichte und Bias-Werte besitzen. Betrachten wir zunächst die Grundbausteine.</p>
    <ol>
      <li>Ein <strong>Tensor</strong> lässt sich als n-dimensionale Matrix verstehen. Im Netz oben sind die Tensoren mit Ausnahme der Ausgabeschicht dreidimensional.</li>
      <li>Ein <strong>Neuron</strong> lässt sich als Funktion verstehen, die mehrere Eingaben verarbeitet und eine Ausgabe erzeugt. Oben werden die Ausgaben als rot bis blau eingefärbte <strong>Aktivierungskarten</strong> dargestellt.</li>
      <li>Eine <strong>Schicht</strong> ist eine Gruppe von Neuronen, die dieselbe Operation mit denselben Hyperparametern ausführen.</li>
      <li><strong>Kernelgewichte und Bias-Werte</strong> werden beim Training angepasst, damit der Klassifikator die Aufgabe und den Datensatz erlernen kann. Jedes Neuron verwendet eigene Parameter. Sie werden durch eine divergierende Farbskala von Gelb bis Grün dargestellt. Ein Klick auf ein Neuron zeigt konkrete Werte in der <em>interaktiven Formelansicht</em>. Auch in der <em>aufgeklappten Faltungsansicht</em> lassen sich Werte durch Überfahren von Kernel oder Bias anzeigen.</li>
      <li>Ein CNN stellt eine <strong>differenzierbare Bewertungsfunktion</strong> dar. Ihre Ergebnisse erscheinen in der Ausgabeschicht als <strong>Klassenwerte</strong>.</li>
    </ol>
    <p>Wer neuronale Netze kennt, hat diese Begriffe möglicherweise schon gehört. Was zeichnet ein CNN aus? Es nutzt Faltungsschichten, die sich besonders zum Lernen aus Bildern und ähnlichen Daten eignen. Einsatzgebiete sind etwa <a href="http://ijcsit.com/docs/Volume%207/vol7issue5/ijcsit20160705014.pdf">Bildverarbeitung, Klassifikation, Segmentierung und Objekterkennung</a>.</p>
    <p>CNN Explainer zeigt, wie ein kleines CNN Bilder klassifiziert. Seine Genauigkeit ist begrenzt, doch gerade die geringe Größe erleichtert den Einstieg. Die Architektur <a href="http://cs231n.stanford.edu/">Tiny VGG</a> enthält viele Schichten und Operationen, die auch größere leistungsfähige CNNs verwenden, nur in kleinerem Maßstab.</p>

      <h2>Welche Aufgabe hat jede Schicht?</h2>
      <p>Gehen wir die Schichten nacheinander durch. Klicken Sie beim Lesen auf Teile der Visualisierung oder bewegen Sie die Maus darüber, um die Operationen zu erkunden.</p>
      <h4 id='article-input'>Eingabeschicht</h4>
      <p>Die Schicht ganz links zeigt das Eingabebild des CNN. Da wir RGB-Bilder verwenden, besitzt sie drei Kanäle für Rot, Grün und Blau. Klicken Sie oben auf <img class="is-rounded" width="12%" height="12%" src="PUBLIC_URL/assets/figures/network_details.png" alt="Netzwerkdetails"/>, um Größenangaben und Farbskalen für diese und andere Schichten einzublenden.</p>
      <h4 id='article-convolution'>Faltungsschichten</h4>
      <p>Faltungsschichten bilden die Grundlage eines CNN. Sie verwenden gelernte Kernel (Gewichte), um Merkmale zu extrahieren, die Bilder voneinander unterscheiden. Beim Erkunden sehen Sie Verbindungen von der vorherigen zur aktuellen Schicht. Jede Verbindung steht für einen eigenen Kernel, dessen Faltung zur Ausgabe beziehungsweise Aktivierungskarte des aktuellen Neurons beiträgt.</p>
    <p>Jeder Kernel wird elementweise mit einem lokalen Ausschnitt des zugehörigen Eingabekanals multipliziert; anschließend werden die Produkte summiert. Pro Kernel entsteht ein Zwischenergebnis. Die elementweise Summe aller Zwischenergebnisse zuzüglich des gelernten Bias ergibt die Ausgabe des Faltungsneurons.</p>
    <p>Die erste Faltungsschicht von Tiny VGG besitzt 10 Neuronen, die vorherige Schicht 3. Jedes Faltungsneuron ist hier mit allen Kanälen der vorherigen Schicht verbunden. Wenn Sie die oberste Aktivierungskarte der ersten Faltungsschicht mit der Maus überfahren, sehen Sie die drei verschiedenen Kernel, die dafür verwendet werden.</p>
    <div class="figure">
      <img src="PUBLIC_URL/assets/figures/convlayer_overview_demo.gif" alt="Auswahl der obersten Aktivierungskarte der ersten Faltungsschicht" width=60% height=60% align="middle"/>
      <div class="figure-caption">Abbildung 1: Beim Überfahren der obersten Aktivierungskarte in der ersten Faltungsschicht erscheinen die drei beteiligten Kernel. Ein Klick zeigt die jeweilige Faltungsoperation.</div>
    </div>

    <p>Die Kernelgröße ist ein Hyperparameter, den die Architektur festlegt. Zur Berechnung einer Aktivierungskarte wird jeder gelernte Kernel über lokale Bereiche der vorherigen Ausgabe geschoben und dort die Summe der elementweisen Produkte gebildet. Tiny VGG verwendet die Schrittweite 1: Der Kernel bewegt sich jeweils um einen Pixel. Diese Schrittweite kann an den Datensatz angepasst werden. Drei Kernel liefern hier drei Zwischenergebnisse.</p>
    <div class="figure">
      <img src="PUBLIC_URL/assets/figures/convlayer_detailedview_demo.gif" alt="Auswahl der obersten Aktivierungskarte der ersten Faltungsschicht" />
      <div class="figure-caption">Abbildung 2: Ein Kernel wird auf die Eingabe angewendet und erzeugt das oberste Zwischenergebnis für die betrachtete Aktivierungskarte.</div>
    </div>
    <p>Anschließend werden die drei Zwischenergebnisse elementweise addiert und um den gelernten Bias ergänzt. Der entstehende zweidimensionale Tensor ist die Aktivierungskarte des obersten Neurons in der ersten Faltungsschicht. Die anderen Aktivierungskarten entstehen auf dieselbe Weise.</p>
    <p>Insgesamt verwendet die erste Faltungsschicht also 3 × 10 = 30 verschiedene Kernel der Größe 3 × 3. Die Verbindungen zur vorherigen Schicht sind eine Architekturentscheidung und bestimmen die Anzahl der Kernel mit. Erkunden Sie die Visualisierung und verfolgen Sie das Beispiel Schritt für Schritt.</p>
    <h6>Hyperparameter verstehen</h6>
    <p><HyperparameterView/></p>
    <ol>
      <li><strong>Padding</strong> wird verwendet, wenn ein Kernel über die Grenzen der Aktivierungskarte hinausreichen würde. Es hilft, Randinformationen zu erhalten und die <a href="https://arxiv.org/pdf/1603.07285.pdf">räumliche Größe der Eingabe beizubehalten</a>, sodass tiefere Netze möglich werden. Es gibt <a href="https://arxiv.org/pdf/1811.11718.pdf">verschiedene Padding-Verfahren</a>. Häufig wird wegen seiner Einfachheit und Effizienz Zero-Padding eingesetzt: Dabei werden symmetrisch Nullen um die Eingabe ergänzt. Auch <a href="https://papers.nips.cc/paper/4824-imagenet-classification-with-deep-convolutional-neural-networks.pdf">AlexNet</a> verwendet dieses Verfahren.</li>
      <li>Die <strong>Kernelgröße</strong>, auch Filtergröße genannt, beschreibt die Abmessungen des gleitenden Fensters. Kleine Kernel erfassen feine lokale Merkmale. Im Beispiel oben verkleinern sie die räumlichen Abmessungen weniger stark, sodass mehr Schichten möglich sind. Größere Kernel erfassen größere Strukturen, reduzieren hier aber die räumliche Größe schneller. Die Wahl hängt von Aufgabe und Datensatz ab. Kleine Kernel ermöglichen bei der Bildklassifikation häufig, <a href="https://arxiv.org/pdf/1409.1556.pdf">mehr Schichten zu kombinieren und komplexere Merkmale zu lernen</a>.</li>
      <li>Die <strong>Schrittweite (Stride)</strong> gibt an, um wie viele Pixel sich der Kernel pro Schritt bewegt. Tiny VGG verwendet in den Faltungsschichten die Schrittweite 1: Nach der Berechnung eines Wertes im 3 × 3-Fenster wird dieses um einen Pixel nach rechts verschoben. Eine kleine Schrittweite tastet mehr Positionen ab und erzeugt größere Ausgaben. Eine große Schrittweite erfasst weniger Positionen und erzeugt kleinere Ausgaben. Beim Entwurf ist außerdem auf eine passende Ausrichtung an den Eingaberändern zu achten. Verändern Sie oben Eingabegröße, Kernelgröße und Schrittweite, um diesen Zusammenhang zu erkunden.</li>
    </ol>
    <h4>Aktivierungsfunktionen</h4>
    <h6 id='article-relu'>ReLU</h6>
    <p>Tiefe CNNs können mit jeder weiteren Schicht komplexere Merkmale lernen. Ein wichtiger Grund für ihre <a href="https://arxiv.org/pdf/1512.03385.pdf">hohe Genauigkeit</a> ist Nichtlinearität. ReLU fügt dem Modell diese Eigenschaft hinzu und ermöglicht nichtlineare Entscheidungsgrenzen. Ohne nichtlineare Aktivierungsfunktionen bliebe auch eine Verkettung linearer Schichten eine lineare Abbildung. Zudem zeigen <a href="https://arxiv.org/pdf/1906.01975.pdf">empirische Untersuchungen</a>, dass sich CNNs mit ReLU häufig schneller trainieren lassen als mit anderen nichtlinearen Funktionen wie <em>Sigmoid</em>.</p>
    <p>ReLU wendet auf jedes Element die folgende Operation an: {reluEquation}</p>
    <div class="figure">
    <img src="PUBLIC_URL/assets/figures/relu_graph.png" alt="Graph der ReLU-Funktion" width="30%" height="30%"/>
      <div class="figure-caption">Abbildung 3: Die ReLU-Funktion setzt alle negativen Werte auf 0.</div>
    </div>
    <p>ReLU wird auf jeden Wert des Eingabetensors angewendet. Zum Beispiel bleibt 2,24 unverändert, weil der Wert größer als 0 ist; negative Werte werden zu 0. Klicken Sie auf ein ReLU-Neuron, um dies zu beobachten. In der gezeigten Architektur folgt auf jede Faltungsschicht eine ReLU-Aktivierung (Rectified Linear Unit). Beachten Sie, wie sich dadurch die Aktivierungskarten verändern.</p>
    <h6 id='article-softmax'>Softmax</h6>
    <p>{softmaxEquation} Softmax transformiert die Klassenwerte so, dass ihre Summe 1 beträgt. Damit lassen sie sich als Klassenwahrscheinlichkeiten interpretieren. Ein Klick auf die letzte Schicht zeigt diese Operation. Die Logits, also unnormierte skalare Werte, sind nach dem Flatten-Schritt nicht auf den Bereich von 0 bis 1 begrenzt. Sie werden durch eine Farbskala von Hellorange bis Dunkelorange dargestellt. Nach Softmax entspricht jeder Klasse eine Wahrscheinlichkeit.</p>
    <p>Was unterscheidet Softmax von einer gewöhnlichen Normierung? Beide können Werte in den Bereich von 0 bis 1 bringen. Für das Training mittels Backpropagation benötigen wir jedoch eine differenzierbare Funktion. Softmax lässt sich als glatte, differenzierbare Alternative zu argmax verstehen: Durch die Exponentialfunktion werden größere Logits stärker betont als bei einer einfachen linearen Skalierung.</p>
    <div class="figure">
    <img src="PUBLIC_URL/assets/figures/softmax_animation.gif" alt="Interaktive Softmax-Formelansicht"/>
      <div class="figure-caption">Abbildung 4: Die interaktive Softmax-Formelansicht zeigt anhand farbiger Logits und der Formel, wie Klassenwerte zu Wahrscheinlichkeiten normiert werden.</div>
    </div>
    <h4 id='article-pooling'>Pooling-Schichten</h4>
    <p>Es gibt verschiedene Pooling-Verfahren. Sie verkleinern schrittweise die räumlichen Abmessungen der Merkmalskarten und reduzieren damit den Rechenaufwand und die Parameterzahl nachfolgender Schichten. Tiny VGG verwendet hier Max-Pooling.</p>
    <p>Für Max-Pooling werden Fenstergröße und Schrittweite festgelegt. Das Fenster gleitet über die Eingabe und übernimmt aus jedem Ausschnitt nur den größten Wert. Klicken Sie auf ein Pooling-Neuron, um den Vorgang zu sehen.</p>
    <p>Tiny VGG verwendet hier ein 2 × 2-Fenster mit Schrittweite 2. Pro Fenster bleibt ein Maximalwert erhalten, wodurch die Anzahl der Aktivierungswerte um 75 % sinkt. Das spart Rechenaufwand und kann helfen, Überanpassung zu verringern.</p>
    <h4 id='article-flatten'>Flatten-Schicht</h4>
    <p>Flatten formt einen dreidimensionalen Tensor in einen eindimensionalen Vektor um, der einer voll verbundenen Klassifikationsschicht übergeben werden kann. Aus einem 5 × 5 × 2-Tensor wird etwa ein Vektor mit 50 Elementen. Die zuvor extrahierten Merkmale werden so aufbereitet, von der voll verbundenen Schicht in Klassenwerte umgerechnet und anschließend durch Softmax in Wahrscheinlichkeiten umgewandelt. Ein Klick auf eine Ausgabeklasse zeigt diese Schicht.</p>

    <h2>Interaktive Funktionen</h2>
    <ol>
      <li><strong>Eigene Bilder hochladen:</strong> Klicken Sie auf <img class="icon is-rounded" src="PUBLIC_URL/assets/figures/upload_image_icon.png" alt="Bild hochladen"/>, um zu sehen, welcher der 10 Klassen Ihr Bild zugeordnet wird. Erkunden Sie die Neuronen, um Aktivierungskarten und extrahierte Merkmale zu verstehen.</li>
      <li><strong>Farbskala der Aktivierungskarten ändern:</strong> Mit <img class="is-rounded" width="12%" height="12%" src="PUBLIC_URL/assets/figures/heatmap_scale.png" alt="Auswahl des Farbskalenbereichs"/> können Sie Aktivierungen auf verschiedenen Abstraktionsebenen vergleichen.</li>
      <li><strong>Netzwerkdetails anzeigen:</strong> Ein Klick auf <img class="is-rounded" width="12%" height="12%" src="PUBLIC_URL/assets/figures/network_details.png" alt="Netzwerkdetails"/> blendet Schichtgrößen und Farbskalen ein.</li>
      <li><strong>Operationen simulieren:</strong> Starten Sie mit <img class="icon is-rounded" src="PUBLIC_URL/assets/figures/play_button.png" alt="Wiedergabe"/> die Animation. In der <em>interaktiven Formelansicht</em> können Sie außerdem Eingabe- und Ausgabebereiche mit der Maus erkunden, um ihre Zuordnung und die Berechnung nachzuvollziehen.</li>
      <li><strong>Schichtfunktionen nachlesen:</strong> Klicken Sie in der <em>interaktiven Formelansicht</em> auf <img class="icon is-rounded" src="PUBLIC_URL/assets/figures/info_button.png" alt="Erläuterung"/>, um zum passenden Artikelabschnitt zu springen.</li>
    </ol>

    <h2>Videotutorial (auf Englisch)</h2>
    <ul>
      <li class="video-link" on:click={currentPlayer.play(0)}>Einführung in CNN Explainer <small>(0:00–0:22)</small></li>
      <li class="video-link" on:click={currentPlayer.play(27)}><em>Übersicht</em> <small>(0:27–0:37)</small></li>
      <li class="video-link" on:click={currentPlayer.play(37)}><em>Aufgeklappte Faltungsansicht</em> <small>(0:37–0:46)</small></li>
      <li class="video-link" on:click={currentPlayer.play(46)}><em>Interaktive Formelansichten</em> für Faltung, ReLU und Pooling <small>(0:46–1:21)</small></li>
      <li class="video-link" on:click={currentPlayer.play(82)}><em>Aufgeklappte Flatten-Ansicht</em> <small>(1:22–1:41)</small></li>
      <li class="video-link" on:click={currentPlayer.play(101)}><em>Interaktive Softmax-Formelansicht</em> <small>(1:41–2:02)</small></li>
      <li class="video-link" on:click={currentPlayer.play(126)}>Interaktiv lernen: Klassifikation verstehen <small>(2:06–2:28)</small></li>
      <li class="video-link" on:click={currentPlayer.play(149)}>Interaktiver Tutorialartikel <small>(2:29–2:54)</small></li>
    </ul>
    <div class="video">
      <Youtube videoId="HnWIHWFbuUQ" playerId="demo_video" bind:this={currentPlayer}/>
    </div>

    <h2>Wie ist CNN Explainer implementiert?</h2>
    <p>CNN Explainer verwendet <a href="https://js.tensorflow.org/">TensorFlow.js</a>, eine Bibliothek für GPU-beschleunigtes Deep Learning im Browser, um das vortrainierte Modell zu laden und zu visualisieren. Das interaktive System ist in JavaScript geschrieben und nutzt <a href="https://svelte.dev/">Svelte</a> als Framework sowie <a href="https://d3js.org/">D3.js</a> für die Visualisierung. Zum Einstieg genügt ein Browser.</p>

    <h2>Wer hat CNN Explainer entwickelt?</h2>
    <p>CNN Explainer wurde von <a href="https://zijie.wang/">Jay Wang</a>, <a href="https://www.linkedin.com/in/robert-turko/">Robert Turko</a>, <a href="http://oshaikh.com/">Omar Shaikh</a>, <a href="https://haekyu.com/">Haekyu Park</a>, <a href="http://nilakshdas.com/">Nilaksh Das</a>, <a href="https://fredhohman.com/">Fred Hohman</a>, <a href="http://minsuk.com">Minsuk Kahng</a> und <a href="https://www.cc.gatech.edu/~dchau/">Polo Chau</a> im Rahmen einer Zusammenarbeit zwischen Georgia Tech und Oregon State entwickelt. Wir danken Anmol Chhabria, Kaan Sancak, Kantwon Rogers und dem Georgia Tech Visualization Lab für Unterstützung und konstruktives Feedback. Die Arbeit wurde teilweise durch NSF-Förderungen IIS-1563816 und CNS-1704701, NASA NSTRF, DARPA GARD sowie Zuwendungen von Intel, NVIDIA, Google und Amazon unterstützt.</p>
  </div>
</body>

{:else}
<body>
  <div id="description">
    <h2>What is a Convolutional Neural Network?</h2>
    <p>
		In machine learning, a classifier assigns a class label to a data point.  For example, an <em>image classifier</em> produces a class label (e.g, bird, plane) for what objects exist within an image.  A <em>convolutional neural network</em>, or CNN for short, is a type of classifier, which excels at solving this problem!
	 </p>
  	<p>
  		A CNN is a neural network: an algorithm used to recognize patterns in data. Neural Networks in general are composed of a collection of neurons that are organized in layers, each with their own learnable weights and biases.  Let’s break down a CNN into its basic building blocks.
  	</p>
  	<ol>
  		<li>A <strong>tensor</strong> can be thought of as an n-dimensional matrix.  In the CNN above, tensors will be 3-dimensional with the exception of the output layer.</li>
  		<li>A <strong>neuron</strong> can be thought of as a function that takes in multiple inputs and yields a single output.  The outputs of neurons are represented above as the <span style="color:#FF7577;">red</span> &rarr; <span style="color:#60A7D7;">blue</span> <strong>activation maps</strong>.</li>
  		<li>A <strong>layer</strong> is simply a collection of neurons with the same operation, including the same hyperparameters.</li>
  		<li><strong>Kernel weights and biases</strong>, while unique to each neuron, are tuned during the training phase, and allow the classifier to adapt to the problem and dataset provided.  They are encoded in the visualization with a <span style="color:#BC8435;">yellow</span> &rarr; <span style="color:#39988F;">green</span> diverging colorscale.  The specific values can be viewed in the <em>Interactive Formula View</em> by clicking a neuron or by hovering over the kernel/bias in the <em>Convolutional Elastic Explanation View</em>.</li>
  		<li>A CNN conveys a <strong>differentiable score function</strong>, which is represented as <strong>class scores</strong> in the visualization on the output layer.</li>
  	</ol> 
  	<p>
  		If you have studied neural networks before, these terms may sound familiar to you.  So what makes a CNN different? CNNs utilize a special type of layer, aptly named a convolutional layer, that makes them well-positioned to learn from image and image-like data.  Regarding image data, CNNs can be used for many different computer vision tasks, such as <a href="http://ijcsit.com/docs/Volume%207/vol7issue5/ijcsit20160705014.pdf" title="CNN Applications">image processing, classification, segmentation, and object detection</a>.
  	</p>  
  	<p>
  		In CNN Explainer, you can see how a simple CNN can be used for image classification.  Because of the network’s simplicity, its performance isn’t perfect, but that’s okay! The network architecture, <a href="http://cs231n.stanford.edu/" title="Tiny VGG Net presented by Stanford's CS231n">Tiny VGG</a>, used in CNN Explainer contains many of the same layers and operations used in state-of-the-art CNNs today, but on a smaller scale.  This way, it will be easier to understand getting started.
      </p>     

      <h2>What does each layer of the network do?</h2>
      <p>
  		Let’s walk through each layer in the network.  Feel free to interact with the visualization above by clicking and hovering over various parts of it as you read. 
      </p>
      <h4 id='article-input'>Input Layer</h4>
      <p>
      	The input layer (leftmost layer) represents the input image into the CNN.  Because we use RGB images as input, the input layer has three channels, corresponding to the red, green, and blue channels, respectively, which are shown in this layer. Use the color scale when you click on the <img class="is-rounded" width="12%" height="12%" src="PUBLIC_URL/assets/figures/network_details.png" alt="network details icon"/> icon above to display detailed information (on this layer, and others).
      </p>
      <h4 id='article-convolution'>Convolutional Layers</h4>
      <p>
  		The convolutional layers are the foundation of CNN, as they contain the learned kernels (weights), which extract features that distinguish different images from one another&mdash;this is what we want for classification!  As you interact with the convolutional layer, you will notice links between the previous layers and the convolutional layers.  Each link represents a unique kernel, which is used for the convolution operation to produce the current convolutional neuron’s output or activation map.  
  	</p>
  	<p>
  		The convolutional neuron performs an elementwise dot product with a unique kernel and the output of the previous layer’s corresponding neuron.  This will yield as many intermediate results as there are unique kernels.  The convolutional neuron is the result of all of the intermediate results summed together with the learned bias.
  	</p>
  	<p>
  		For example, let’s look at the first convolutional layer in the Tiny VGG architecture above.  Notice that there are 10 neurons in this layer, but only 3 neurons in the previous layer.  In the Tiny VGG architecture, convolutional layers are fully-connected, meaning each neuron is connected to every other neuron in the previous layer.  Focusing on the output of the topmost convolutional neuron from the first convolutional layer, we see that there are 3 unique kernels when we hover over the activation map.  
  	</p>
    <div class="figure">
      <img src="PUBLIC_URL/assets/figures/convlayer_overview_demo.gif" alt="clicking on topmost first conv. layer activation map" width=60% height=60% align="middle"/>
      <div class="figure-caption">
  		  Figure 1.  As you hover over the activation map of the topmost node from the first convolutional layer, you can see that 3 kernels were applied to yield this activation map.  After clicking this activation map, you can see the convolution operation occuring with each unique kernel.
  	  </div>
    </div>

  	<p>
  		The size of these kernels is a hyper-parameter specified by the designers of the network architecture.  In order to produce the output of the convolutional neuron (activation map), we must perform an elementwise dot product with the output of the previous layer and the unique kernel learned by the network.  In TinyVGG, the dot product operation uses a stride of 1, which means that the kernel is shifted over 1 pixel per dot product, but this is a hyperparameter that the network architecture designer can adjust to better fit their dataset.  We must do this for all 3 kernels, which will yield 3 intermediate results.  
  	</p>
    <div class="figure">
      <img src="PUBLIC_URL/assets/figures/convlayer_detailedview_demo.gif" alt="clicking on topmost first conv. layer activation map" />
      <div class="figure-caption">
        Figure 2. The kernel being applied to yield the topmost intermediate result for the discussed activation map.
      </div>
    </div>
  	<p>
  		Then, an elementwise sum is performed containing all 3 intermediate results along with the bias the network has learned.  After this, the resulting 2-dimensional tensor will be the activation map viewable on the interface above for the topmost neuron in the first convolutional layer.  This same operation must be applied to produce each neuron’s activation map.
  	</p>
  	<p>
  		With some simple math, we are able to deduce that there are 3 x 10 = 30 unique kernels, each of size 3x3, applied in the first convolutional layer.  The connectivity between the convolutional layer and the previous layer is a design decision when building a network architecture, which will affect the number of kernels per convolutional layer.  Click around the visualization to better understand the operations behind the convolutional layer.  See if you can follow the example above!
    </p>
    <h6>Understanding Hyperparameters</h6>
    <p>
    	<HyperparameterView/>
    </p>
    <ol>
    	<li><strong>Padding</strong> is often necessary when the kernel extends beyond the activation map.  Padding conserves data at the borders of activation maps, which leads to better performance, and it can help <a href="https://arxiv.org/pdf/1603.07285.pdf" title="See page 13">preserve the input's spatial size</a>, which allows an architecture designer to build deeper, higher performing networks.  There exist <a href="https://arxiv.org/pdf/1811.11718.pdf" title="Outlines major padding techniques">many padding techniques</a>, but the most commonly used approach is zero-padding because of its performance, simplicity, and computational efficiency.  The technique involves adding zeros symmetrically around the edges of an input.  This approach is adopted by many high-performing CNNs such as <a href="https://papers.nips.cc/paper/4824-imagenet-classification-with-deep-convolutional-neural-networks.pdf" title="AlexNet">AlexNet</a>.</li>
    	<li><strong>Kernel size</strong>, often also referred to as filter size, refers to the dimensions of the sliding window over the input.  Choosing this hyperparameter has a massive impact on the image classification task.  For example, small kernel sizes are able to extract a much larger amount of information containing highly local features from the input.  As you can see on the visualization above, a smaller kernel size also leads to a smaller reduction in layer dimensions, which allows for a deeper architecture.  Conversely, a large kernel size extracts less information, which leads to a faster reduction in layer dimensions, often leading to worse performance.  Large kernels are better suited to extract features that are larger.  At the end of the day, choosing an appropriate kernel size will be dependent on your task and dataset, but generally, smaller kernel sizes lead to better performance for the image classification task because an architecture designer is able to stack <a href="https://arxiv.org/pdf/1409.1556.pdf" title="Learn why deeper networks perform better!">more and more layers together to learn more and more complex features</a>!</li>
    	<li><strong>Stride</strong> indicates how many pixels the kernel should be shifted over at a time.  For example, as described in the convolutional layer example above, Tiny VGG uses a stride of 1 for its convolutional layers, which means that the dot product is performed on a 3x3 window of the input to yield an output value, then is shifted to the right by one pixel for every subsequent operation.  The impact stride has on a CNN is similar to kernel size.  As stride is decreased, more features are learned because more data is extracted, which also leads to larger output layers.  On the contrary, as stride is increased, this leads to more limited feature extraction and smaller output layer dimensions.  One responsibility of the architecture designer is to ensure that the kernel slides across the input symmetrically when implementing a CNN.  Use the hyperparameter visualization above to alter stride on various input/kernel dimensions to understand this constraint!</li>
    </ol>
    <h4>Activation Functions</h4>
    <h6 id='article-relu'>ReLU</h6>
    <p>
    	Neural networks are extremely prevalent in modern technology&mdash;because they are so accurate!  The highest performing CNNs today consist of an absurd amount of layers, which are able to learn more and more features.  Part of the reason these groundbreaking CNNs are able to achieve such <a href="https://arxiv.org/pdf/1512.03385.pdf" title="ResNet">tremendous accuracies</a> is because of their non-linearity.  ReLU applies much-needed non-linearity into the model.  Non-linearity is necessary to produce non-linear decision boundaries, so that the output cannot be written as a linear combination of the inputs.  If a non-linear activation function was not present, deep CNN architectures would devolve into a single, equivalent convolutional layer, which would not perform nearly as well.  The ReLU activation function is specifically used as a non-linear activation function, as opposed to other non-linear functions such as <em>Sigmoid</em> because it has been <a href="https://arxiv.org/pdf/1906.01975.pdf" title="See page 29">empirically observed</a> that CNNs using ReLU are faster to train than their counterparts.
    </p>
    <p>
  	The ReLU activation function is an elementwise mathematical operation: {reluEquation}
    </p>
    <div class="figure">
    <img src="PUBLIC_URL/assets/figures/relu_graph.png" alt="relu graph" width="30%" height="30%"/>
      <div class="figure-caption">
        Figure 3. The ReLU activation function graphed, which disregards all negative data.
      </div>
    </div>
    <p>
  	This activation function is applied elementwise on every value from the input tensor.  For example, if applied ReLU on the value 2.24, the result would be 2.24, since 2.24 is larger than 0.  You can observe how this activation function is applied by clicking a ReLU neuron in the network above.  The Rectified Linear Activation function (ReLU) is performed after every convolutional layer in the network architecture outlined above.  Notice the impact this layer has on the activation map of various neurons throughout the network!
    </p>
    <h6 id='article-softmax'>Softmax</h6>
    <p>
    	{softmaxEquation}
    	A softmax operation serves a key purpose: making sure the CNN outputs sum to 1.  Because of this, softmax operations are useful to scale model outputs into probabilities.  Clicking on the last layer reveals the softmax operation in the network. Notice how the logits after flatten aren’t scaled between zero to one.  For a visual indication of the impact of each logit (unscaled scalar value), they are encoded using a <span style="color:#FFC385;">light orange</span> &rarr; <span style="color:#C44103;">dark orange</span> color scale.  After passing through the softmax function, each class now corresponds to an appropriate probability! 
    </p>
    <p>
    	You might be thinking what the difference between standard normalization and softmax is&mdash;after all, both rescale the logits between 0 and 1.  Remember that backpropagation is a key aspect of training neural networks&mdash;we want the correct answer to have the largest “signal.” By using softmax, we are effectively “approximating” argmax while gaining differentiability.  Rescaling doesn’t weigh the max significantly higher than other logits, whereas softmax does.  Simply put, softmax is a “softer” argmax&mdash;see what we did there?
    </p>
    <div class="figure">
    <img src="PUBLIC_URL/assets/figures/softmax_animation.gif" alt="softmax interactive formula view"/>
      <div class="figure-caption">
        Figure 4. The <em>Softmax Interactive Formula View</em> allows a user to interact with both the color encoded logits and formula to understand how the prediction scores after the flatten layer are normalized to yield classification scores.
      </div>
    </div>
    <h4 id='article-pooling'>Pooling Layers</h4>
    <p>
    	There are many types of pooling layers in different CNN architectures, but they all have the purpose of gradually decreasing the spatial extent of the network, which reduces the parameters and overall computation of the network.  The type of pooling used in the Tiny VGG architecture above is Max-Pooling.
    </p>
    <p>
    	The Max-Pooling operation requires selecting a kernel size and a stride length during architecture design.  Once selected, the operation slides the kernel with the specified stride over the input while only selecting the largest value at each kernel slice from the input to yield a value for the output.  This process can be viewed by clicking a pooling neuron in the network above.
    </p>
    <p>
    	In the Tiny VGG architecture above, the pooling layers use a 2x2 kernel and a stride of 2.  This operation with these specifications results in the discarding of 75% of activations.  By discarding so many values, Tiny VGG is more computationally efficient and avoids overfitting.
    </p>
    <h4 id='article-flatten'>Flatten Layer</h4>
    <p>      
      This layer converts a three-dimensional layer in the network into a one-dimensional vector to fit the  input of a fully-connected layer for classification.  For example, a 5x5x2 tensor would be converted into a vector of size 50.  The previous convolutional layers of the network extracted the features from the input image, but now it is time to classify the features.  We use the softmax function to classify these features, which requires a 1-dimensional input.  This is why the flatten layer is necessary.  This layer can be viewed by clicking any output class.  
    </p>

    <h2>Interactive features</h2>
    <ol>
    	<li><strong>Upload your own image</strong> by selecting <img class="icon is-rounded" src="PUBLIC_URL/assets/figures/upload_image_icon.png" alt="upload image icon"/> to understand how your image is classified into the 10 classes.  By analyzing the neurons throughout the network, you can understand the activations maps and extracted features.</li>
    	<li><strong>Change the activation map colorscale</strong> to better understand the impact of activations at different levels of abstraction by adjusting <img class="is-rounded" width="12%" height="12%" src="PUBLIC_URL/assets/figures/heatmap_scale.png" alt="heatmap"/>.</li>
    	<li><strong>Understand network details</strong> such as layer dimensions and colorscales by clicking the <img class="is-rounded" width="12%" height="12%" src="PUBLIC_URL/assets/figures/network_details.png" alt="network details icon"/> icon.</li>
    	<li><strong>Simulate network operations</strong> by clicking the <img class="icon is-rounded" src="PUBLIC_URL/assets/figures/play_button.png" alt="play icon"/> button or interact with the layer slice in the <em>Interactive Formula View</em> by hovering over portions of the input or output to understand the mappings and underlying operations.</li>
      <li><strong>Learn layer functions</strong> by clicking <img class="icon is-rounded" src="PUBLIC_URL/assets/figures/info_button.png" alt="info icon"/> from the <em>Interactive Formula View</em> to read layer details from the article.</li>
    </ol> 

    <h2>Video Tutorial</h2>
    <ul>
      <li class="video-link" on:click={currentPlayer.play(0)}>
        CNN Explainer Introduction
        <small>(0:00-0:22)</small>
      </li>
      <li class="video-link" on:click={currentPlayer.play(27)}>
        <em>Overview</em>
        <small>(0:27-0:37)</small>
      </li>
      <li class="video-link" on:click={currentPlayer.play(37)}>
        Convolutional <em>Elastic Explanation View</em>
        <small>(0:37-0:46)</small>
      </li>
      <li class="video-link" on:click={currentPlayer.play(46)}>
        Convolutional, ReLU, and Pooling <em>Interactive Formula Views</em>
        <small>(0:46-1:21)</small>
      </li>
      <li class="video-link" on:click={currentPlayer.play(82)}>
        Flatten <em>Elastic Explanation View</em>
        <small>(1:22-1:41)</small>
      </li>
      <li class="video-link" on:click={currentPlayer.play(101)}>
        Softmax <em>Interactive Formula View</em>
        <small>(1:41-2:02)</small>
      </li>
      <li class="video-link" on:click={currentPlayer.play(126)}>
        Engaging Learning Experience: Understanding Classification
        <small>(2:06-2:28)</small>
      </li>
      <li class="video-link" on:click={currentPlayer.play(149)}>
        Interactive Tutorial Article
        <small>(2:29-2:54)</small>
      </li>
    </ul>
    <div class="video">
      <Youtube videoId="HnWIHWFbuUQ" playerId="demo_video" bind:this={currentPlayer}/>
    </div>

    <h2>How is CNN Explainer implemented?</h2>
    <p>
      CNN Explainer uses <a href="https://js.tensorflow.org/"><em>TensorFlow.js</em></a>, an in-browser GPU-accelerated deep learning library to load the pretrained model for visualization.  The entire interactive system is written in Javascript using <a href="https://svelte.dev/"><em>Svelte</em></a> as a framework and <a href="https://d3js.org/"><em>D3.js</em></a> for visualizations. You only need a web browser to get started learning CNNs today!
    </p>

    <h2>Who developed CNN Explainer?</h2>
    <p>
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
      Georgia Tech and Oregon State.  We thank Anmol Chhabria, Kaan Sancak, Kantwon Rogers, and the Georgia Tech Visualization Lab for their support and constructive feedback.  This work was supported in part by NSF grants IIS-1563816, CNS-1704701, NASA NSTRF, DARPA GARD, gifts from Intel, NVIDIA, Google, Amazon.
    </p>
  </div>
</body>

{/if}
