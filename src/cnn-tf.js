import * as tf from '@tensorflow/tfjs';

// Enum of node types
const nodeType = {
  INPUT: 'input',
  CONV: 'conv',
  POOL: 'pool',
  RELU: 'relu',
  FC: 'fc',
  FLATTEN: 'flatten'
}

class Node {
  /**
   * Class structure for each neuron node.
   * 
   * @param {string} layerName Name of the node's layer.
   * @param {int} index Index of this node in its layer.
   * @param {string} type Node type {input, conv, pool, relu, fc}. 
   * @param {number} bias The bias assocated to this node.
   * @param {[[number]]} output Output of this node.
   */
  constructor(layerName, index, type, bias, output) {
    this.layerName = layerName;
    this.index = index;
    this.type = type;
    this.bias = bias;
    this.output = output;

    // Weights are stored in the links
    this.inputLinks = [];
    this.outputLinks = [];
  }
}

class Link {
  constructor(source, dest, weight) {
    this.source = source;
    this.dest = dest;
    this.weight = weight;
  }
}

const constructCNNFromOutputs = (allOutputs, model, inputImageTensor) => {
  let nn = [];

  // Add the first layer (input layer)
  let inputLayer = [];
  let inputShape = model.layers[0].batchInputShape.slice(1);
  let inputImageArray = inputImageTensor.transpose([2, 0, 1]).arraySync();

  // First layer's three nodes' outputs are the channels of inputImageArray
  for (let i = 0; i < inputShape[2]; i++) {
    let node = new Node('input', i, nodeType.INPUT, 0, inputImageArray[i]);
    inputLayer.push(node);
  }
                                                                                                                   
  nn.push(inputLayer);
  let curLayerIndex = 1;

  for (let l = 0; l < model.layers.length; l++) {
    let layer = model.layers[l];
    let outputs = allOutputs[l].squeeze();
    let shape = outputs.shape;
    outputs = outputs.arraySync();
    console.log(layer.name, shape);
    let curLayerNodes = [];
    let curLayerType;

    // Identify layer type based on the layer name
    if (layer.name.includes('conv')) {
      curLayerType = nodeType.CONV;
    } else if (layer.name.includes('pool')) {
      curLayerType = nodeType.POOL;
    } else if (layer.name.includes('relu')) {
      curLayerType = nodeType.RELU;
    } else if (layer.name.includes('output')) {
      curLayerType = nodeType.FC;
    } else if (layer.name.includes('flatten')) {
      curLayerType = nodeType.FLATTEN;
    } else {
      console.log('Find unknown type');
    }

    // Construct this layer based on its layer type
    switch (curLayerType) {
      case nodeType.CONV: {
        let biases = layer.bias.val.arraySync();
        // The new order is [output_depth, input_depth, height, width]
        let weights = layer.kernel.val.transpose([3, 2, 0, 1]).arraySync();

        // Add nodes into this layer
        for (let i = 0; i < outputs.length; i++) {
          let node = new Node(layer.name, i, curLayerType, biases[i],
            outputs[i]);

          // Connect this node to all previous nodes (create links)
          // CONV layers have weights in links. Links are one-to-multiple.
          for (let j = 0; j < nn[curLayerIndex - 1].length; j++) {
            let preNode = nn[curLayerIndex - 1][j];
            let curLink = new Link(preNode, node, weights[i][j]);
            preNode.outputLinks.push(curLink);
            node.inputLinks.push(curLink);
          }
          curLayerNodes.push(node);
        }
        break;
      }
      default:
        break;
    }

    // Add current layer to the NN
    nn.push(curLayerNodes);
    curLayerIndex++;
  }

  return nn;
}

