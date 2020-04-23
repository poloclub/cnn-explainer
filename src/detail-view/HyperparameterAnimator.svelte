<script>
  import { createEventDispatcher } from 'svelte';
  import { array1d, compute_input_multiplies_with_weight,
          generateOutputMappings, gridData
  } from './DetailviewUtils.js';
  import HyperparameterDataview from './HyperparameterDataview.svelte';
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
  export let padding;
  export let isStrideValid;

  const dispatch = createEventDispatcher();

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
    isPaused = false;
    dispatch('message', {
      text: isPaused
    });
    let outputMappings = generateOutputMappings(stride, output, kernel.length, image.length, dilation);
    if (stride <= 0) return;
    if (interval) clearInterval(interval);
    interval = setInterval(() => {
      if (isPaused || !isStrideValid) return;
      const flat_animated = counter % (output.length * output.length);
      outputHighlights = array1d(output.length * output.length, (i) => false);
      const animatedH = Math.floor(flat_animated / output.length);
      const animatedW = flat_animated % output.length;
      outputHighlights[animatedH * output.length + animatedW] = true;
      inputHighlights = compute_input_multiplies_with_weight(animatedH, animatedW, image.length, kernel.length, outputMappings, kernel.length)
      counter++;
    }, 1000)
  }

  function handleMouseover(event) {
    let outputMappings = generateOutputMappings(stride, output, kernel.length, image.length, dilation);
    outputHighlights = array1d(output.length * output.length, (i) => false);
    const animatedH = event.detail.hoverH;
    const animatedW = event.detail.hoverW;
    outputHighlights[animatedH * output.length + animatedW] = true;
    inputHighlights = compute_input_multiplies_with_weight(animatedH, animatedW, image.length, kernel.length, outputMappings, kernel.length)
    isPaused = true;
    dispatch('message', {
      text: isPaused
    });
  }

  // Fix the total grid size to change hyperparameters without changing the grid
  // size.  This must be two pixels smaller than the HyperparameterDataview svg
  // size, so that the stroke on the right side of the grid does not get cut off.
  const gridSize = 198;
  startConvolution(stride);
  let testImage = gridData(image, gridSize / image.length);
  let testOutput = gridData(output, gridSize / output.length);
  let testKernel = gridData(kernel, gridSize / kernel.length);
  $ : {
    startConvolution(stride);
    testImage = gridData(image, gridSize / image.length);
    testOutput = gridData(output, gridSize / output.length);
    testKernel = gridData(kernel, gridSize / kernel.length);
  }
</script>

<style>
  .wrapper {
    display: flex;
    flex-direction: row;
    align-items: flex-end;
  }

  .column {
    padding: 5px 10px 10px 10px;
  }

  .header-text {
    line-height: 1.1;
  }

  .header-sub-text {
    font-size: 13px;
    color: #9a9a9a;
    margin-bottom: 2px;
  }
</style>

<div class="wrapper">
  <div class="column has-text-centered">
    <div class="header-text">
      Input ({image.length - 2 * padding}, {image.length - 2 * padding}) <br/>
    </div>
    <div class="header-sub-text">
      After-padding ({image.length}, {image.length})
    </div>
    <HyperparameterDataview on:message={handleMouseover} data={testImage} highlights={inputHighlights}
        outputLength={output.length} stride={stride} padding={padding} isStrideValid={isStrideValid}/>
  </div>
  <div class="column has-text-centered">
    <div class="header-text" style="padding-top: 27px;">
      Output ({output.length}, {output.length})
    </div>
    <div class="header-sub-text">
      &nbsp;
    </div>
    <HyperparameterDataview on:message={handleMouseover} data={testOutput} highlights={outputHighlights}
        outputLength={output.length} stride={stride} padding={padding} isOutput={true} isStrideValid={isStrideValid}/>
  </div>
</div>