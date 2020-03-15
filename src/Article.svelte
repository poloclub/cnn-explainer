<script>
	let softmaxEquation = `$$\\text{Softmax}(x_{i}) = \\frac{\\exp(x_i)}{\\sum_j \\exp(x_j)}$$`;
	let reluEquation = `$$\\text{ReLU}(x) = \\max(0,x)$$`;
</script>

<style>
	#description {
      margin-bottom: 60px;
      margin-left: auto;
      margin-right: auto;
      max-width: 900px;
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
      
    #description a:hover, 
    #description .video-part-link:hover {
      text-decoration: underline;
    }
</style>

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
		<li>A <strong>neuron</strong> can be thought of as a function that takes in multiple inputs and yields a single output.  The outputs of neurons are represented above as the <span style="color:red;">red</span> &rarr; <span style="color:blue;">blue</span> <strong>activation maps</strong>.</li>
		<li>A <strong>layer</strong> is simply a collection of neurons with the same operation, including the same hyperparameters.</li>
		<li><strong>Kernel weights and biases</strong>, while unique to each neuron, are tuned during the training phase, and allow the classifier to adapt to the problem and dataset provided.  The specific values can be viewed in the <em>Detail View</em> by clicking a neuron.</li>
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
    <h4>Input Layer</h4>
    <p>
    	The input layer (leftmost layer) represents the input image into the CNN.  Because we use RGB images as input, the input layer has three channels, corresponding to the red, green, and blue channels, respectively, which are shown in this layer. Use the color scale when you click on the <img class="icon" align="top" src="/assets/figures/eye.png" alt="eye icon" /> icon above to display detailed information (on this layer, and others).
    </p>
    <h4>Convolutional Layers</h4>
    <p>
		The convolutional layers are the foundation of CNN, as they contain the learned kernels (weights), which extract features that distinguish different images from one another&mdash;this is what we want for classification!  As you interact with the convolutional layer, you will notice links between the previous layers and the convolutional layers.  Each link represents a unique kernel, which is used for the convolution operation to produce the current convolutional neuron’s output or activation map.  
	</p>
	<p>
		The convolutional neuron performs an elementwise dot product with a unique kernel and the output of the previous layer’s corresponding neuron.  This will yield as many intermediate results as there are unique kernels.  The convolutional neuron is the result of all of the intermediate results summed together with the learned bias.
	</p>
	<p>
		For example, let’s look at the first convolutional layer in the Tiny VGG architecture above.  Notice that there are 10 neurons in this layer, but only 3 neurons in the previous layer.  In the Tiny VGG architecture, convolutional layers are fully-connected, meaning each neuron is connected to every other neuron in the previous layer.  Focusing on the output of the topmost convolutional neuron from the first convolutional layer, we see that there are 3 unique kernels when we hover over the activation map.  
	</p>
	<img src="/assets/figures/convlayer_overview_demo.gif" alt="clicking on topmost first conv. layer activation map" width=60% height=60%/>
	<div class="figure-caption">
		Figure 1.  As you hover over the activation map of the topmost node from the first convolutional layer, you can see that 3 kernels were applied to yield this activation map.  After clicking this activation map, you can see the convolution operation occuring with each unique kernel.
	</div>
	<p>
		The size of these kernels is a hyper-parameter specified by the designers of the network architecture.  In order to produce the output of the convolutional neuron (activation map), we must perform an elementwise dot product with the output of the previous layer and the unique kernel learned by the network.  In TinyVGG, the dot product operation uses a stride of 1, which means that the kernel is shifted over 1 pixel per dot product, but this is a hyperparameter that the network architecture designer can adjust to better fit their dataset.  We must do this for all 3 kernels, which will yield 3 intermediate results.  
	</p>
	<img src="/assets/figures/convlayer_detailedview_demo.gif" alt="clicking on topmost first conv. layer activation map" />
	<div class="figure-caption">
		Figure 2. The kernel being applied to yield the topmost intermediate result for the discussed activation map.
	</div>
	<p>
		Then, an elementwise sum is performed containing all 3 intermediate results along with the bias the network has learned.  After this, the resulting 2-dimensional tensor will be the activation map viewable on the interface above for the topmost neuron in the first convolutional layer.  This same operation must be applied to produce each neuron’s activation map.
	</p>
	<p>
		With some simple math, we are able to deduce that there are 3 x 10 = 30 unique kernels, each of size 3x3, applied in the first convolutional layer.  The connectivity between the convolutional layer and the previous layer is a design decision when building a network architecture, which will affect the number of kernels per convolutional layer.  Click around the visualization to better understand the operations behind the convolutional layer.  See if you can follow the example above!
    </p>
    <h4>Activation Functions</h4>
    <h6>ReLU</h6>
    <p>
    	Neural networks are extremely prevalent in modern technology&mdash;because they are so accurate!  The highest performing CNNs today consist of an absurd amount of layers, which are able to learn more and more features.  Part of the reason these groundbreaking CNNs are able to achieve such <a href="https://arxiv.org/pdf/1512.03385.pdf" title="ResNet">tremendous accuracies</a> is because of their non-linearity.  ReLU applies much-needed non-linearity into the model.  Non-linearity is necessary to produce non-linear decision boundaries, so that the output cannot be written as a linear combination of the inputs.  If a non-linear activation function was not present, deep CNN architectures would devolve into a single, equivalent convolutional layer, which would not perform nearly as well.  The ReLU activation function is specifically used as a non-linear activation function, as opposed to other non-linear functions such as <em>Sigmoid</em> because it has been <a href="https://arxiv.org/pdf/1906.01975.pdf" title="See page 29">empirically observed</a> that CNNs using ReLU are faster to train than their counterparts.
    </p>
    <p>
		The ReLU activation function is a one-to-one mathematical operation: {reluEquation}
		This activation function is applied elementwise on every value from the input tensor.  For example, if applied ReLU on the value 2.24, the result would be 2.24, since 2.24 is larger than 0.  You can observe how this activation function is applied by clicking a ReLU neuron in the network above.  The Rectified Linear Activation function (ReLU) is performed after every convolutional layer in the network architecture outlined above.  Notice the impact this layer has on the activation map of various neurons throughout the network!
    </p>
    <h6>Softmax</h6>
    <p>
    	{softmaxEquation}
    	A softmax operation serves a key purpose: making sure the CNN outputs sum to 1. Because of this, softmax operations are useful to scale model outputs into probabilities. Clicking on the last layer reveals the softmax operation in the network. Notice how the logits after flatten aren’t scaled between zero to one. After passing through the softmax function, each class now corresponds to an appropriate probability! 
    </p>
    <p>
    	You might be thinking what the difference between standard normalization and softmax is&mdash;after all, both rescale the logits between 0 and 1. Remember that backpropagation is a key aspect of training neural networks&mdash;we want the correct answer to have the largest “signal.” By using softmax, we are effectively “approximating” argmax while gaining differentiability. Rescaling doesn’t weigh the max significantly higher than other logits, whereas softmax does. Simply put, softmax is a “softer” argmax&mdash;see what we did there?
    </p>
    <h4>Pooling Layers</h4>
    <p>
    	There are many types of pooling layers in different CNN architectures, but they all have the purpose of gradually decreasing the spatial extent of the network, which reduces the parameters and overall computation of the network.  The type of pooling used in the Tiny VGG architecture above is Max-Pooling.
    </p>
    <p>
    	The Max-Pooling operation requires selecting a kernel size and a stride length during architecture design.  Once selected, the operation slides the kernel with the specified stride over the input while only selecting the largest value at each kernel slice from the input to yield a value for the output.  This process can be viewed by clicking a pooling neuron in the network above.
    </p>
    <p>
    	In the Tiny VGG architecture above, the pooling layers use a 2x2 kernel and a stride of 2.  This operation with these specifications results in the discarding of 75% of activations.  By discarding so many values, Tiny VGG is more computationally efficient and avoids overfitting.
    </p>
    <h4>Flatten Layer</h4>
    <p>      
      This layer converts a three-dimensional layer in the network into a one-dimensional vector to fit the  input of a fully-connected layer for classification.  For example, a 5x5x2 tensor would be converted into a vector of size 50.  The previous convolutional layers of the network extracted the features from the input image, but now it is time to classify the features.  We use the softmax function to classify these features, which requires a 1-dimensional input.  This is why the flatten layer is necessary.  This layer can be viewed by clicking any output class.  
    </p>
 
    <h2>Interactive features</h2>
    <ol>
		<li><strong>Upload your own image</strong> via url to understand how your image is classified into the 10 classes.  By analyzing at the neurons throughout the network, you can understand the activations maps and extracted features.  <em>TODO: insert image here showing where/how a user can upload an image</em></li>
		<li><strong>Change the activation map colorscale</strong> to better understand the impact of activations at different levels of abstraction by adjusting <img class="is-rounded" width="15%" height="15%" align="top" src="/assets/figures/heatmap_scale.png" alt="heatmap"/>.</li>
		<li><strong>Understand network details</strong> such as layer dimensions and colorscales by clicking the <img class="icon" align="top" src="/assets/figures/eye.png" alt="eye icon"/> icon.</li>
		<li><strong>Simulate network operations</strong> by clicking the <img class="icon" align="top" src="/assets/figures/play_button.png" alt="play icon"/> button or interact with the layer slice in the <em>Detail View</em> by hovering over portions of the input or output to understand the mappings and underlying operations.</li>
	</ol> 

    <h2>How is CNN Explainer implemented?</h2>
    <p>
      CNN Explainer uses <a href="https://js.tensorflow.org/"><em>TensorFlow.js</em></a>, an in-browser GPU-accelerated deep learning library to load the pretrained model for visualization.  The entire interactive system is written in Javascript using <a href="https://svelte.dev/"><em>Svelte</em></a> as a framework and <a href="https://d3js.org/"><em>D3.js</em></a> for visualizations. You only need a web browser to get started learning CNNs today!
    </p>
  </div>
</body>