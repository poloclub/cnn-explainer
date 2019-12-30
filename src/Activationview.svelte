<script>
	import ActivationAnimator from './ActivationAnimator.svelte';
  import { createEventDispatcher } from 'svelte';

  export let input;
  export let output;
  export let dataRange;
  export let isExited;

  const dispatch = createEventDispatcher();
  let isPaused = false;
  
  function handleClickPause() {
    isPaused = !isPaused;
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
            class="button is-small is-centered"
            id="x-button"
            on:click={handleClickX}>
            <span class="icon">
              <i class="fas fa-times"></i>
            </span>
          </button>
        </div>  
      </div>
      <div class="columns is-centered is-vcentered">
        <ActivationAnimator on:message={handlePauseFromInteraction} 
          image={input} output={output} isPaused={isPaused}
          dataRange={dataRange}/>
      </div>
    </div>
  </div>
{/if}