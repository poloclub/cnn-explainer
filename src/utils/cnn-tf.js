/* global tf */

// Network input image size
const networkInputSize = 64;

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
   * @param {number[]} output Output of this node.
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
  /**
   * Class structure for each link between two nodes.
   * 
   * @param {Node} source Source node.
   * @param {Node} dest Target node.
   * @param {number} weight Weight associated to this link. It can be a number,
   *  1D array, or 2D array.
   */
  constructor(source, dest, weight) {
    this.source = source;
    this.dest = dest;
    this.weight = weight;
  }
}

/**
 * Construct a CNN with given extracted outputs from every layer.
 * 
 * @param {number[][]} allOutputs Array of outputs for each layer.
 *  allOutputs[i][j] is the output for layer i node j.
 * @param {Model} model Loaded tf.js model.
 * @param {Tensor} inputImageTensor Loaded input image tensor.
 */
const constructCNNFromOutputs = (allOutputs, model, inputImageTensor) => {
  let cnn = [];

  // Add the first layer (input layer)
  let inputLayer = [];
  let inputShape = model.layers[0].batchInputShape.slice(1);
  let inputImageArray = inputImageTensor.transpose([2, 0, 1]).arraySync();

  // First layer's three nodes' outputs are the channels of inputImageArray
  for (let i = 0; i < inputShape[2]; i++) {
    let node = new Node('input', i, nodeType.INPUT, 0, inputImageArray[i]);
    inputLayer.push(node);
  }
                                                                                                                   
  cnn.push(inputLayer);
  let curLayerIndex = 1;

  for (let l = 0; l < model.layers.length; l++) {
    let layer = model.layers[l];
    // Get the current output
    let outputs = allOutputs[l].squeeze();
    outputs = outputs.arraySync();

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
          for (let j = 0; j < cnn[curLayerIndex - 1].length; j++) {
            let preNode = cnn[curLayerIndex - 1][j];
            let curLink = new Link(preNode, node, weights[i][j]);
            preNode.outputLinks.push(curLink);
            node.inputLinks.push(curLink);
          }
          curLayerNodes.push(node);
        }
        break;
      }
      case nodeType.FC: {
        let biases = layer.bias.val.arraySync();
        // The new order is [output_depth, input_depth]
        let weights = layer.kernel.val.transpose([1, 0]).arraySync();

        // Add nodes into this layer
        for (let i = 0; i < outputs.length; i++) {
          let node = new Node(layer.name, i, curLayerType, biases[i],
            outputs[i]);

          // Connect this node to all previous nodes (create links)
          // FC layers have weights in links. Links are one-to-multiple.

          // Since we are visualizing the logit values, we need to track
          // the raw value before softmax
          let curLogit = 0;
          for (let j = 0; j < cnn[curLayerIndex - 1].length; j++) {
            let preNode = cnn[curLayerIndex - 1][j];
            let curLink = new Link(preNode, node, weights[i][j]);
            preNode.outputLinks.push(curLink);
            node.inputLinks.push(curLink);
            curLogit += preNode.output * weights[i][j];
          }
          curLogit += biases[i];
          node.logit = curLogit;
          curLayerNodes.push(node);
        }

        // Sort flatten layer based on the node TF index
        cnn[curLayerIndex - 1].sort((a, b) => a.realIndex - b.realIndex);
        break;
      }
      case nodeType.RELU:
      case nodeType.POOL: {
        // RELU and POOL have no bias nor weight
        let bias = 0;
        let weight = null;

        // Add nodes into this layer
        for (let i = 0; i < outputs.length; i++) {
          let node = new Node(layer.name, i, curLayerType, bias, outputs[i]);

          // RELU and POOL layers have no weights. Links are one-to-one
          let preNode = cnn[curLayerIndex - 1][i];
          let link = new Link(preNode, node, weight);
          preNode.outputLinks.push(link);
          node.inputLinks.push(link);

          curLayerNodes.push(node);
        }
        break;
      }
      case nodeType.FLATTEN: {
        // Flatten layer has no bias nor weights.
        let bias = 0;

        for (let i = 0; i < outputs.length; i++) {
          // Flatten layer has no weights. Links are multiple-to-one.
          // Use dummy weights to store the corresponding entry in the previsou
          // node as (row, column)
          // The flatten() in tf2.keras has order: channel -> row -> column
          let preNodeWidth = cnn[curLayerIndex - 1][0].output.length,
            preNodeNum = cnn[curLayerIndex - 1].length,
            preNodeIndex = i % preNodeNum,
            preNodeRow = Math.floor(Math.floor(i / preNodeNum) / preNodeWidth),
            preNodeCol = Math.floor(i / preNodeNum) % preNodeWidth,
            // Use channel, row, colume to compute the real index with order
            // row -> column -> channel
            curNodeRealIndex = preNodeIndex * (preNodeWidth * preNodeWidth) +
              preNodeRow * preNodeWidth + preNodeCol;
          
          let node = new Node(layer.name, i, curLayerType,
              bias, outputs[i]);
          
          // TF uses the (i) index for computation, but the real order should
          // be (curNodeRealIndex). We will sort the nodes using the real order
          // after we compute the logits in the output layer.
          node.realIndex = curNodeRealIndex;

          let link = new Link(cnn[curLayerIndex - 1][preNodeIndex],
              node, [preNodeRow, preNodeCol]);

          cnn[curLayerIndex - 1][preNodeIndex].outputLinks.push(link);
          node.inputLinks.push(link);

          curLayerNodes.push(node);
        }

        // Sort flatten layer based on the node TF index
        curLayerNodes.sort((a, b) => a.index - b.index);
        break;
      }
      default:
        console.error('Encounter unknown layer type');
        break;
    }

    // Add current layer to the NN
    cnn.push(curLayerNodes);
    curLayerIndex++;
  }

  return cnn;
}

