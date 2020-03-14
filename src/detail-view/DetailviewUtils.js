import { matrixSlice } from '../utils/cnn.js';

export function array1d(length, f) {
  return Array.from({length: length}, f ? ((v, i) => f(i)) : undefined);
}

function array2d(height, width, f) {
  return Array.from({length: height}, (v, i) => Array.from({length: width}, f ? ((w, j) => f(i, j)) : undefined));
}

export function generateOutputMappings(stride, output, kernelLength, padded_input_size, dilation) {
  const outputMapping = array2d(output.length, output.length, (i, j) => array2d(kernelLength, kernelLength));
  for (let h_out = 0; h_out < output.length; h_out++) {
    for (let w_out = 0; w_out < output.length; w_out++) {
      for (let h_kern = 0; h_kern < kernelLength; h_kern++) {
        for (let w_kern = 0; w_kern < kernelLength; w_kern++) {
          const h_im = h_out * stride + h_kern * dilation;
          const w_im = w_out * stride + w_kern * dilation;
          outputMapping[h_out][w_out][h_kern][w_kern] = h_im * padded_input_size + w_im;
        }
      }
    }
  }
  return outputMapping;
}

export function compute_input_multiplies_with_weight(hoverH, hoverW, 
                                              padded_input_size, weight_dims, outputMappings, kernelLength) {
  
  const [h_weight, w_weight] = weight_dims;
  const input_multiplies_with_weight = array1d(padded_input_size * padded_input_size);
  for (let h_weight = 0; h_weight < kernelLength; h_weight++) {
    for (let w_weight = 0; w_weight < kernelLength; w_weight++) {
      const flat_input = outputMappings[hoverH][hoverW][h_weight][w_weight];
      if (typeof flat_input === "undefined") continue;
      input_multiplies_with_weight[flat_input] = [h_weight, w_weight];
    }
  }
  return input_multiplies_with_weight;
}

export function getMatrixSliceFromInputHighlights(matrix, highlights, kernelLength) {
  var indices = highlights.reduce((total, value, index) => {
  if (value != undefined) total.push(index);
    return total;
  }, []);
  return matrixSlice(matrix, Math.floor(indices[0] / matrix.length), Math.floor(indices[0] / matrix.length) + kernelLength, indices[0] % matrix.length, indices[0] % matrix.length + kernelLength);
}

export function getMatrixSliceFromOutputHighlights(matrix, highlights) {
  var indices = highlights.reduce((total, value, index) => {
  if (value != false) total.push(index);
    return total;
  }, []);
  return matrixSlice(matrix, Math.floor(indices[0] / matrix.length), Math.floor(indices[0] / matrix.length) + 1, indices[0] % matrix.length, indices[0] % matrix.length + 1);
}

// Edit these values to change size of low-level conv visualization.
export function getVisualizationSizeConstraint(imageLength) {
  let sizeOfGrid = 150;
  let maxSizeOfGridCell = 20;
  return sizeOfGrid / imageLength > maxSizeOfGridCell ? maxSizeOfGridCell : sizeOfGrid / imageLength;
}

export function getDataRange(image) {
  let maxRow = image.map(function(row){ return Math.max.apply(Math, row); });
  let max = Math.max.apply(null, maxRow);
  let minRow = image.map(function(row){ return Math.min.apply(Math, row); });
  let min = Math.min.apply(null, minRow);
  let range = {
    range: 2 * Math.max(Math.abs(min), Math.abs(max)),
    min: min,
    max: max
  };
  return range;
}

export function gridData(image, constraint=getVisualizationSizeConstraint(image.length)) {
  // Constrain grids based on input image size.
  var data = new Array();
  var xpos = 1;
  var ypos = 1;
  var width = constraint;
  var height = constraint;
  for (var row = 0; row < image.length; row++) {
    data.push( new Array() );
    for (var column = 0; column < image[0].length; column++) {
      data[row].push({
        text: Math.round(image[row][column] * 100) / 100,
        row: row,
        col: column,
        x: xpos,
        y: ypos,
        width: width,
        height: height
      })
      xpos += width;
    }
    xpos = 1;
    ypos += height; 
  }
  return data;
}