<script>
  import * as d3 from 'd3';
  import { onMount } from 'svelte';
  import { loadTrainedModel, constructCNN } from './cnn-tf.js';
  import { cnnStore } from './stores.js';

  // View bindings
  let overviewComponent;
  let cnnLayerRanges = {};
  let scaleLevelSet = new Set(['local', 'module', 'global']);
  let selectedScaleLevel = 'local';
  let previousSelectedScaleLevel = selectedScaleLevel;
  let svg = undefined;
  let detailedMode = false;

  $: selectedScaleLevel, selectedScaleLevelChanged();

  // Configs
  let nodeLength = 40;
  let numLayers = 12;

  let svgPaddings = {top: 40, bottom: 40};

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
  const selectedScaleLevelChanged = () => {
    if (svg !== undefined) {
      if (!scaleLevelSet.add(selectedScaleLevel)) {
        console.error('Encounter unknown scale level!');
      }

      // Update nodes and legends
      if (selectedScaleLevel != previousSelectedScaleLevel){
        // We can simply redraw all nodes using the new color scale, or we can
        // make it faster by only redraw certian nodes
        let updatingLayerIndexDict = {
          local: {
            module: [1, 2, 8, 9, 10],
            global: [1, 2, 3, 4, 5, 8, 9, 10]
          },
          module: {
            local: [1, 2, 8, 9, 10],
            global: [1, 2, 3, 4, 5, 8, 9, 10]
          },
          global: {
            local: [1, 2, 3, 4, 5, 8, 9, 10],
            module: [1, 2, 3, 4, 5]
          }
        };

        let updatingLayerIndex = updatingLayerIndexDict[
          previousSelectedScaleLevel][selectedScaleLevel];

        updatingLayerIndex.forEach(d => {
          svg.select(`#cnn-layer-group-${d}`)
            .selectAll('.node-canvas')
            .each(drawOutput);
        });

        // Hide previous legend
        svg.selectAll(`.${previousSelectedScaleLevel}Legend`)
          .transition()
          .duration(600)
          .ease(d3.easeCubicInOut)
          .style('opacity', 0);

        // Show selected legends
        svg.selectAll(`.${selectedScaleLevel}Legend`)
          .transition()
          .delay(200)
          .duration(600)
          .ease(d3.easeCubicInOut)
          .style('opacity', 1);
      }
      previousSelectedScaleLevel = selectedScaleLevel;
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
          color = d3.rgb(colorScale(1 - d.output[row][column]))
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

  const drawOutputScore = (d, i, g) => {
    let group = d3.select(g[i]);
    group.append('rect')
      .attr('width', d.output * nodeLength)
      .attr('height', nodeLength)
      .style('fill', 'gray');
  }

  const getLegendGradient = (g, colorScale, gradientName) => {
    let gradient = g.append('defs')
      .append('svg:linearGradient')
      .attr('id', `${gradientName}`)
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '100%')
      .attr('y2', '100%')
      .attr('spreadMethod', 'pad');
    let interpolation = 10
    for (let i = 0; i < interpolation; i++) {
      let curProgress = i / (interpolation - 1);
      let curColor = colorScale(curProgress);
      gradient.append('stop')
        .attr('offset', `${curProgress * 100}%`)
        .attr('stop-color', curColor)
        .attr('stop-opacity', 1);
    }
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
    cnnStore.set(cnn);

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
    let vSpaceAroundGap = undefined;

    // Iterate through the cnn to draw nodes in each layer
    for (let l = 0; l < cnn.length; l++) {
      let curLayer = cnn[l];
      let isOutput = curLayer[0].layerName === 'output';
      nodeCoordinate.push([]);

      // All nodes share the same x coordiante (left in div style)
      let left = l * nodeLength + (l + 1) * hSpaceAroundGap;

      let layerGroup = cnnGroup.append('g')
        .attr('class', 'cnn-layer-group')
        .attr('id', `cnn-layer-group-${l}`)
        .attr('transform', `translate(${left}, 0)`);

      vSpaceAroundGap = (height - nodeLength * curLayer.length) /
        (curLayer.length + 1);

      let nodeGroups = layerGroup.selectAll('g.node-group')
        .data(curLayer)
        .enter()
        .append('g')
        .attr('class', 'node-group')
        .classed('node-output', isOutput)
        .attr('id', (d, i) => `layer-${l}-node-${i}`)
        .attr('transform', (d, i) => {
          let top = i * nodeLength + (i + 1) * vSpaceAroundGap;
          nodeCoordinate[l].push({x: left, y: top});
          return `translate(0, ${top})`;
        });
      
      if (curLayer[0].layerName !== 'output') {
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
    }

    // Draw the canvas
    svg.selectAll('canvas.node-canvas').each(drawOutput);
    svg.selectAll('g.node-output').each(drawOutputScore);

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
        let y = (svgPaddings.top + vSpaceAroundGap) / 2;
        return `translate(${x}, ${y})`;
      })
      .append('text')
      .text(d => d);

    // Add layer color scale legends
    getLegendGradient(svg, layerColorScales.conv, 'convGradient');
    getLegendGradient(svg, layerColorScales.input[0], 'inputGradient');

    let legendHeight = 10;
    let legends = svg.append('g')
        .attr('class', 'colorLegend')
        .attr('transform', `translate(${0}, ${530})`);

    // Add local legends
    for (let i = 0; i < 2; i++){
      let start = 1 + i * 5;
      let range1 = cnnLayerRanges.local[start];
      let range2 = cnnLayerRanges.local[start + 2];

      let localLegendScale1 = d3.scaleLinear()
        .range([0, 2 * nodeLength + hSpaceAroundGap])
        .domain([-range1, range1]);
      
      let localLegendScale2 = d3.scaleLinear()
        .range([0, 3 * nodeLength + 2 * hSpaceAroundGap])
        .domain([-range2, range2]);

      let localLegendAxis1 = d3.axisBottom()
        .scale(localLegendScale1)
        .tickFormat(d3.format('.2f'))
        .tickValues([-range1, 0, range1]);
      
      let localLegendAxis2 = d3.axisBottom()
        .scale(localLegendScale2)
        .tickFormat(d3.format('.2f'))
        .tickValues([-range2, 0, range2]);

      let localLegend1 = legends.append('g')
        .attr('class', 'localLegend')
        .style('opacity', selectedScaleLevel === 'local' ? 1 : 0)
        .attr('transform', `translate(${nodeCoordinate[start][0].x}, ${0})`);

      localLegend1.append('rect')
        .attr('width', 2 * nodeLength + hSpaceAroundGap)
        .attr('height', legendHeight)
        .style('fill', 'url(#convGradient)');
      
      localLegend1.append('g')
        .attr('transform', `translate(0, ${legendHeight})`)
        .call(localLegendAxis1)

      let localLegend2 = legends.append('g')
        .attr('class', 'localLegend')
        .style('opacity', selectedScaleLevel === 'local' ? 1 : 0)
        .attr('transform', `translate(${nodeCoordinate[start + 2][0].x}, ${0})`);

      localLegend2.append('rect')
        .attr('width', 3 * nodeLength + 2 * hSpaceAroundGap)
        .attr('height', legendHeight)
        .style('fill', 'url(#convGradient)');
      
      localLegend2.append('g')
        .attr('transform', `translate(0, ${legendHeight})`)
        .call(localLegendAxis2)
    }

    // Add module legends
    for (let i = 0; i < 2; i++){
      let start = 1 + i * 5;
      let range = cnnLayerRanges.local[start];

      let moduleLegendScale = d3.scaleLinear()
        .range([0, 5 * nodeLength + 4 * hSpaceAroundGap])
        .domain([-range, range]);

      let moduleLegendAxis = d3.axisBottom()
        .scale(moduleLegendScale)
        .tickFormat(d3.format('.2f'))
        .tickValues([-range, -(range / 2), 0, range/2, range]);

      let moduleLegend = legends.append('g')
        .attr('class', 'moduleLegend')
        .style('opacity', selectedScaleLevel === 'module' ? 1 : 0)
        .attr('transform', `translate(${nodeCoordinate[start][0].x}, ${0})`);

      moduleLegend.append('rect')
        .attr('width', 5 * nodeLength + 4 * hSpaceAroundGap)
        .attr('height', legendHeight)
        .style('fill', 'url(#convGradient)');
      
      moduleLegend.append('g')
        .attr('transform', `translate(0, ${legendHeight})`)
        .call(moduleLegendAxis)
    }

    // Add global legends
    let start = 1;
    let range = cnnLayerRanges.global[start];

    let globalLegendScale = d3.scaleLinear()
      .range([0, 10 * nodeLength + 9 * hSpaceAroundGap])
      .domain([-range, range]);

    let globalLegendAxis = d3.axisBottom()
      .scale(globalLegendScale)
      .tickFormat(d3.format('.2f'))
      .tickValues([-range, -(range / 2), 0, range/2, range]);

    let globalLegend = legends.append('g')
      .attr('class', 'globalLegend')
      .style('opacity', selectedScaleLevel === 'global' ? 1 : 0)
      .attr('transform', `translate(${nodeCoordinate[start][0].x}, ${0})`);

    globalLegend.append('rect')
      .attr('width', 10 * nodeLength + 9 * hSpaceAroundGap)
      .attr('height', legendHeight)
      .style('fill', 'url(#convGradient)');
    
    globalLegend.append('g')
      .attr('transform', `translate(0, ${legendHeight})`)
      .call(globalLegendAxis)

    // Add output legend
    let outputLegendScale = d3.scaleLinear()
      .range([0, nodeLength])
      .domain([0, 1]);
    
    let outputLegendAxis = d3.axisBottom()
      .scale(outputLegendScale)
      .tickFormat(d3.format('.1f'))
      .tickValues([0, 0.5, 1])
    
    let outputLegend = legends.append('g')
      .attr('class', 'outputLegend')
      .attr('transform', `translate(${nodeCoordinate[11][0].x}, ${0})`);
    
    outputLegend.append('rect')
      .attr('width', nodeLength)
      .attr('height', legendHeight)
      .style('fill', 'gray');
    
    outputLegend.append('g')
      .attr('transform', `translate(0, ${legendHeight})`)
      .call(outputLegendAxis);
    
    // Add input image legend
    let inputLegend = legends.append('g')
      .attr('class', 'inputLegend')
      .attr('transform', `translate(${nodeCoordinate[0][0].x}, ${0})`);
    
    inputLegend.append('rect')
      .attr('width', nodeLength)
      .attr('height', legendHeight)
      .attr('transform', `rotate(180, ${nodeLength/2}, ${legendHeight/2})`)
      .style('fill', 'url(#inputGradient)');
    
    inputLegend.append('g')
      .attr('transform', `translate(0, ${legendHeight})`)
      .call(outputLegendAxis);


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
    font-size: 12px;
    dominant-baseline: middle;
    text-anchor: middle;
  }

  :global(.colorLegend) {
    font-size: 10px;
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
    <svg id="cnn-svg" width="1080" height="560"></svg>
  </div>
</div>