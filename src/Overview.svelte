<script>
  import * as d3 from 'd3';
  import { onMount } from 'svelte';
  import { loadTrainedModel, constructCNN } from './cnn-tf.js';

  let overviewComponent;

  let nodeLength = 40;
  let numLayers = 12;
  let layerColorScales = {
    input: [d3.interpolateReds, d3.interpolateGreens, d3.interpolateBlues],
    conv: d3.interpolateBrBG,
    relu: d3.interpolateBuGn,
    pool: d3.interpolateBrBG,
    output: d3.interpolateBuGn
  };

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

  const drawOutput = (d, i, g) => {
    let canvas = g[i];
    let range = d3.select(canvas.parentNode).attr('data-range');
    let context = canvas.getContext('2d');
    let colorScale = layerColorScales[d.type];

    if (d.type === 'input') {
      colorScale = colorScale[d.index];
    }

    // Set up a second convas in order to resize image
    let imageLength = 1;
    if (d.output.length !== undefined) {
      imageLength = d.output.length;
    }
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
        let color = d3.rgb(colorScale(Math.abs(d.output[row][column]) / range));

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
    let svg = d3.select(overviewComponent)
      .select('#cnn-svg');
    let width = svg.attr('width');
    let height = svg.attr('height');
    console.log(svg);
    
    console.time('Construct cnn');
    let model = await loadTrainedModel('/assets/data/model.json');
    let cnn = await constructCNN('/assets/img/orange.jpeg', model);
    console.timeEnd('Construct cnn');

    // Ignore the flatten layer for now
    let flatten = cnn[cnn.length - 2];
    cnn.splice(cnn.length - 2, 1);
    console.log(cnn);

    let hSpaceAroundGap = (width - nodeLength * numLayers) / (numLayers + 1);
    
    let output = cnn[0][0].output;
    let dummyCategories = Array(output.length).fill(1).map((d, i) => d + i);

    console.time('rect')
    let outputData = [];

    for (let r = 0; r < output.length; r++) {
      for (let c = 0; c < output.length; c++) {
        let curData = {
          r: r,
          c: c,
          color: d3.interpolateReds(output[r][c] / 255)
        }
        outputData.push(curData)
      }
    }

    let xScale = d3.scaleBand()
      .range([0, nodeLength])
      .domain(dummyCategories);
    
    let yScale = d3.scaleBand()
      .range([0, nodeLength])
      .domain(dummyCategories);

    let heatmapGroup = svg.append('g')
      .attr('class', 'heatmap-group')

    console.log(outputData);

    heatmapGroup.selectAll('rect')
      .data(outputData)
      .enter()
      .append('rect')
      .attr('x', d => xScale(d.c))
      .attr('y', d => yScale(d.r))
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .style('fill', d => d.color)

    console.timeEnd('rect')
    /*
    let cnnDiv = d3.select(overviewComponent)
      .select('div.cnn')
      .style('height', `${height}px`);
    
    // Record node coordinates
    let nodeCoordinate = [];

    // Iterate through all nodes to find a uniform range for conv, relu, and 
    // pooling layers
    let convExtents = [];
    for (let l = 0; l < cnn.length; l++) {
      let curLayer = cnn[l];
      if (curLayer[0].type === 'input' || curLayer[0].type === 'output') {
        continue;
      }
      let outputExtents = curLayer.map(l => getExtent(l.output));
      let aggregatedExtent = outputExtents.reduce((acc, cur) => {
        return [Math.min(acc[0], cur[0]), Math.max(acc[1], cur[1])];
      })
      convExtents.push(aggregatedExtent);
    }
    let aggregatedExtent = convExtents.reduce((acc, cur) => {
        return [Math.min(acc[0], cur[0]), Math.max(acc[1], cur[1])];
    });
    aggregatedExtent = aggregatedExtent.map(Math.abs);
    let outputRange = 2 * Math.max(...aggregatedExtent);
    console.log(Math.max(...aggregatedExtent), outputRange);

    for (let l = 0; l < cnn.length; l++) {
      let curLayer = cnn[l];
      nodeCoordinate.push([]);

      // All nodes share the same x coordiante (left in div style)
      let left = l * nodeLength + (l + 1) * hSpaceAroundGap;

      let layerDiv = cnnDiv.append('div')
        .attr('class', 'cnn-layer-container')
        .style('height', `${height}px`)
        .style('left', `${left}px`);

      let vSpaceAroundGap = (height - nodeLength * curLayer.length) /
        (curLayer.length + 1);

      // Compute the range of all outputs in input/output layer in order to create
      // color scales
      // if (l.type === 'input' || l.type === 'output') {
        let outputExtents = curLayer.map(l => getExtent(l.output));
        let aggregatedExtents = outputExtents.reduce((acc, cur) => {
          return [Math.min(acc[0], cur[0]), Math.max(acc[1], cur[1])];
        })
        outputRange = aggregatedExtents[1] - aggregatedExtents[0];
      //}

      layerDiv.selectAll('div.node-container')
        .data(curLayer)
        .enter()
        .append('div')
        .attr('class', 'node-container')
        .attr('id', (d, i) => `layer-${l}-node-${i}`)
        .attr('data-range', outputRange)
        .style('height', `${nodeLength}px`)
        .style('width', `${nodeLength}px`)
        .style('left', 0)
        .style('top', (d, i) => {
          let top = i * nodeLength + (i + 1) * vSpaceAroundGap;
          nodeCoordinate[l].push({x: left, y: top})
          return `${top}px`;
        });
        //.style('background', 'black');
    }

    // Draw activation (node output) into node containers
    cnnDiv.selectAll('.node-container')
      .append('canvas')
      .attr('width', nodeLength)
      .attr('height', nodeLength)
      .each(drawOutput);
    */

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