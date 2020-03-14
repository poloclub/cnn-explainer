<script>
	import HyperparameterAnimator from './HyperparameterAnimator.svelte';
  import { singleConv } from '../utils/cnn.js';

  let inputSize = 8;
  let kernelSize = 3;
  
  function generateSquareArray(arrayDim) {
    let arr = [];
    for (let i = 0; i < arrayDim; i++) {
      arr.push([]);
      for (let j = 0; j < arrayDim; j++) {
        arr[i].push(0)
      }
    }
    return arr;
  }

  let padding = 0;
  let stride = 1;
  const dilation = 1;
  let isPaused = false;

  let input = generateSquareArray(inputSize + padding * 2);
  let kernel = generateSquareArray(kernelSize);
  $: input = generateSquareArray(inputSize + padding * 2);
  $: kernel = generateSquareArray(kernelSize);
  let outputFinal = singleConv(input, kernel, stride);
  $: if (stride > 0) {
    try { 
      outputFinal = singleConv(input, kernel, stride);
    } catch {
      console.log("Cannot handle stride of " + stride);
    }
  }
  
  function handleClickPause() {
    isPaused = !isPaused;
    console.log(isPaused)
  }

  function handlePauseFromInteraction(event) {
    isPaused = event.detail.text;
  }
</script>

<style>
  .control-pannel {
    display: flex;
    justify-content: flex-end;
  }

  .play-button {
    margin-right: 3px;
  }

  .control-button {
    color: gray;
    font-size: 15px;
    opacity: 0.4;
    cursor: pointer;
  }

  .control-button:hover {
    opacity: 0.8;
  }

  .box {
    padding: 5px 15px 10px 15px;
  }

  .columns {
    align-items: flex-end;
  }

  label {
    display: inline-block;
    width: 135px;
    text-align: middle;
  } ​{}
</style>

<div class="container has-text-centered" id="detailview-container">
  <div class="box">
    <div class="control-pannel">
      <div class="play-button control-button" on:click={handleClickPause}>
        {@html isPaused ?
          '<i class="fas fa-play-circle play-icon"></i>' :
          '<i class="fas fa-pause-circle"></i>'}
      </div>
    </div>

    <div class="columns is-centered">
      <div class="column has-text-centered">
        <label>
          Input Size:
          <input type=number bind:value={inputSize} min={kernelSize} max={16}>
          <input type=range bind:value={inputSize} min={kernelSize} max={16}>
        </label><br>
        <label>
          Padding:
          <input type=number bind:value={padding} min={0} max={kernelSize - 1}>
          <input type=range bind:value={padding} min={0} max={kernelSize - 1}>
        </label><br>
        <label>
          Kernel Size:
          <input type=number bind:value={kernelSize} min=1 max={inputSize}>
          <input type=range bind:value={kernelSize} min=1 max={inputSize}>
        </label><br>
        <label>
          Stride:
          <input type=number bind:value={stride} min=1 max={inputSize - kernelSize}>
          <input type=range bind:value={stride} min=1 max={inputSize - kernelSize}>
        </label>
      </div>
      <HyperparameterAnimator on:message={handlePauseFromInteraction} 
        kernel={kernel} image={input} output={outputFinal} 
        stride={stride} dilation={dilation} padding={padding} isPaused={isPaused}/>
    </div>

  </div>
</div>