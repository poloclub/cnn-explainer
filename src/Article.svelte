<script>
	let softmaxEquation = `$$\\text{Softmax}(x_{i}) = \\frac{\\exp(x_i)}{\\sum_j \\exp(x_j)}$$`;
	let reluEquation = `$$\\text{ReLU}(x) = max(0,x)$$`;
</script>

<style>
	#description {
      margin-bottom: 60px;
      margin-left: auto;
      margin-right: auto;
      max-width: 660px;
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
    <h2>What is a Convolutional Neural Network (CNN)?</h2>
    <p>
		To begin an explanation on what a CNN is, it is helpful to understand what a ML classifier is.  A ML classifier attempts to assign a class label to a data point.  For example, a classifier will take some piece of data, say an image, and it will yield a class label to classify the object in the image.  A CNN is a type of classifier, which will, in our case, attempt to solve this very problem outlined above!
	</p>
	<p>
		A CNN is a neural network consisting of a collection of neurons organized into layers each with learnable weights and biases.  This may sound overwhelming, so we can break a CNN down into basic building blocks.
	</p>
	<ol>
		<li>A <strong>neuron</strong> can be thought of as simply a function that takes multiple inputs and yields a single output.  This is represented as a 2D activation map above with 10 in each layer (column).</li>
		<li>A <strong>layer</strong> is simply a collection of neurons with the same operation, including the same hyperparameters.</li>
		<li><strong>Weights and biases</strong> are unique to each neuron.  They are tuned during the training phase, which allow the classifier to adapt to the problem presented.  The specific values can be viewed in the <em>Detail View</em> by clicking a neuron.</li>
	</ol> 
	<p>
		The CNN conveys a differentiable score function, which is represented as class scores in the CNN presented above.  If you have studied neural networks before, the above information may sound very familiar to you, so you might be wondering, what makes a CNN unique? CNNs make the simple assumption that the inputs are images, which allows for efficient architecture design and the use of convolutional layers (explained below).
	</p>  
	<p>
		CNNs are a type of neural network with a unique architecture that can be used for many different tasks, such as image processing, classification, segmentation, etc.  In CNN Explainer, you can see how a very simple CNN can be used for image classification.  Because of the network’s simplicity, its performance suffers, but the network architecture, Tiny VGG, presented by CNN Explainer contains many of the same layers and operations used in the highest performing CNNs for you to better understand the underlying operations behind a CNN and their effects.  
    </p>     

    <h2>What does each layer of the network do?</h2>
    <p>
		We will walk through each layer in the network.  Additionally, feel free to interact with the visualization above by clicking and hovering over various parts of it as you read to gain a more intuitive understanding of the underlying operations.
    </p>
    <h4>Input Layer:</h4>
    <p>
    	The input layer (leftmost layer) represents the input image into the CNN architecture. Because we use RGB images as input, the input layer has three channels, corresponding to the red, green, and blue channels, respectively, which are visualized in this layer using the defined color scale when you click on the <img class="icon" align="top" src="/assets/figures/eye.png" alt="eye icon" /> icon above to display detailed information on each layer.
    </p>
    <h4>Convolutional Layers:</h4>
    <p>
		The convolutional layers are the foundation to a CNN as they use learned kernels (weights), which aid in extracting features that are pivotal to the classification of an image.  As you interact with the convolutional layer, you will notice links between the previous layers and the convolutional layers.  Each link represents a unique kernel, which is used for the convolution operation to yield the current convolutional neuron’s activation map.  
	</p>
	<p>
		The convolutional neuron is calculated by performing an elementwise dot product with a unique kernel and the corresponding previous layer’s neuron.  This will yield as many intermediate results as there are unique kernels.  The convolutional neuron is the result of all of the intermediate results summed together with the learned bias.
	</p>
	<p>
		For example, let us look at the first convolutional layer in the Tiny VGG architecture above.  We notice that there are 10 neurons in this layer, but only 3 neurons in the previous layer.  In the Tiny VGG architecture, convolutional layers are fully-connected, meaning each neuron is connected to each neuron in the previous layer.  Focusing on the topmost convolutional neuron from the first convolutional layer, we see that there are 3 unique kernels when we hover over the neuron.  The size of these kernels is a hyper-parameter specified by the users of the architecture.  In order to produce the output of the convolutional layer (activation map), we must perform an elementwise dot product with the output of the previous layer and the unique kernel learned by the network.  In TinyVGG, the dot product operation uses a stride of 1, which means that the kernel is shifted over by 1 per dot product, but this is a hyperparameter that the architecture user can adjust to yield different results.  We must do this for all 3 kernels, which will yield 3 intermediate results.  Then, an elementwise sum must be performed with all 3 results along with the bias the network has learned.  After this operation is performed, the resulting 2-dimensional tensor will be the activation map viewable on the interface above for the topmost neuron in the first convolutional layer.  This same operation must be applied to produce each neuron’s activation map.
	</p>
	<p>
		With some simple math, we are able to deduce that there are 3 x 10 = 30 unique kernels each of size 3x3 applied in the first convolutional layer.  To be clear, the connectivity between the convolutional layer and the previous layer is a design decision when designing an architecture, which will affect the number of kernels per convolutional layer.  Feel free to click around on the visualization above to better understand the operations behind the convolutional layer.  You can even specifically follow the example outlined in the previous paragraph!
    </p>
    <h4>Activation Functions:</h4>
    <h6>ReLU:</h6>
    <p>
    	The Rectified Linear Activation function (ReLU) is performed after every convolutional layer in the network architecture outlined above.  This activation function applies much-needed non-linearity into the model.  Non-linearity is needed to produce non-linear decision boundaries, so that the output cannot be written as a linear combination of the inputs.  If a non-linear activation function was not present, deep CNN architectures would devolve into a single, equivalent convolutional layer.  The ReLU activation function is specifically used as a non-linear activation function, as opposed to other non-linear functions such as tanh because it has been empirically observed that CNNs using ReLU are faster to train than their counterparts.
    </p>
    <p>
		The ReLU activation function is a simple one-to-one mathematical operation:{reluEquation}This activation function will be applied in an elementwise fashion on every tensor cell.  For example, if applied on an input cell of 2.24, the result would be 2.24, since 2.24 is larger than 0.  You can observe how this activation function is applied by clicking a ReLU neuron in the network above.  Notice the impact this layer has on the activation map of various neurons throughout the network!
    </p>
    <h6>Softmax:</h6>
    <p>
    	{softmaxEquation}
    	A softmax operation serves a key purpose: making sure its output sums to 1. Because of this, softmax operations are useful to scale model outputs into probabilities. Clicking on the last layer reveals the softmax operation in the network. Notice how the logits after flatten aren’t scaled between zero to one. After passing through the softmax function, each class now corresponds to an appropriate probability! 
    </p>
    <p>
    	You might be thinking what the difference between standard normalization and softmax is&mdash;after all, both rescale the logits between 0 and 1. Remember that backpropagation is a key aspect of training neural networks&mdash;we want the correct answer to have the largest “signal.” By using softmax, we are effectively “approximating” argmax while gaining differentiability. Rescaling doesn’t weigh the max significantly higher than other logits, whereas softmax does. Simply put, softmax is a “softer” argmax&mdash;see what we did there?
    </p>
    <h4>Pooling Layers:</h4>
    <p>
    	There are many types of pooling layers in different CNN architectures, but they all have the purpose of gradually decreasing the spatial extent of the network, which reduces the parameters and overall computation of the network.  The type of pooling used in the Tiny VGG architecture above is Max-Pooling.
    </p>
    <p>
    	The Max-Pooling operation requires selecting a kernel size and a stride length during architecture design.  Once selected, the operation is the process of sliding the kernel with the specified stride over the input only selecting the largest value at each kernel slice from the input to yield a value for the output.  This process can be viewed by clicking a pooling neuron in the network above.  
    </p>
    <p>
    	In the Tiny VGG architecture above, the pooling layers use a 2x2 kernel and a stride of 2.  This operation with these specifications results in the discarding of 75% of activations.  By discarding so many values, Tiny VGG is more computationally efficient and avoids overfitting.
    </p>
    <h4>Flatten Layer:</h4>
    <p>      
      This layer involves the process of converting the previous three-dimensional layer in the network into a one-dimensional vector for input to the fully-connected layer for classification.  For example, a 5x5x2 tensor would be converted into a vector of size 50.  The previous convolutional layers of the network extracted the features from the input image, but now it is time to classify the features.  We will be using the softmax function to classify these features, which requires a 1-dimensional input.  This is why the flatten layer is necessary.  This layer can be viewed by clicking any output class.  
    </p>
 
    <h2>Interactive features</h2>
    <ol>
		<li><strong>Upload your own image</strong> via url to understand how your image is classified into the 10 classes.  By analyzing at the neurons throughout the network, you can understand the activations maps and extracted features.  <em>TODO: insert image here showing where/how a user can upload an image</em></li>
		<li><strong>Change the activation map colorscale</strong> to better understand the impact of activations at different levels of abstraction by adjusting (<img class="is-rounded" width="20%" height="5%" align="top" src="/assets/figures/heatmap_scale.png" alt="heatmap"/>)</li>
		<li><strong>Understand network details</strong> such as layer dimensions and colorscales by clicking the <img class="icon" align="top" src="/assets/figures/eye.png" alt="eye icon"/> icon</li>
		<li><strong>Simulate network operations</strong> by clicking the <img class="icon" align="top" src="/assets/figures/play_button.png" alt="play icon"/> button or interact with the layer slice in the <em>Detail View</em> by hovering over portions of the input or output to understand the mappings and underlying operations.</li>
	</ol> 

    <h2>How is CNN Explainer implemented?</h2>
    <p>
      CNN Explainer uses <a href="https://js.tensorflow.org/"><em>TensorFlow.js</em></a>, an in-browser GPU-accelerated deep learning library to load the pretrained model for visualization.  The entire interactive system is written in Javascript using Svelte as a framework and D3.js for visualizations. You only need a web browser to get started learning CNNs today!
    </p>
    
    <h2>Resources</h2>

  </div>
</body>