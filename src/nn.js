
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
   * @param {[number]} shape 2D shape of the current node.
   * @param {[number]} output Output of this node.
   */
  constructor(layerName, index, type, bias, shape, output) {
    this.layerName = layerName;
    this.index = index;
    this.type = type;
    this.bias = bias;
    this.shape = shape;
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
    let shape = inputShape.slice(0, 2);
    let output = new Array(inputShape[0] * inputShape[1]).fill(0);
    let node = new Node('input', i, nodeType.INPUT, 0, shape, output);
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
    let length = 0;
    if (curLayerType === nodeType.FLATTEN || curLayerType === nodeType.FC) {
      length = shape[0]
    } else {
      shape[0] * shape[1];
    }

    /* Add neurons into this layer */
    for (let i = 0; i < layer.num_neurons; i++) {
      if (curLayerType === nodeType.CONV || curLayerType === nodeType.FC) {
        bias = layer.weights[i].bias;
      }
      let node = new Node(layer.name, i, curLayerType, bias,
        layer.output_shape.slice(0, 2), new Array(length).fill(0))

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