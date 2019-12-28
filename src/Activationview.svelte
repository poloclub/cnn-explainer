<script>
	import ActivationAnimator from './ActivationAnimator.svelte';

  export let input;
  export let output;
  export let dataRange;
  
  let isPaused = false;
  
  function handleClickPause() {
    isPaused = !isPaused;
  }

  function handlePauseFromInteraction(event) {
    isPaused = event.detail.text;
  }
</script>

<div class="container">
  <div style="margin-top: 2%; margin-bottom: 2%;" class="box">
    <div class="has-text-left">
      <button style="margin-bottom: 1%" class="button is-success is-small is-outlined" on:click={handleClickPause}>
        {@html isPaused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>'}
      </button>    
    </div>
    <div class="columns is-centered is-vcentered">
      <ActivationAnimator on:message={handlePauseFromInteraction} 
        image={input} output={output} isPaused={isPaused}
        dataRange={dataRange}/>
    </div>
  </div>

</div>