/**
 * Construct a CNN with given model and input.
 * 
 * @param {string} inputImageFile filename of input image.
 * @param {Model} model Loaded tf.js model.
 */
export const constructCNN = async (inputImageFile, model) => {
  // Load the image file
  let inputImageTensor = await getInputImageArray(inputImageFile, true);

  // Need to feed the model with a batch
  let inputImageTensorBatch = tf.stack([inputImageTensor]);

  // To get intermediate layer outputs, we will iterate through all layers in
  // the model, and sequencially apply transformations.
  let preTensor = inputImageTensorBatch;
  let outputs = [];

  // Iterate through all layers, and build one model with that layer as output
  for (let l = 0; l < model.layers.length; l++) {
    let curTensor = model.layers[l].apply(preTensor);

    // Record the output tensor
    // Because there is only one element in the batch, we use squeeze()
    // We also want to use CHW order here
    let output = curTensor.squeeze();
    if (output.shape.length === 3) {
      output = output.transpose([2, 0, 1]);
    }
    outputs.push(output);

    // Update preTensor for next nesting iteration
    preTensor = curTensor;
  }

  let cnn = constructCNNFromOutputs(outputs, model, inputImageTensor);
  return cnn;
}

// Helper functions

/**
 * Crop the largest central square of size 64x64x3 of a 3d array.
 * 
 * @param {[int8]} arr array that requires cropping and padding (if a 64x64 crop
 * is not present)
 * @returns 64x64x3 array
 */
const cropCentralSquare = (arr) => {
  let width = arr.length;
  let height = arr[0].length;
  let croppedArray;

  // Crop largest square from image if the image is smaller than 64x64 and pad the
  // cropped image.
  if (width < networkInputSize || height < networkInputSize) {
    // TODO(robert): Finish the padding logic.  Pushing now for Omar to work on when he is ready.
    let cropDimensions = Math.min(width, height);
    let startXIdx = Math.floor(width / 2) - (cropDimensions / 2);
    let startYIdx = Math.floor(height / 2) - (cropDimensions / 2);
    let unpaddedSubarray = arr.slice(startXIdx, startXIdx + cropDimensions).map(i => i.slice(startYIdx, startYIdx + cropDimensions));
  } else {
    let startXIdx = Math.floor(width / 2) - Math.floor(networkInputSize / 2);
    let startYIdx = Math.floor(height / 2) - Math.floor(networkInputSize / 2);
    croppedArray = arr.slice(startXIdx, startXIdx + networkInputSize).map(i => i.slice(startYIdx, startYIdx + networkInputSize));
  }
  return croppedArray;
}

