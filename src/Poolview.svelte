<script>
	import PoolAnimator from './PoolAnimator.svelte';
  import { singleMaxPooling } from './cnn.js';

  export let input;
  export let kernelLength;
  export let dataRange;
  // export let output;
  
	let stride = 2;
  const dilation = 1;
  var isPaused = false;
  var outputFinal = singleMaxPooling(input);
  $: if (stride > 0) {
    try { 
      outputFinal = singleMaxPooling(input);
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

  <div style="margin-top: 2%; margin-bottom: 2%;" class="box">
    <div class="has-text-left">
      <button style="margin-bottom: 1%" class="button is-success is-small is-outlined" on:click={handleClickPause}>
        {@html isPaused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>'}
      </button>    
    </div>
    <div class="columns is-centered is-vcentered">
      <PoolAnimator on:message={handlePauseFromInteraction} 
        kernelLength={kernelLength} image={input} output={outputFinal} 
        stride={stride} dilation={dilation} isPaused={isPaused}
        dataRange={dataRange} />
    </div>
  </div>

</div>