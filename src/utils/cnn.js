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

const constructNNFromJSON = (nnJSON, inputImageArray) => {
  console.log(nnJSON);
  console.log(inputImageArray);
  let nn = [];

  // Add the first layer (input layer)
  let inputLayer = [];
  let inputShape = nnJSON[0].input_shape;

  // First layer's three nodes' outputs are the channels of inputImageArray
  for (let i = 0; i < inputShape[2]; i++) {
    let node = new Node('input', i, nodeType.INPUT, 0, inputImageArray[i]);
    inputLayer.push(node);
  }
                                                                                                                   
  nn.push(inputLayer);
  let curLayerIndex = 1;

  nnJSON.forEach(layer => {
    let curLayerNodes = [];
    let curLayerType;

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

    let shape = layer.output_shape.slice(0, 2);
    let bias = 0;
    let output;
    if (curLayerType === nodeType.FLATTEN || curLayerType === nodeType.FC) {
      output = 0;
    } else {
      output = init2DArray(shape[0], shape[1], 0);
    }

    // Add neurons into this layer
    for (let i = 0; i < layer.num_neurons; i++) {
      if (curLayerType === nodeType.CONV || curLayerType === nodeType.FC) {
        bias = layer.weights[i].bias;
      }
      let node = new Node(layer.name, i, curLayerType, bias, output)

      // Connect this node to all previous nodes (create links)
      if (curLayerType === nodeType.CONV || curLayerType === nodeType.FC) {
        // CONV and FC layers have weights in links. Links are one-to-multiple
        for (let j = 0; j < nn[curLayerIndex - 1].length; j++) {
          let preNode = nn[curLayerIndex - 1][j];
          let curLink = new Link(preNode, node, layer.weights[i].weights[j]);
          preNode.outputLinks.push(curLink);
          node.inputLinks.push(curLink);
        }
      } else if (curLayerType === nodeType.RELU || curLayerType === nodeType.POOL) {
        // RELU and POOL layers have no weights. Links are one-to-one
        let preNode = nn[curLayerIndex - 1][i];
        let link = new Link(preNode, node, null);
        preNode.outputLinks.push(link);
        node.inputLinks.push(link);
      } else if (curLayerType === nodeType.FLATTEN) {
        // Flatten layer has no weights. Links are multiple-to-one.
        // Use dummy weights to store the corresponding entry in the previsou
        // node as (row, column)
        // The flatten() in tf2.keras has order: channel -> row -> column
        let preNodeWidth = nn[curLayerIndex - 1][0].output.length,
          preNodeNum = nn[curLayerIndex - 1].length,
          preNodeIndex = i % preNodeNum,
          preNodeRow = Math.floor(Math.floor(i / preNodeNum) / preNodeWidth),
          preNodeCol = Math.floor(i / preNodeNum) % preNodeWidth,
          link = new Link(nn[curLayerIndex - 1][preNodeIndex],
            node, [preNodeRow, preNodeCol]);

        nn[curLayerIndex - 1][preNodeIndex].outputLinks.push(link);
        node.inputLinks.push(link);
      }
      curLayerNodes.push(node);
    }

    // Add current layer to the NN
    nn.push(curLayerNodes);
    curLayerIndex++;
  });

  return nn;
}

export const constructNN = (inputImageFile) => {
  // Load the saved model file
  return new Promise((resolve, reject) => {
    fetch('PUBLIC_URL/assets/data/nn_10.json')
      .then(response => {
        response.json().then(nnJSON => {
          getInputImageArray(inputImageFile)
            .then(inputImageArray => {
              let nn = constructNNFromJSON(nnJSON, inputImageArray);
              resolve(nn);
            })
        });
      })
      .catch(error => {
        reject(error);
      });
  });
}

// Helper functions

/**
 * Create a 2D array (matrix) with given size and default value.
 * 
 * @param {int} height Height (number of rows) for the matrix
 * @param {int} width Width (number of columns) for the matrix
 * @param {int} fill Default value to fill this matrix
 */
export const init2DArray = (height, width, fill) => {
  let array = [];
  // Itereate through rows
  for (let r = 0; r < height; r++) {
    let row = new Array(width).fill(fill);
    array.push(row);
  }
  return array;
}

/**
 * Dot product of two matrices.
 * @param {[[number]]} mat1 Matrix 1
 * @param {[[number]]} mat2 Matrix 2
 */
const matrixDot = (mat1, mat2) => {
  console.assert(mat1.length === mat2.length, 'Dimension not matching');
  console.assert(mat1[0].length === mat2[0].length, 'Dimension not matching');

  let result = 0;
  for (let i = 0; i < mat1.length; i++){
    for (let j = 0; j < mat1[0].length; j++){
      result += mat1[i][j] * mat2[i][j];
    }
  }
  
  return result;
}