/**
 * Convert canvas image data into a 3D tensor with dimension [height, width, 3].
 * Recall that tensorflow uses NHWC order (batch, height, width, channel).
 * Each pixel is in 0-255 scale.
 * 
 * @param {[int8]} imageData Canvas image data
 * @param {int} width Canvas image width
 * @param {int} height Canvas image height
 */
const imageDataTo3DTensor = (imageData, width, height, normalize=true) => {
  // Create array placeholder for the 3d array
  let imageArray = tf.fill([width, height, 3], 0).arraySync();

  // Iterate through the data to fill out channel arrays above
  for (let i = 0; i < imageData.length; i++) {
    let pixelIndex = Math.floor(i / 4),
      channelIndex = i % 4,
      row = width === height ? Math.floor(pixelIndex / width)
                              : pixelIndex % width,
      column = width === height ? pixelIndex % width
                              : Math.floor(pixelIndex / width);
    
    if (channelIndex < 3) {
      let curEntry  = imageData[i];
      // Normalize the original pixel value from [0, 255] to [0, 1]
      if (normalize) {
        curEntry /= 255;
      }
      imageArray[row][column][channelIndex] = curEntry;
    }
  }

  // If the image is not 64x64, crop and or pad the image appropriately.
  if (width != networkInputSize && height != networkInputSize) {
    imageArray = cropCentralSquare(imageArray)
  }

  let tensor = tf.tensor3d(imageArray);
  return tensor;
}

/**
 * Get the 3D pixel value array of the given image file.
 * 
 * @param {string} imgFile File path to the image file
 * @returns A promise with the corresponding 3D array
 */
const getInputImageArray = (imgFile, normalize=true) => {
  let canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:none;';
  document.getElementsByTagName('body')[0].appendChild(canvas);
  let context = canvas.getContext('2d');

  return new Promise((resolve, reject) => {
    let inputImage = new Image();
    inputImage.crossOrigin = "Anonymous";
    inputImage.src = imgFile;
    let canvasImage;
    inputImage.onload = () => {
      canvas.width = inputImage.width;
      canvas.height = inputImage.height;
      // Resize the input image of the network if it is too large to simply crop
      // the center 64x64 portion in order to still provide a representative
      // input image into the network.
      if (inputImage.width > networkInputSize || inputImage.height > networkInputSize) {
        // Step 1 - Resize using smaller dimension to scale the image down. 
        let resizeCanvas = document.createElement('canvas'),
            resizeContext = resizeCanvas.getContext('2d');
        let smallerDimension = Math.min(inputImage.width, inputImage.height);
        const resizeFactor = (networkInputSize + 1) / smallerDimension;
        resizeCanvas.width = inputImage.width * resizeFactor;
        resizeCanvas.height = inputImage.height * resizeFactor;
        resizeContext.drawImage(inputImage, 0, 0, resizeCanvas.width,
          resizeCanvas.height);

        // Step 2 - Flip non-square images horizontally and rotate them 90deg since
        // non-square images are not stored upright.
        if (inputImage.width != inputImage.height) {
          context.translate(resizeCanvas.width, 0);
          context.scale(-1, 1);
          context.translate(resizeCanvas.width / 2, resizeCanvas.height / 2);
          context.rotate(90 * Math.PI / 180);
        }

        // Step 3 - Draw resized image on original canvas.
        if (inputImage.width != inputImage.height) {
          context.drawImage(resizeCanvas, -resizeCanvas.width / 2, -resizeCanvas.height / 2);
        } else {
          context.drawImage(resizeCanvas, 0, 0);
        }
        canvasImage = context.getImageData(0, 0, resizeCanvas.width,
          resizeCanvas.height);

      } else {
        context.drawImage(inputImage, 0, 0);
        canvasImage = context.getImageData(0, 0, inputImage.width,
          inputImage.height);
      }
      // Get image data and convert it to a 3D array
      let imageData = canvasImage.data;
      let imageWidth = canvasImage.width;
      let imageHeight = canvasImage.height;

      // Remove this newly created canvas element
      canvas.parentNode.removeChild(canvas);

      resolve(imageDataTo3DTensor(imageData, imageWidth, imageHeight, normalize));
    }
    inputImage.onerror = reject;
  })
}

/**
 * Wrapper to load a model.
 * 
 * @param {string} modelFile Filename of converted (through tensorflowjs.py)
 *  model json file.
 */
export const loadTrainedModel = (modelFile) => {
  return tf.loadLayersModel(modelFile);
}
