<script>
	import ConvolutionAnimator from './ConvolutionAnimator.svelte';
  import { singleConv } from './cnn.js';

  export let input;
  export let kernel;
  // export let output;
  
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
</script>

<div class="container">
  <div class="columns is-mobile">
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
  </div>
  <div class="columns is-centered is-vcentered">
    <ConvolutionAnimator on:message={handlePauseFromInteraction} kernel={kernel} image={input} output={outputFinal} stride={stride} dilation={dilation} isPaused={isPaused}/>
  </div>
</div>