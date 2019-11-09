
/* Enum of node types */
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

    /* Weights are stored in the links */
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

const constructNNFromJSON = (nnJSON) => {
  console.log(nnJSON);
  let nn = [];

  /* Add the first layer (input layer) */
  let inputLayer = [];
  let inputShape = nnJSON[0].input_shape;

  for (let i = 0; i < inputShape[2]; i++) {
    let output = init2DArray(inputShape[0], inputShape[1], 0);
    let node = new Node('input', i, nodeType.INPUT, 0, output);
    inputLayer.push(node);
  }

  nn.push(inputLayer);

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
      output = new Array(shape[0]).fill(0);
    } else {
      output = init2DArray(shape[0], shape[1], 0);
    }

    /* Add neurons into this layer */
    for (let i = 0; i < layer.num_neurons; i++) {
      if (curLayerType === nodeType.CONV || curLayerType === nodeType.FC) {
        bias = layer.weights[i].bias;
      }
      let node = new Node(layer.name, i, curLayerType, bias, output)

      /* TODO: Connect this node to all previous nodes (create links) */

      curLayerNodes.push(node);
    }

    /* Add current layer to the NN */
    nn.push(curLayerNodes);
  });

  return nn;
}

export const constructNN = () => {
  /* Load the saved model file */
  return new Promise((resolve, reject) => {
    fetch('/assets/data/nn_10.json')
      .then(response => {
        response.json().then(nnJSON => {
          let nn = constructNNFromJSON(nnJSON);
          resolve(nn);
        });
      })
      .catch(error => {
        reject(error);
      });
  });
}

/* Helper functions */
const init2DArray = (height, width, fill) => {
  let array = [];
  /* Itereate through rows */
  for (let r = 0; r < height; r++) {
    let row = new Array(width).fill(fill);
    array.push(row);
  }
  return array;
}