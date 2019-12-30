<script>
	import PoolAnimator from './PoolAnimator.svelte';
  import { singleMaxPooling } from './cnn.js';
  import { createEventDispatcher } from 'svelte';

  export let input;
  export let kernelLength;
  export let dataRange;
  // export let output;
  export let isExited;
  
  const dispatch = createEventDispatcher();
  // let isExited = false;
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

  function handleClickX() {
    dispatch('message', {
      text: true
    });
  }
</script>

{#if !isExited}
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
    <button class="delete" aria-label="close"></button>
    <div style="margin-top: 2%; margin-bottom: 2%;" class="box">
      <div class="columns is-centered">
        <div class="column has-text-left">
          <button style="margin-bottom: 1%" 
            class="button is-small"
            id="pause-button"
            class:is-activated={isPaused}
            on:click={handleClickPause}>
            <span class="icon">
              {@html isPaused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>'}
            </span>
          </button> 
        </div>
        <div class="column has-text-right"> 
          <button style="margin-bottom: 1%" 
            class="delete is-small"
            arial-label="close"
            id="x-button"
            on:click={handleClickX}>
          </button>
        </div>  
      </div>
      <div class="columns is-centered is-vcentered">
        <PoolAnimator on:message={handlePauseFromInteraction} 
          kernelLength={kernelLength} image={input} output={outputFinal} 
          stride={stride} dilation={dilation} isPaused={isPaused}
          dataRange={dataRange} />
      </div>
    </div>
  </div>
{/if}