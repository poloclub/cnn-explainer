<script>
  import { createEventDispatcher } from 'svelte';
  import { array1d, getMatrixSliceFromOutputHighlights,
    getVisualizationSizeConstraint, getMatrixSliceFromInputHighlights, gridData
  } from './DetailviewUtils.js';
  import Dataview from './Dataview.svelte';

  export let image;
  export let output;
  export let isPaused;
  export let dataRange;

  const dispatch = createEventDispatcher();
  const padding = 0;
  let padded_input_size = image.length + padding * 2;
  $: padded_input_size = image.length + padding * 2;

  let gridInputMatrixSlice = gridData([[0]]);
  let gridOutputMatrixSlice = gridData([[0]]);
  let inputHighlights = array1d(image.length * image.length, (i) => true);
  let outputHighlights = array1d(output.length * output.length, (i) => true);
  let interval;
  $ : {
    let inputHighlights = array1d(image.length * image.length, (i) => true);
    let outputHighlights = array1d(output.length * output.length, (i) => true);
    let interval;
  }

  let counter;

  // lots of replication between mouseover and start-relu. TODO: fix this.
  function startRelu() {
    counter = 0;
    if (interval) clearInterval(interval);
    interval = setInterval(() => {
      if (isPaused) return;
      const flat_animated = counter % (output.length * output.length);
      outputHighlights = array1d(output.length * output.length, (i) => false);
      inputHighlights = array1d(image.length * image.length, (i) => undefined);
      const animatedH = Math.floor(flat_animated / output.length);
      const animatedW = flat_animated % output.length;
      outputHighlights[animatedH * output.length + animatedW] = true;
      inputHighlights[animatedH * output.length + animatedW] = true;
      const inputMatrixSlice = getMatrixSliceFromInputHighlights(image, inputHighlights, 1);
      gridInputMatrixSlice = gridData(inputMatrixSlice);
      const outputMatrixSlice = getMatrixSliceFromOutputHighlights(output, outputHighlights);
      gridOutputMatrixSlice = gridData(outputMatrixSlice);
      counter++;
    }, 250)
  }

  function handleMouseover(event) {
    outputHighlights = array1d(output.length * output.length, (i) => false);
    const animatedH = event.detail.hoverH;
    const animatedW = event.detail.hoverW;
    outputHighlights[animatedH * output.length + animatedW] = true;
    inputHighlights = array1d(image.length * image.length, (i) => undefined);
    inputHighlights[animatedH * output.length + animatedW] = true;
    const inputMatrixSlice = getMatrixSliceFromInputHighlights(image, inputHighlights, 1);
    gridInputMatrixSlice = gridData(inputMatrixSlice);
    const outputMatrixSlice = getMatrixSliceFromOutputHighlights(output, outputHighlights);
    gridOutputMatrixSlice = gridData(outputMatrixSlice);
    isPaused = true;
    dispatch('message', {
      text: isPaused
    });
  }

  startRelu();
  let gridImage = gridData(image)
  let gridOutput = gridData(output)
  $ : {
    startRelu();
    gridImage = gridData(image)
    gridOutput = gridData(output)
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
  <Dataview on:message={handleMouseover} data={gridImage} highlights={inputHighlights} outputLength={output.length}
      isKernelMath={false} constraint={getVisualizationSizeConstraint(image.length)} dataRange={dataRange} stride={1}/>  
</div>
<div class="column has-text-centered">
  <span>
    max(
    <Dataview data={gridData([[0]])} highlights={outputHighlights} isKernelMath={true} 
    constraint={20} dataRange={dataRange}/>
    ,
    <Dataview data={gridInputMatrixSlice} highlights={outputHighlights} isKernelMath={true} 
    constraint={20} dataRange={dataRange}/>
    )
    =
    <Dataview data={gridOutputMatrixSlice} highlights={outputHighlights} isKernelMath={true} 
      constraint={20} dataRange={dataRange}/>
  </span> 
</div>
<div class="column has-text-centered">
  <div class="header-text">
    Output ({output.length}, {output[0].length})
  </div>
  <Dataview on:message={handleMouseover} data={gridOutput} highlights={outputHighlights} isKernelMath={false} 
      outputLength={output.length} constraint={getVisualizationSizeConstraint(output.length)} dataRange={dataRange} stride={1}/>
</div>