<script>
  import { createEventDispatcher } from 'svelte';
  import { array1d, getMatrixSliceFromOutputHighlights,
    compute_input_multiplies_with_weight, getDataRange,
    getVisualizationSizeConstraint, generateOutputMappings,
    getMatrixSliceFromInputHighlights, gridData
  } from './DetailviewUtils.js';
  import Dataview from './Dataview.svelte';
  import KernelMathView from './KernelMathView.svelte';
  // image: nxn array -- prepadded.
  // kernel: mxm array.
  // stride: int
  export let stride;
  export let dilation
  export let kernel;
  export let image;
  export let output;
  export let isPaused;
  export let dataRange;
  export let colorScale;
  export let isInputInputLayer = false;

  const dispatch = createEventDispatcher();
  const padding = 0;
  let padded_input_size = image.length + padding * 2;
  $: padded_input_size = image.length + padding * 2;

  // Dummy data for original state of component.
  let testInputMatrixSlice = [];
  for (let i = 0; i < kernel.length; i++) {
    testInputMatrixSlice.push([]);
    for (let j = 0; j < kernel.length; j++) {
      testInputMatrixSlice[i].push(0)
    }
  }
  testInputMatrixSlice = gridData(testInputMatrixSlice)
  let testOutputMatrixSlice = gridData([0]);

  let inputHighlights = [];
  let outputHighlights = array1d(output.length * output.length, (i) => true);
  let interval;
  $ : {
    let inputHighlights = [];
    let outputHighlights = array1d(output.length * output.length, (i) => true);
    let interval;
  }

  let counter;
  // lots of replication between mouseover and start-conv. TODO: fix this.
  function startConvolution(stride) {
    counter = 0;
    let outputMappings = generateOutputMappings(stride, output, kernel.length, padded_input_size, dilation);
    if (stride <= 0) return;
    if (interval) clearInterval(interval);
    interval = setInterval(() => {
      if (isPaused) return;
      const flat_animated = counter % (output.length * output.length);
      outputHighlights = array1d(output.length * output.length, (i) => false);
      const animatedH = Math.floor(flat_animated / output.length);
      const animatedW = flat_animated % output.length;
      outputHighlights[animatedH * output.length + animatedW] = true;
      inputHighlights = compute_input_multiplies_with_weight(animatedH, animatedW, padded_input_size, kernel.length, outputMappings, kernel.length)
      const inputMatrixSlice = getMatrixSliceFromInputHighlights(image, inputHighlights, kernel.length);
      testInputMatrixSlice = gridData(inputMatrixSlice);
      const outputMatrixSlice = getMatrixSliceFromOutputHighlights(output, outputHighlights);
      testOutputMatrixSlice = gridData(outputMatrixSlice);
      counter++;
    }, 250)
  }

  function handleMouseover(event) {
    let outputMappings = generateOutputMappings(stride, output, kernel.length, padded_input_size, dilation);
    outputHighlights = array1d(output.length * output.length, (i) => false);
    const animatedH = event.detail.hoverH;
    const animatedW = event.detail.hoverW;
    outputHighlights[animatedH * output.length + animatedW] = true;
    inputHighlights = compute_input_multiplies_with_weight(animatedH, animatedW, padded_input_size, kernel.length, outputMappings, kernel.length)
    const inputMatrixSlice = getMatrixSliceFromInputHighlights(image, inputHighlights, kernel.length);
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

<style>
  .column {
    padding: 5px;
  }
</style>

<div class="column has-text-centered">
  <div class="header-text">
    Input ({image.length}, {image[0].length})
  </div>
  <Dataview on:message={handleMouseover} data={testImage} highlights={inputHighlights} outputLength={output.length}
      isKernelMath={false} constraint={getVisualizationSizeConstraint(image.length)}
      dataRange={dataRange} stride={stride} colorScale={colorScale}
      isInputLayer={isInputInputLayer}/>
</div>
<div class="column has-text-centered">
  <KernelMathView data={testInputMatrixSlice} kernel={testKernel} constraint={getVisualizationSizeConstraint(kernel.length)}
                  dataRange={dataRange} kernelRange={getDataRange(kernel)} colorScale={colorScale}
                  isInputLayer={isInputInputLayer}/>
  <Dataview data={testOutputMatrixSlice} highlights={outputHighlights} isKernelMath={true} 
      constraint={getVisualizationSizeConstraint(kernel.length)} dataRange={dataRange}/>
</div>
<div class="column has-text-centered">
  <div class="header-text">
    Output ({output.length}, {output[0].length})
  </div>
  <Dataview on:message={handleMouseover} data={testOutput} highlights={outputHighlights} isKernelMath={false}
      outputLength={output.length} constraint={getVisualizationSizeConstraint(output.length)} dataRange={dataRange} stride={stride}/>
</div>