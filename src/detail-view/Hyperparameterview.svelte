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
        strideNumberInput.className = strideNumberInput.className.replace("is-danger", "");
      }
      isStrideValid = true;
    } else {
      if (!strideNumberInput.className.includes("is-danger")) {
        strideNumberInput.className += " is-danger";
      }
      isStrideValid = false;
      console.log("Cannot handle stride of " + stride);
    }
  }
</script>

<style>
  .control-button {
    position: absolute;
    top: 5px;
    right: 15px;
    color: gray;
    font-size: 22px;
    opacity: 0.4;
    cursor: pointer;
  }

  .control-button:hover {
    opacity: 0.8;
  }

  .box {
    padding: 5px 30px 20px 30px;
    position: relative;
  }

  .left-part {
    display: flex;
    flex-direction: column;
    margin-top: 30px;
  }

  .right-part {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  .content-container {
    display: flex;
    justify-content: space-around;
  }

  .field {
    padding-top: 5px;
  }

  .annotation {
    display: flex;
    align-items: center;
    padding-left : 10px;
  }

  .annotation-text-hyper {
    font-size: 15px;
    font-style: italic;
  }

  .annotation > img {
    width: 20px;
    margin-right: 5px;
  }

  .is-very-small {
    font-size: 12px; 
  }

  .field {
    align-items: center;
  }

  .field-label.is-normal {
    padding-top: 0;
  }

  .field:not(:last-child) {
    margin-bottom: 7px;
  }

  label {
    display: inline-block;
    width: 105px;
    text-align: right;
    font-weight: 500;
    color: #4a4a4a;
  } 

  input[type=number] {
    width: 50px;
  }

  input[type=range] {
    width: 160px;
  }
</style>

<div class="container has-text-centered" id="detailview-container">
  <div class="box">

      <div class="control-button" on:click={handleClickPause}>
        {@html isPaused ?
          '<i class="fas fa-play-circle play-icon"></i>' :
          '<i class="fas fa-pause-circle"></i>'}
      </div>

    <div class="content-container">
      <div class="left-part">

        <div class="input-row">
          <div class="field is-horizontal">
            <div class="field-label is-normal">
              <label class="label">Input Size:</label>
            </div>
            <input class="input is-very-small" type="number" bind:value={inputSize}
              min={kernelSize} max={7}>
          </div>

          <input type="range" bind:value={inputSize}
            min={kernelSize} max={7}>
        </div>

        <div class="input-row">
          <div class="field is-horizontal">
            <div class="field-label is-normal">
              <label class="label">Padding:</label>
            </div>
            <input class="input is-very-small" type="number" bind:value={padding} min={0}
              max={kernelSize - 1}>
          </div>

          <input type="range" bind:value={padding} min={0}
            max={kernelSize - 1}>
        </div>

        <div class="input-row">
          <div class="field is-horizontal">
            <div class="field-label is-normal">
              <label class="label">Kernel Size:</label>
            </div>
            <input class="input is-very-small" type="number" bind:value={kernelSize} min={padding + 1}
              max={inputSizeWithPadding}>
          </div>

          <input type="range" bind:value={kernelSize} min={padding + 1}
            max={inputSizeWithPadding}>
        </div>

        <div class="input-row">
          <div class="field is-horizontal">
            <div class="field-label is-normal">
              <label class="label">Stride:</label>
            </div>
            <input class="input is-very-small" type=number id="strideNumber" bind:value={stride} min=1
              max={Math.max(inputSizeWithPadding - kernelSize + 1, 2)}>
          </div>

          <input type="range" bind:value={stride} min=1
            max={Math.max(inputSizeWithPadding - kernelSize + 1, 2)}>
        </div>
      </div>

        <div class="right-part">
          <HyperparameterAnimator on:message={handlePauseFromInteraction} 
            kernel={kernel} image={input} output={outputFinal} isStrideValid={isStrideValid}
            stride={stride} dilation={dilation} padding={padding} isPaused={isPaused}/>

          <div class="annotation">
            <img src='PUBLIC_URL/assets/img/pointer.svg' alt='pointer icon' width="25px">
            <div class="annotation-text-hyper">
              <span style="font-weight:600">Hover over</span> the matrices to change kernel position.
            </div>
          </div>
          
        </div>

    </div>


  </div>
</div>