/**
 * Matrix elementwise addition.
 * @param {[[number]]} mat1 Matrix 1
 * @param {[[number]]} mat2 Matrix 2
 */
export const matrixAdd = (mat1, mat2) => {
  console.assert(mat1.length === mat2.length, 'Dimension not matching');
  console.assert(mat1[0].length === mat2[0].length, 'Dimension not matching');

  let result = init2DArray(mat1.length, mat1.length, 0);

  for (let i = 0; i < mat1.length; i++) {
    for (let j = 0; j < mat1.length; j++) {
      result[i][j] = mat1[i][j] + mat2[i][j];
    }
  }

  return result;
}

/**
 * 2D slice on a matrix.
 * @param {[[number]]} mat Matrix
 * @param {int} xs First dimension (row) starting index
 * @param {int} xe First dimension (row) ending index
 * @param {int} ys Second dimension (column) starting index
 * @param {int} ye Second dimension (column) ending index
 */
export const matrixSlice = (mat, xs, xe, ys, ye) => {
  return mat.slice(xs, xe).map(s => s.slice(ys, ye));
}

/**
 * Compute the maximum of a matrix.
 * @param {[[number]]} mat Matrix
 */
const matrixMax = (mat) => {
  let curMax = -Infinity;
  for (let i = 0; i < mat.length; i++) {
    for (let j = 0; j < mat[0].length; j++) {
      if (mat[i][j] > curMax) {
        curMax = mat[i][j];
      }
    }
  }
  return curMax;
}

/**
 * Convert canvas image data into a 3D array with dimension [height, width, 3].
 * Each pixel is in 0-255 scale.
 * @param {[int8]} imageData Canvas image data
 */
const imageDataTo3DArray = (imageData) => {
  // Get image dimension (assume square image)
  let width = Math.sqrt(imageData.length / 4);

  // Create array placeholder for each channel
  let imageArray = [init2DArray(width, width, 0), init2DArray(width, width, 0),
    init2DArray(width, width, 0)];
  
  // Iterate through the data to fill out channel arrays above
  for (let i = 0; i < imageData.length; i++) {
    let pixelIndex = Math.floor(i / 4),
      channelIndex = i % 4,
      row = Math.floor(pixelIndex / width),
      column = pixelIndex % width;
    
    if (channelIndex < 3) {
      imageArray[channelIndex][row][column] = imageData[i];
    }
  }

  return imageArray;
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

      console.log(imageDataTo3DArray(imageData));
      resolve(imageDataTo3DArray(imageData));
    }
    inputImage.onerror = reject;
  })
}

/**
 * Compute convolutions of one kernel on one matrix (one slice of a tensor).
 * @param {[[number]]} input Input, square matrix
 * @param {[[number]]} kernel Kernel weights, square matrix
 * @param {int} stride Stride size
 * @param {int} padding Padding size
 */
export const singleConv = (input, kernel, stride=1, padding=0) => {
  // TODO: implement padding

  // Only support square input and kernel
  console.assert(input.length === input[0].length,
     'Conv input is not square');
  console.assert(kernel.length === kernel[0].length,
    'Conv kernel is not square');

  let stepSize = (input.length - kernel.length) / stride + 1;

  let result = init2DArray(stepSize, stepSize, 0);

  // Window sliding
  for (let r = 0; r < stepSize; r++) {
    for (let c = 0; c < stepSize; c++) {
      let curWindow = matrixSlice(input, r * stride, r * stride + kernel.length,
        c * stride, c * stride + kernel.length);
      let dot = matrixDot(curWindow, kernel);
      result[r][c] = dot;
    }
  }
  return result;
}

/**
 * Convolution operation. This function update the outputs property of all nodes
 * in the given layer. Previous layer is accessed by the reference in nodes'
 * links.
 * @param {[Node]} curLayer Conv layer.
 */
const convolute = (curLayer) => {
  console.assert(curLayer[0].type === 'conv', 'Wrong layer type');

  // Itereate through all nodes in curLayer to update their outputs
  curLayer.forEach(node => {
    /*
     * Accumulate the single conv result matrices from previous channels.
     * Previous channels (node) are accessed by the reference in Link objects.
     */
    let newOutput = init2DArray(node.output.length, node.output.length, 0);

    for (let i = 0; i < node.inputLinks.length; i++) {
      let curLink = node.inputLinks[i];
      let curConvResult = singleConv(curLink.source.output, curLink.weight);
      newOutput = matrixAdd(newOutput, curConvResult);
    }

    // Add bias to all element in the output
    let biasMatrix = init2DArray(newOutput.length, newOutput.length, node.bias);
    newOutput = matrixAdd(newOutput, biasMatrix);

    node.output = newOutput;
  })
}

