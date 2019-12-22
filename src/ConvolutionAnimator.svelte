<script>
  import Dataview from './Dataview.svelte';
  import { matrixSlice } from './cnn.js';
  // image: nxn array -- prepadded.
  // kernel: mxm array.
  // stride: int
  export let stride;
  export let dilation
  export let kernel;
  export let image;
  export let output;
  export let isPaused;

  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
  const padding = 0;
  let padded_input_size = image.length + padding * 2;
  $: padded_input_size = image.length + padding * 2;

  function array1d(length, f) {
    return Array.from({length: length}, f ? ((v, i) => f(i)) : undefined);
  }

  function array2d(height, width, f) {
    return Array.from({length: height}, (v, i) => Array.from({length: width}, f ? ((w, j) => f(i, j)) : undefined));
  }

  function generateOutputMappings(stride) {
    const outputMapping = array2d(output.length, output.length, (i, j) => array2d(kernel.length, kernel.length));
    for (let h_out = 0; h_out < output.length; h_out++) {
      for (let w_out = 0; w_out < output.length; w_out++) {
        for (let h_kern = 0; h_kern < kernel.length; h_kern++) {
          for (let w_kern = 0; w_kern < kernel.length; w_kern++) {
            const h_im = h_out * stride + h_kern * dilation;
            const w_im = w_out * stride + w_kern * dilation;
            outputMapping[h_out][w_out][h_kern][w_kern] = h_im * padded_input_size + w_im;
          }
        }
      }
    }
    return outputMapping;
  }

  function compute_input_multiplies_with_weight(hoverH, hoverW, 
                                                padded_input_size, weight_dims, outputMappings) {
    
    const [h_weight, w_weight] = weight_dims;
    const input_multiplies_with_weight = array1d(padded_input_size * padded_input_size);
    for (let h_weight = 0; h_weight < kernel.length; h_weight++) {
      for (let w_weight = 0; w_weight < kernel.length; w_weight++) {
        const flat_input = outputMappings[hoverH][hoverW][h_weight][w_weight];
        if (typeof flat_input === "undefined") continue;
        input_multiplies_with_weight[flat_input] = [h_weight, w_weight];
      }
    }
    return input_multiplies_with_weight;
  }

  function getMatrixSliceFromInputHighlights(matrix, highlights) {
    var indices = highlights.reduce((total, value, index) => {
    if (value != undefined) total.push(index);
      return total;
    }, []);
    return matrixSlice(matrix, Math.floor(indices[0] / matrix.length), Math.floor(indices[0] / matrix.length) + kernel.length, indices[0] % matrix.length, indices[0] % matrix.length + kernel.length);
  }

  function getMatrixSliceFromOutputHighlights(matrix, highlights) {
    var indices = highlights.reduce((total, value, index) => {
    if (value != false) total.push(index);
      return total;
    }, []);
    return matrixSlice(matrix, Math.floor(indices[0] / matrix.length), Math.floor(indices[0] / matrix.length) + 1, indices[0] % matrix.length, indices[0] % matrix.length + 1);
  }

  // Edit these values to change size of low-level conv visualization.
  function getVisualizationSizeConstraint(image) {
    let sizeOfGrid = 150;
    let maxSizeOfGridCell = 20;
    return sizeOfGrid / image.length > maxSizeOfGridCell ? maxSizeOfGridCell : sizeOfGrid / image.length
  }

  function getDataRange(image) {
    let maxRow = image.map(function(row){ return Math.max.apply(Math, row); });
    let max = Math.max.apply(null, maxRow);
    let minRow = image.map(function(row){ return Math.min.apply(Math, row); });
    let min = Math.min.apply(null, minRow);
    return Math.max(Math.abs(min), Math.abs(max));
  }

  let constraint;

  function gridData(image) {
    // Constrain grids based on input image size.
    constraint = getVisualizationSizeConstraint(image);
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

  let testInputMatrixSlice = [];
  let testOutputMatrixSlice = [];
  let inputHighlights = [];
  let outputHighlights = array1d(output.length * output.length, (i) => true);
  let interval;
  $ : {
    let inputHighlights = [];
    let outputHighlights = array1d(output.length * output.length, (i) => true);
    let interval;
  }
  
  let counter;

  function startConvolution(stride) {
    counter = 0;
    let outputMappings = generateOutputMappings(stride);
    if (stride <= 0) return;
    if (interval) clearInterval(interval);
    interval = setInterval(() => {
      if (isPaused) return;
      const flat_animated = counter % (output.length * output.length);
      outputHighlights = array1d(output.length * output.length, (i) => false);
      const animatedH = Math.floor(flat_animated / output.length);
      const animatedW = flat_animated % output.length;
      outputHighlights[animatedH * output.length + animatedW] = true;
      inputHighlights = compute_input_multiplies_with_weight(animatedH, animatedW, padded_input_size, kernel.length, outputMappings)
      const inputMatrixSlice = getMatrixSliceFromInputHighlights(image, inputHighlights);
      testInputMatrixSlice = gridData(inputMatrixSlice);
      const outputMatrixSlice = getMatrixSliceFromOutputHighlights(output, outputHighlights);
      testOutputMatrixSlice = gridData(outputMatrixSlice);
      counter++;
    }, 1000)
  }

  function handleMouseover(event) {
    let outputMappings = generateOutputMappings(stride);
    outputHighlights = array1d(output.length * output.length, (i) => false);
    const animatedH = event.detail.hoverH;
    const animatedW = event.detail.hoverW;
    outputHighlights[animatedH * output.length + animatedW] = true;
    inputHighlights = compute_input_multiplies_with_weight(animatedH, animatedW, padded_input_size, kernel.length, outputMappings)
    const inputMatrixSlice = getMatrixSliceFromInputHighlights(image, inputHighlights);
    testInputMatrixSlice = gridData(inputMatrixSlice);
    const outputMatrixSlice = getMatrixSliceFromOutputHighlights(output, outputHighlights);
    testOutputMatrixSlice = gridData(outputMatrixSlice);
    isPaused = true;
    dispatch('message', {
      text: isPaused
    });
  }

  startConvolution(stride);
  let testImage = gridData(image)
  let testOutput = gridData(output)
  let testKernel = gridData(kernel)
  $ : {
    startConvolution(stride);
    testImage = gridData(image)
    testOutput = gridData(output)
    testKernel = gridData(kernel)
  }
</script>



<div class="column has-text-centered">
  <header>
    Input
  </header>
  <Dataview on:message={handleMouseover} data={testImage} highlights={inputHighlights} outputLength={output.length}
      isKernelMath={false} constraint={getVisualizationSizeConstraint(image)} dataRange={getDataRange(image)}/>  
</div>
<div class="column has-text-centered">
  <header>
    Kernel
  </header>
  <Dataview data={testKernel} highlights={outputHighlights} isKernelMath={true} 
    constraint={getVisualizationSizeConstraint(kernel)} dataRange={getDataRange(kernel)}/>
  <body>
    &#183;
  </body>  
  <Dataview data={testInputMatrixSlice} highlights={outputHighlights} isKernelMath={true} constraint={getVisualizationSizeConstraint(kernel)} dataRange={getDataRange(image)}/>
  <body>
    =
  </body> 
  <Dataview data={testOutputMatrixSlice} highlights={outputHighlights} isKernelMath={true} constraint={getVisualizationSizeConstraint(kernel)} dataRange={getDataRange(output)}/>
</div>
<div class="column has-text-centered">
  <header>
    Output
  </header>
  <Dataview on:message={handleMouseover} data={testOutput} highlights={outputHighlights} isKernelMath={false} outputLength={output.length}
      constraint={getVisualizationSizeConstraint(output)} dataRange={getDataRange(output)}/>
</div>