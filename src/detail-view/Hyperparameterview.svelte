<script>
	import HyperparameterAnimator from './HyperparameterAnimator.svelte';
  import { singleConv } from '../utils/cnn.js';

  let inputSize = 5;
  let kernelSize = 2;
  let padding = 0;
  let stride = 1;
  const dilation = 1;
  let isPaused = false;
  let isStrideValid = true;
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
  $: if (stride > 0) {
    const stepSize = (inputSizeWithPadding - kernelSize) / stride + 1;
    let strideNumberInput = document.getElementById("strideNumber");
    if (Number.isInteger(stepSize)) {
      outputFinal = singleConv(input, kernel, stride);
      if (strideNumberInput != null) {
        strideNumberInput.disabled = false;
        strideNumberInput.className = strideNumberInput.className.replace("is-danger", "");
      }
      isStrideValid = true;
    } else {
      if (strideNumberInput.disabled != true) {
        strideNumberInput.disabled = true;
        strideNumberInput.className += " is-danger";
      }
      isStrideValid = false;
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

  .field {
    padding-top: 5px;
  }

  label {
    display: inline-block;
    width: 105px;
    text-align: right;
  } 

  input[type=number] {
    width: 60px;
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
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label">Input Size:</label>
          </div>
          <input class="input" type="number" bind:value={inputSize}
            min={kernelSize} max={7}>
        </div>
        <input class= "input" type="range" bind:value={inputSize}
          min={kernelSize} max={7}>
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label">Padding:</label>
          </div>
          <input class="input" type="number" bind:value={padding} min={0}
            max={kernelSize - 1}>
        </div>
        <input class="input" type="range" bind:value={padding} min={0}
          max={kernelSize - 1}>
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label">Kernel Size:</label>
          </div>
          <input class="input" type="number" bind:value={kernelSize} min={padding + 1}
            max={inputSizeWithPadding}>
        </div>
        <input class="input" type="range" bind:value={kernelSize} min={padding + 1}
          max={inputSizeWithPadding}>
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label">Stride:</label>
          </div>
          <input class="input" type=number id="strideNumber" bind:value={stride} min=1
            max={Math.max(inputSizeWithPadding - kernelSize + 1, 2)}>
        </div>
        <input class="input" type="range" bind:value={stride} min=1
          max={Math.max(inputSizeWithPadding - kernelSize + 1, 2)}>
      </div>
      <HyperparameterAnimator on:message={handlePauseFromInteraction} 
        kernel={kernel} image={input} output={outputFinal} isStrideValid={isStrideValid}
        stride={stride} dilation={dilation} padding={padding} isPaused={isPaused}/>
    </div>

  </div>
</div>