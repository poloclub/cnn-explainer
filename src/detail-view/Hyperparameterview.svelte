<script>
	import HyperparameterAnimator from './HyperparameterAnimator.svelte';
  import { singleConv } from '../utils/cnn.js';

  let inputSize = 5;
  let kernelSize = 2;
  let padding = 0;
  let stride = 1;
  const dilation = 1;
  let isPaused = false;
  $: inputSizeWithPadding = inputSize + 2 * padding;

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

  function handleClickPause() {
    isPaused = !isPaused;
    console.log(isPaused)
  }

  function handlePauseFromInteraction(event) {
    isPaused = event.detail.text;
  }

  // Update input, kernel, and output as user adjusts hyperparameters.
  let input = generateSquareArray(inputSize + padding * 2);
  let kernel = generateSquareArray(kernelSize);
  $: input = generateSquareArray(inputSize + padding * 2);
  $: kernel = generateSquareArray(kernelSize);
  let outputFinal = singleConv(input, kernel, stride);
  let strideAfterErrorPrevention = stride;
  $: if (stride > 0) {
    const stepSize = (inputSizeWithPadding - kernelSize) / stride + 1;
    let strideNumberInput = document.getElementById("strideNumber");
    if (Number.isInteger(stepSize)) {
      outputFinal = singleConv(input, kernel, stride);
      if (strideNumberInput != null) {
        strideNumberInput.disabled = false;
      }
      strideAfterErrorPrevention = stride;
    } else {
      strideNumberInput.disabled = true;
      console.log("Cannot handle stride of " + stride);
    }
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
    width: 105px;
    text-align: right;
  } 

  input[type=number] {
    width: 35px;
  }
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

    <div class="columns is-centered is-vcentered">
      <div class="column has-text-centered">
        <label class="label">Input Size:</label>
        <input type=number bind:value={inputSize} min={kernelSize} max={7}>
        <input type=range bind:value={inputSize} min={kernelSize} max={7}>
        <br>
        <label class="label">Padding:</label>
        <input type=number bind:value={padding} min={0} max={kernelSize - 1}>
        <input type=range bind:value={padding} min={0} max={kernelSize - 1}>
        <br>
        <label class="label">Kernel Size:</label>
        <input type=number bind:value={kernelSize} min={padding + 1} max={inputSize}>
        <input type=range bind:value={kernelSize} min={padding + 1} max={inputSize}>
        <br>
        <label class="label">Stride:</label>
        <input type=number id="strideNumber" bind:value={stride} min=1 max={inputSizeWithPadding - kernelSize}>
        <input type=range bind:value={stride} min=1 max={inputSizeWithPadding - kernelSize}>
      </div>
      <HyperparameterAnimator on:message={handlePauseFromInteraction} 
        kernel={kernel} image={input} output={outputFinal} 
        stride={strideAfterErrorPrevention} dilation={dilation} padding={padding} isPaused={isPaused}/>
    </div>

  </div>
</div>