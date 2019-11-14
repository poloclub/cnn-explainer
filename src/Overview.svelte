<script>
  import { onMount } from 'svelte';
  import { loadTrainedModel, constructCNN } from './cnn-tf.js';

  let overviewComponent;

  onMount(async () => {
    let svg = d3.select(overviewComponent)
      .select('#overview-svg');
    let width = svg.attr('width');
    let height = svg.attr('height');
    console.log(svg);
    
    console.time('Construct cnn');
    let model = await loadTrainedModel('/assets/data/model.json');
    let cnn = await constructCNN('/assets/img/koala.jpeg', model);
    console.timeEnd('Construct cnn');
    console.log(cnn);
  })
</script>

<style>
  .overview {
    padding: 0;
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-end;
  }

  .control-wrapper {
    padding: 5px 0;
    display: flex;
    justify-content: flex-end;
    align-items: center;
  }
</style>

<div class="overview"
  bind:this={overviewComponent}>
  <svg id="overview-svg" width="950" height="600"></svg>
  <div class="control-wrapper">
    <button class="button">
      <span class="icon has-text-danger">
        <i class="fa fa-heart"></i>
      </span>
      <span>Button</span>
    </button>
  </div>
</div>