const constructCNN = async (inputImageFile, model) => {
  // Load the image file
  let inputImageTensor = await getInputImageArray('/assets/img/koala.jpeg');

  // Need to feed the model with a batch
  let inputImageTensorBatch = tf.stack([inputImageTensor]);

  let result = model.predict(inputImageTensorBatch);
  result.print(true);

  // To get intermediate layer outputs, we will iterate through all layers in
  // the model, and sequencially build a new sub-model to do .predict() call

  // IMPROVE: one potential optimization is to build independent "two layer"
  // models, instead of stacking on previous model in each iteration. Therefore,
  // each iteration doesn't need to repeate computing "earlier" layers.
  // I failed to do this using tf.js.

  // A universal input layer
  let inputLayer = tf.input({shape: [64, 64, 3]});

  let preLayer = inputLayer;
  let outputs = [];

  // Iterate through all layers, and build one model with that layer as output
  for (let l = 0; l < model.layers.length; l++) {
    // Nesting on all previous layers
    let curLayer = model.layers[l].apply(preLayer);

    let curModel = tf.model({
      inputs: inputLayer,
      outputs: curLayer
    });

    // Record the output tensor
    // Because there is only one element in the batch, we use squeeze()
    // We also want to use CHW order here
    let output = curModel.predict(inputImageTensorBatch).squeeze();
    if (output.shape.length === 3) {
      output = output.transpose([2, 0, 1]);
    }
    outputs.push(output);

    // Update preLayer for next nesting iteration
    preLayer = curLayer;
  }

  console.log(model.layers[0].kernel.val.slice([0, 0, 0, 0], [3, 3, 1, 1]).squeeze());
  let nn = constructCNNFromOutputs(outputs, model, inputImageTensor);
  console.log(nn);
}

// Helper functions

/**
 * Convert canvas image data into a 3D tensor with dimension [height, width, 3].
 * Recall that tensorflow uses NHWC order (batch, height, width, channel).
 * Each pixel is in 0-255 scale.
 * @param {[int8]} imageData Canvas image data
 */
const imageDataTo3DTensor = async (imageData) => {
  // Get image dimension (assume square image)
  let width = Math.sqrt(imageData.length / 4);

  // Create array placeholder for the 3d array
  let imageArray = await tf.fill([width, width, 3], 0).array();
  
  // Iterate through the data to fill out channel arrays above
  for (let i = 0; i < imageData.length; i++) {
    let pixelIndex = Math.floor(i / 4),
      channelIndex = i % 4,
      row = Math.floor(pixelIndex / width),
      column = pixelIndex % width;
    
    if (channelIndex < 3) {
      imageArray[row][column][channelIndex] = imageData[i];
    }
  }

  let tensor = tf.tensor3d(imageArray);
  return tensor;
}

/**
 * Get the 3D pixel value array of the given image file.
 * @param {string} imgFile File path to the image file
 * @returns A promise with the corresponding 3D array
 */
const getInputImageArray = (imgFile) => {
  let canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:none;';
  document.getElementsByTagName('body')[0].appendChild(canvas);
  let context = canvas.getContext('2d');

  return new Promise((resolve, reject) => {
    let inputImage = new Image();
    inputImage.src = imgFile;
    inputImage.onload = () => {
      context.drawImage(inputImage, 0, 0,);
      // Get image data and convert it to a 3D array
      let imageData = context.getImageData(0, 0, inputImage.width,
        inputImage.height).data;

      // Remove this newly created canvas element
      canvas.parentNode.removeChild(canvas);

      imageDataTo3DTensor(imageData).then(imageTensor => resolve(imageTensor));
    }
    inputImage.onerror = reject;
  })
}

const loadTrainedModel = (modelFile) => {
  return tf.loadLayersModel(modelFile);
}

export const tempMain = async () => {
  tf.tensor([1,2,3,4]).print();
  let bb = tf.tensor2d([[1, 2], [3, 4]]);
  bb.print();
  
  let model = await loadTrainedModel('/assets/data/model.json');
  // model.layers[0].bias.val.array().then(d => console.log(d));
  constructCNN('/assets/img/koala.jpeg', model);
}