<script>
	import ConvolutionAnimator from './ConvolutionAnimator.svelte';
  import { singleConv } from './cnn.js';
  import { createEventDispatcher } from 'svelte';

  export let input;
  export let kernel;
  export let dataRange;
  export let colorScale = d3.interpolateRdBu;
  export let isInputInputLayer = false;
  // export let output;
  
  const dispatch = createEventDispatcher();
  let isExited = false;
	let stride = 1;
  const dilation = 1;
  var isPaused = false;
  var outputFinal = singleConv(input, kernel, stride);
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

  function handleClickX() {
    isExited = true;
    dispatch('message', {
      text: isExited
    });
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
</style>

{#if !isExited}
  <div class="container" id="detailview-container">

    <!-- old stride input -->
    <!-- <div class="columns is-mobile">
      <div class="column is-half is-offset-one-quarter">
        <div class="field is-grouped">
          <p class="control is-expanded">
            <input class="input" type="text" placeholder="Stride" bind:value={stride} />
          </p>
          <p class="control">
            <button class="button is-success" on:click={handleClickPause}>
              Toggle Movement
            </button>
          </p>
        </div>
      </div>
    </div> -->

    <div class="box">

      <div class="control-pannel">
        <div class="play-button control-button" on:click={handleClickPause}>
          {@html isPaused ?
            '<i class="fas fa-play-circle play-icon"></i>' :
            '<i class="fas fa-pause-circle"></i>'}
        </div>
        <div class="delete-button control-button" on:click={handleClickX}>
            <i class="fas control-icon fa-times-circle"></i>
        </div>
      </div>

      <div class="columns is-centered">
        <ConvolutionAnimator on:message={handlePauseFromInteraction} 
          kernel={kernel} image={input} output={outputFinal} 
          stride={stride} dilation={dilation} isPaused={isPaused}
          dataRange={dataRange} colorScale={colorScale}
          isInputInputLayer={isInputInputLayer} />
      </div>

    </div>
  </div>
{/if}