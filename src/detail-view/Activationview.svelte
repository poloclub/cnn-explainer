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

<style>
  .control-pannel {
    display: flex;
    position: relative;
    flex-direction: column;
    align-items: center;
  }

  .buttons {
    cursor: pointer;
    position: absolute;
    top: 0px;
    right: 0px;
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

  .title-text {
    font-size: 1.2em;
    font-weight: 500;
    color: #4a4a4a;
    margin-bottom: 5px;
  }
</style>

{#if !isExited}
  <div class="container">
    <div class="box">

      <div class="control-pannel">

        <div class="title-text">
          ReLU Activation
        </div>

        <div class="buttons">
          <div class="play-button control-button" on:click={handleClickPause}>
            {@html isPaused ?
              '<i class="fas fa-play-circle play-icon"></i>' :
              '<i class="fas fa-pause-circle"></i>'}
          </div>
          <div class="delete-button control-button" on:click={handleClickX}>
              <i class="fas control-icon fa-times-circle"></i>
          </div>
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