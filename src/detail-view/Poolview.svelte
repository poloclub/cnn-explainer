<script>
	import PoolAnimator from './PoolAnimator.svelte';
  import { singleMaxPooling } from '../utils/cnn.js';
  import { createEventDispatcher } from 'svelte';

  export let input;
  export let kernelLength;
  export let dataRange;
  export let isExited;
  
  const dispatch = createEventDispatcher();
  // let isExited = false;
	let stride = 2;
  const dilation = 1;
  var isPaused = false;
  var outputFinal = singleMaxPooling(input);
  // let dragging = false;
  // let dragInfo = {x1: 0, x2: 0, y1: 0, y2: 0};
  // let detailView = d3.select('#detailview').node();
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

  // Test dragging detail view, need more work
  // const detailViewDragStart = (e) => {
  //   // Record the starting pos
  //   dragInfo.x1 = 0;
  //   dragInfo.y1 = 0;
  //   dragInfo.x2 = e.clientX;
  //   dragInfo.y2 = e.clientY;
  
  //   dragging = true;
  // }

  // const detailViewDragEnd = (e) => {
  //   dragging = false;
  // }

  // const detailViewDragMove = (e) => {
  //   // Add up move to the starting pos
  //   dragInfo.x1 = dragInfo.x2 - e.clientX;
  //   dragInfo.y1 = dragInfo.y2 - e.clientY;
  //   dragInfo.x2 = e.clientX;
  //   dragInfo.y2 = e.clientY;

  //   // Move detail view
  //   detailView.style.top = (detailView.offsetTop - dragInfo.y1) + 'px';
  //   detailView.style.left = (detailView.offsetLeft - dragInfo.x1) + 'px';
  // }
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
      
        <div class="title-text">
          Max Pooling
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
        <PoolAnimator on:message={handlePauseFromInteraction} 
          kernelLength={kernelLength} image={input} output={outputFinal} 
          stride={stride} dilation={dilation} isPaused={isPaused}
          dataRange={dataRange} />
      </div>
    </div>
  </div>
{/if}