/**
 * Activate matrix mat using ReLU (max(0, x)).
 * @param {[[number]]} mat Matrix
 */
const singleRelu = (mat) => {
  // Only support square matrix
  console.assert(mat.length === mat[0].length, 'Activating non-square matrix!');

  let width = mat.length;
  let result = init2DArray(width, width, 0);

  for (let i = 0; i < width; i++) {
    for (let j = 0; j < width; j++) {
      result[i][j] = Math.max(0, mat[i][j]);
    }
  }
  return result;
}

/**
 * Update outputs of all nodes in the current ReLU layer. Values of previous
 * layer nodes are accessed by the links stored in the current layer.
 * @param {[Node]} curLayer ReLU layer
 */
const relu = (curLayer) => {
  console.assert(curLayer[0].type === 'relu', 'Wrong layer type');

  // Itereate through all nodes in curLayer to update their outputs
  for (let i = 0; i < curLayer.length; i++) {
    let curNode = curLayer[i];
    let preNode = curNode.inputLinks[0].source;
    curNode.output = singleRelu(preNode.output);
  }
}

/**
 * Max pool one matrix.
 * @param {[[number]]} mat Matrix
 * @param {int} kernelWidth Pooling kernel length (only supports 2)
 * @param {int} stride Pooling sliding stride (only supports 2)
 * @param {string} padding Pading method when encountering odd number mat,
 * currently this function only supports 'VALID'
 */
export const singleMaxPooling = (mat, kernelWidth=2, stride=2, padding='VALID') => {
  console.assert(kernelWidth === 2, 'Only supports kernen = [2,2]');
  console.assert(stride === 2, 'Only supports stride = 2');
  console.assert(padding === 'VALID', 'Only support valid padding');

  // Handle odd length mat
  // 'VALID': ignore edge rows and columns
  // 'SAME': add zero padding to make the mat have even length
  if (mat.length % 2 === 1 && padding === 'VALID') {
    mat = matrixSlice(mat, 0, mat.length - 1, 0, mat.length - 1);
  }

  let stepSize = (mat.length - kernelWidth) / stride + 1;
  let result = init2DArray(stepSize, stepSize, 0);

  for (let r = 0; r < stepSize; r++) {
    for (let c = 0; c < stepSize; c++) {
      let curWindow = matrixSlice(mat, r * stride, r * stride + kernelWidth,
        c * stride, c * stride + kernelWidth);
      result[r][c] = matrixMax(curWindow);
    }
 }
 return result;
}

/**
 * Max pooling one layer.
 * @param {[Node]} curLayer MaxPool layer
 */
const maxPooling = (curLayer) => {
  console.assert(curLayer[0].type === 'pool', 'Wrong layer type');

  // Itereate through all nodes in curLayer to update their outputs
  for (let i = 0; i < curLayer.length; i++) {
    let curNode = curLayer[i];
    let preNode = curNode.inputLinks[0].source;
    curNode.output = singleMaxPooling(preNode.output);
  }
}

/**
 * Flatten a previous 2D layer (conv2d or maxpool2d). The flatten order matches
 * tf2.keras' implementation: channel -> row -> column.
 * @param {[Node]} curLayer Flatten layer
 */
const flatten = (curLayer) => {
  console.assert(curLayer[0].type === 'flatten', 'Wrong layer type');

  // Itereate through all nodes in curLayer to update their outputs
  for (let i = 0; i < curLayer.length; i++) {
    let curNode = curLayer[i];
    let preNode = curNode.inputLinks[0].source;
    let coordinate = curNode.inputLinks[0].weight;
    // Take advantage of the dummy weights
    curNode.output = preNode.output[coordinate[0]][coordinate[1]];
  }
}

const fullyConnect = (curLayer) => {
  console.assert(curLayer[0].type === 'fc', 'Wrong layer type');
  // TODO
}

export const tempMain = async () => {
  let nn = await constructNN('PUBLIC_URL/assets/img/koala.jpeg');
  convolute(nn[1]);
  relu(nn[2])
  convolute(nn[3]);
  relu(nn[4]);
  maxPooling(nn[5]);
  convolute(nn[6]);
  relu(nn[7])
  convolute(nn[8]);
  relu(nn[9]);
  maxPooling(nn[10]);
  convolute(nn[11]);
  relu(nn[12])
  convolute(nn[13]);
  relu(nn[14]);
  maxPooling(nn[15]);
  flatten(nn[16]);
  console.log(nn[16].map(d => d.output));
}