<script>
  import { onMount } from 'svelte';
  import { loadTrainedModel, constructCNN } from './cnn-tf.js';

  let overviewComponent;

  onMount(async () => {
    let svg = d3.select(overviewComponent)
      .select('#cnn-svg');
    let width = svg.attr('width');
    let height = svg.attr('height');
    console.log(svg);
    
    console.time('Construct cnn');
    let model = await loadTrainedModel('/assets/data/model.json');
    let cnn = await constructCNN('/assets/img/koala.jpeg', model);
    console.timeEnd('Construct cnn');

    // Ignore the flatten layer for now
    let flatten = cnn[cnn.length - 2];
    cnn.splice(cnn.length - 2, 1);
    console.log(cnn);

    let nodeLength = 40;
    let numLayers = 12;
    let hSpaceAroundGap = (width - nodeLength * numLayers) / (numLayers + 1); 

    let cnnDiv = d3.select(overviewComponent)
      .select('div.cnn')
      .style('height', `${height}px`);
    
    // Record node coordinates
    let nodeCoordinate = [];

    for (let l = 0; l < cnn.length; l++) {
      let curLayer = cnn[l];
      nodeCoordinate.push([])

      // All nodes share the same x coordiante (left in div style)
      let left = l * nodeLength + (l + 1) * hSpaceAroundGap;

      let layerDiv = cnnDiv.append('div')
        .attr('class', 'cnn-layer-container')
        .style('height', `${height}px`)
        .style('left', `${left}px`);

      let vSpaceAroundGap = (height - nodeLength * curLayer.length) /
        (curLayer.length + 1);

      layerDiv.selectAll('div.node-container')
        .data(curLayer)
        .enter()
        .append('div')
        .attr('class', 'node-container')
        .attr('id', (d, i) => `layer-${l}-node-${i}`)
        .style('height', `${nodeLength}px`)
        .style('width', `${nodeLength}px`)
        .style('left', 0)
        .style('top', (d, i) => {
          let top = i * nodeLength + (i + 1) * vSpaceAroundGap;
          nodeCoordinate[l].push({x: left, y: top})
          return `${top}px`;
        })
        .style('background', 'black');
    }

    // Test the coordinate
    /*
    svg.append('circle')
      .attr('cx', nodeCoordinate[3][4].x + 20)
      .attr('cy', nodeCoordinate[3][4].y + 20)
      .attr('r', 5)
      .style('fill', 'red')
    */
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

  .cnn {
    position: relative;
  }

  :global(.node-container) {
    position: absolute;
  }

  :global(.cnn-layer-container) {
    position: absolute;
    top: 0;
  }

  #cnn-svg {
    /* Set the z-index so svg is on the top of the underlying CNN */
    position: relative;
    z-index: 10;
  }
</style>

<div class="overview"
  bind:this={overviewComponent}>
  <div class="cnn">
    <svg id="cnn-svg" width="1100" height="500"></svg>
  </div>
</div>