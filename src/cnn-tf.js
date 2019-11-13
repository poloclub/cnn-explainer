import * as tf from '@tensorflow/tfjs';

const constructCNN = async (inputImageFile, model) => {
  // Load the image file
  let inputImageTensor = await getInputImageArray('/assets/img/koala.jpeg');

  // Need to feed the model with a batch
  let inputImageTensorBatch = tf.stack([inputImageTensor]);
  inputImageTensorBatch.print();

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
    // Because there is only one element in the batch, we use [0] here
    outputs.push(curModel.predict(inputImageTensorBatch));

    // Update preLayer for next nesting iteration
    preLayer = curLayer;
  }

  outputs.map(d => d.print());

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
  constructCNN('/assets/img/koala.jpeg', model);
}