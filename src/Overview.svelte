<script>
  import * as d3 from 'd3';
  import { onMount } from 'svelte';
  import { loadTrainedModel, constructCNN } from './cnn-tf.js';

  // View bindings
  let overviewComponent;
  let cnnLayerRanges = {};
  let selectedScaleLevel = 'local';
  let svg = undefined;

  $: selectedScaleLevel, updateCanvas();

  // Configs
  let nodeLength = 40;
  let numLayers = 12;

  let svgPaddings = {top: 30, bottom: 30};

  let layerColorScales = {
    input: [d3.interpolateGreys, d3.interpolateGreys, d3.interpolateGreys],
    conv: d3.interpolateRdBu,
    relu: d3.interpolateRdBu,
    pool: d3.interpolateRdBu,
    fc: d3.interpolateGreys
  };

  let layerIndex = {
    'input': 0,
    'conv_1_1': 1,
    'relu_1_1': 2,
    'conv_1_2': 3,
    'relu_1_2': 4,
    'max_pool_1': 5,
    'conv_2_1': 6,
    'relu_2_1': 7,
    'conv_2_2': 8,
    'relu_2_2': 9,
    'max_pool_2': 10,
    'output': 11
  }

  // Helper functions
  const updateCanvas = () => {
    if (svg !== undefined) {
      svg.selectAll('canvas.node-canvas').each(drawOutput);
    }
  }

  const getExtent = (array) => {
    let min = Infinity;
    let max = -Infinity;

    // Scalar
    if (array.length === undefined) {
      return [array, array];
    }

    // 1D array
    if (array[0].length === undefined) {
      for (let i = 0; i < array[0].length; i++) {
        if (array[i] < min) {
          min = array[i];
        } else if (array[i] > max) {
          max = array[i];
        }
      }
      return [min, max];
    }

    // 2D array
    for (let i = 0; i < array.length; i++) {
      for (let j = 0; j < array[0].length; j++) {
        if (array[i][j] < min) {
          min = array[i][j];
        } else if (array[i][j] > max) {
          max = array[i][j];
        }
      }
    }
    return [min, max];
  }

  const drawOutputSafariDebug = (d, i, g) => {
    let canvas = g[i];
    let context = canvas.getContext('2d');
    context.fillStyle = 'blue';
    context.fillRect(0, 0, 40, 40);
  }

  const drawOutput = (d, i, g) => {
    let canvas = g[i];
    let range = cnnLayerRanges[selectedScaleLevel][layerIndex[d.layerName]];
    let context = canvas.getContext('2d');
    let colorScale = layerColorScales[d.type];

    if (d.type === 'input') {
      colorScale = colorScale[d.index];
    }

    // Specially handle the output layer (one canvas is just one color fill)
    if (d.layerName === 'output') {
      context.fillStyle = colorScale(d.output);
      context.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // Set up a second convas in order to resize image
    let imageLength = d.output.length === undefined ? 1 : d.output.length;
    let bufferCanvas = document.createElement("canvas");
    let bufferContext = bufferCanvas.getContext("2d");
    bufferCanvas.width = imageLength;
    bufferCanvas.height = imageLength;

    // Fill image pixel array
    let imageSingle = bufferContext.getImageData(0, 0, imageLength, imageLength);
    let imageSingleArray = imageSingle.data;

    if (imageLength === 1) {
      imageSingleArray[0] = d.output;
    } else {
      for (let i = 0; i < imageSingleArray.length; i+=4) {
        let pixeIndex = Math.floor(i / 4);
        let row = Math.floor(pixeIndex / imageLength);
        let column = pixeIndex % imageLength;
        let color = undefined;
        if (d.type === 'input' || d.type === 'fc' ) {
          color = d3.rgb(colorScale(d.output[row][column]))
        } else {
          color = d3.rgb(colorScale((d.output[row][column] + range / 2) / range));
        }

        imageSingleArray[i] = color.r;
        imageSingleArray[i + 1] = color.g;
        imageSingleArray[i + 2] = color.b;
        imageSingleArray[i + 3] = 255;
      }
    }

    // Use drawImage to resize the original pixel array, and put the new image
    // (canvas) into corresponding canvas
    bufferContext.putImageData(imageSingle, 0, 0);
    context.drawImage(bufferCanvas, 0, 0, imageLength, imageLength,
      0, 0, nodeLength, nodeLength);
  }

  onMount(async () => {
    // Create SVG
    svg = d3.select(overviewComponent)
      .select('#cnn-svg');
    let width = svg.attr('width');
    let height = svg.attr('height') - svgPaddings.top - svgPaddings.bottom;
    let cnnGroup = svg.append('g')
      .attr('class', 'cnn-group')
      .attr('transform', `translate(0, ${svgPaddings.top})`);
    
    console.time('Construct cnn');
    let model = await loadTrainedModel('/assets/data/model.json');
    let cnn = await constructCNN('/assets/img/koala.jpeg', model);
    console.timeEnd('Construct cnn');

    // Ignore the flatten layer for now
    let flatten = cnn[cnn.length - 2];
    cnn.splice(cnn.length - 2, 1);
    console.log(cnn);

    // Iterate through all nodes to find a output ranges for each layer
    let cnnLayerRangesLocal = [1];
    let curRange = undefined;
    for (let l = 0; l < cnn.length - 1; l++) {
      let curLayer = cnn[l];

      // conv layer refreshes curRange counting
      if (curLayer[0].type === 'conv' || curLayer[0].type === 'fc') {
        let outputExtents = curLayer.map(l => getExtent(l.output));
        let aggregatedExtent = outputExtents.reduce((acc, cur) => {
          return [Math.min(acc[0], cur[0]), Math.max(acc[1], cur[1])];
        })
        aggregatedExtent = aggregatedExtent.map(Math.abs);
        curRange = 2 * (0.1 + 
          Math.round(Math.max(...aggregatedExtent) * 1000) / 1000);
      }

      if (curRange !== undefined){
        cnnLayerRangesLocal.push(curRange);
      }
    }

    // Finally, add the output layer range
    cnnLayerRangesLocal.push(1);

    // Support different levels of scales (1) lcoal, (2) component, (3) global
    let cnnLayerRangesComponent = [1];
    let numOfComponent = (numLayers - 2) / 5;
    for (let i = 0; i < numOfComponent; i++) {
      let curArray = cnnLayerRangesLocal.slice(1 + 5 * i, 1 + 5 * i + 5);
      let maxRange = Math.max(...curArray);
      for (let j = 0; j < 5; j++) {
        cnnLayerRangesComponent.push(maxRange);
      }
    }
    cnnLayerRangesComponent.push(1);

    let cnnLayerRangesGlobal = [1];
    let maxRange = Math.max(...cnnLayerRangesLocal.slice(1,
      cnnLayerRangesLocal.length - 1));
    for (let i = 0; i < numLayers - 2; i++) {
      cnnLayerRangesGlobal.push(maxRange);
    }
    cnnLayerRangesGlobal.push(1);

    // Update the ranges dictionary
    cnnLayerRanges.local = cnnLayerRangesLocal;
    cnnLayerRanges.module = cnnLayerRangesComponent;
    cnnLayerRanges.global = cnnLayerRangesGlobal;

    // Draw the CNN
    let hSpaceAroundGap = (width - nodeLength * numLayers) / (numLayers + 1);

    let nodeCoordinate = [];
    // Iterate through the cnn to draw nodes in each layer
    for (let l = 0; l < cnn.length; l++) {
      let curLayer = cnn[l];
      nodeCoordinate.push([]);

      // All nodes share the same x coordiante (left in div style)
      let left = l * nodeLength + (l + 1) * hSpaceAroundGap;

      let layerGroup = cnnGroup.append('g')
        .attr('class', 'cnn-layer-group')
        .attr('transform', `translate(${left}, 0)`);

      let vSpaceAroundGap = (height - nodeLength * curLayer.length) /
        (curLayer.length + 1);

      let nodeGroups = layerGroup.selectAll('g.node-group')
        .data(curLayer)
        .enter()
        .append('g')
        .attr('class', 'node-group')
        .attr('id', (d, i) => `layer-${l}-node-${i}`)
        .attr('transform', (d, i) => {
          let top = i * nodeLength + (i + 1) * vSpaceAroundGap;
          nodeCoordinate[l].push({x: left, y: top});
          return `translate(0, ${top})`;
        });
      
      // Embed canvas in these groups
      nodeGroups.append('foreignObject')
        .attr('width', nodeLength)
        .attr('height', nodeLength)
        .append('xhtml:body')
        .style('margin', 0)
        .style('padding', 0)
        .style('background-color', 'none')
        .style('width', '100%')
        .style('height', '100%')
        .append('canvas')
        .attr('class', 'node-canvas')
        .attr('width', nodeLength)
        .attr('height', nodeLength);
    }

    // Draw the canvas
    svg.selectAll('canvas.node-canvas').each(drawOutput);

    // Add layer label
    let layerNames = cnn.map(d => d[0].layerName);
    console.log(nodeCoordinate);
    svg.selectAll('g.layer-label')
      .data(layerNames)
      .enter()
      .append('g')
      .attr('class', 'layer-label')
      .attr('transform', (d, i) => {
        let x = nodeCoordinate[i][0].x + nodeLength / 2;
        let y = svgPaddings.top / 2;
        return `translate(${x}, ${y})`;
      })
      .append('text')
      .text(d => d);


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
    align-items: flex-start;
  }

  .control-container {
    padding: 15px 20px;
  }

  .cnn {
    width: 100%;
    height: 560px;
    padding: 0;
    background: var(--g-light-gray);
    display: flex;
  }

  svg {
    margin: auto;
  }

  .is-very-small {
    font-size: 12px;
  }

  :global(canvas) {
    image-rendering: crisp-edges;
  }

  :global(.layer-label) {
    dominant-baseline: middle;
  }

  :global(.layer-label text) {
    font-size: 12px;
    dominant-baseline: middle;
    text-anchor: middle;
  }
</style>

<div class="overview"
  bind:this={overviewComponent}>

  <div class="control-container">
    <div class="control is-very-small has-icons-left">
      <span class="icon is-left">
        <i class="fas fa-palette"></i>
      </span>

      <div class="select">
        <select bind:value={selectedScaleLevel}>
          <option value="local">Local</option>
          <option value="module">Module</option>
          <option value="global">Global</option>
        </select>
      </div>
    </div>
  </div>

  <div class="cnn">
    <svg id="cnn-svg" width="1100" height="560"></svg>
  </div>
</div>