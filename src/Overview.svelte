<script>
  import { onMount } from 'svelte';
  import { loadTrainedModel, constructCNN } from './cnn-tf.js';
  import { cnnStore } from './stores.js';
  import ConvolutionView from './Convolutionview.svelte';

  // View bindings
  let overviewComponent;
  let cnnLayerRanges = {};
  let scaleLevelSet = new Set(['local', 'module', 'global']);
  let selectedScaleLevel = 'local';
  let previousSelectedScaleLevel = selectedScaleLevel;
  let svg = undefined;
  let detailedMode = false;
  let nodeCoordinate = [];

  $: selectedScaleLevel, selectedScaleLevelChanged();

  // Configs
  let nodeLength = 40;
  let numLayers = 12;
  let edgeOpacity = 0.8;
  let edgeInitColor = 'rgb(230, 230, 230)';
  let edgeHoverColor = 'rgb(130, 130, 130)';
  let edgeHoverOuting = false;
  let edgeStrokeWidth = 0.7;
  let model = undefined;
  // gapRatio = long gap / short gap
  let gapRatio = 4;
  // hSpaceAroundGap is the short gap
  let hSpaceAroundGap = undefined;
  let vSpaceAroundGap = undefined;

  let svgPaddings = {top: 20, bottom: 30};

  let layerColorScales = {
    input: [d3.interpolateGreys, d3.interpolateGreys, d3.interpolateGreys],
    conv: d3.interpolateRdBu,
    relu: d3.interpolateRdBu,
    pool: d3.interpolateRdBu,
    fc: d3.interpolateGreys
  };

  let layerIndexDict = {
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

  let classLists = ['lifeboat', 'ladybug', 'pizza', 'bell pepper', 'school bus',
    'koala', 'espresso', 'red panda', 'orange', 'sport car'];
  
  let imageOptions = ['espresso_1.jpeg', 'panda_1.jpeg', 'car_1.jpeg',
    'boat_1.jpeg', 'koala_1.jpeg', 'pizza_1.jpeg', 'pepper_1.jpeg', 'bug_1.jpeg'];
  let selectedImage = imageOptions[0];

  let nodeData;

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
        svg.selectAll(`.${previousSelectedScaleLevel}-legend`)
          .classed('hidden', true);

        // Show selected legends
        svg.selectAll(`.${selectedScaleLevel}-legend`)
          .classed('hidden', !detailedMode);
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
    let range = cnnLayerRanges[selectedScaleLevel][layerIndexDict[d.layerName]];
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

  const drawOutputScore = (d, i, g, scale) => {
    // console.log(d.output, scale(d.output))
    let group = d3.select(g[i]);
    group.select('rect.output-rect')
      .transition('output')
      .delay(500)
      .duration(800)
      .ease(d3.easeCubicIn)
      .attr('width', scale(d.output))
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

  const getOutputKnot = (point) => {
    return {
      x: point.x + nodeLength,
      y: point.y + nodeLength / 2
    };
  }

  const getInputKnot = (point) => {
    return {
      x: point.x,
      y: point.y + nodeLength / 2
    }
  }

  const getLinkData = (cnn, nodeCoordinate) => {
    let linkData = [];
    // Create links backward (starting for the first conv layer)
    for (let l = 1; l < cnn.length; l++) {
      for (let n = 0; n < cnn[l].length; n++) {
        let isOutput = cnn[l][n].layerName === 'output';
        let curTarget = getInputKnot(nodeCoordinate[l][n]);
        for (let p = 0; p < cnn[l][n].inputLinks.length; p++) {
          // Specially handle output layer (since we are ignoring the flatten)
          let inputNodeIndex = cnn[l][n].inputLinks[p].source.index;
          
          if (isOutput) {
            let flattenDimension = cnn[l-1][0].output.length *
              cnn[l-1][0].output.length;
            if (inputNodeIndex % flattenDimension !== 0){
                continue;
            }
            inputNodeIndex = Math.floor(inputNodeIndex / flattenDimension);
          }
          let curSource = getOutputKnot(nodeCoordinate[l-1][inputNodeIndex]);
          let curWeight = cnn[l][n].inputLinks[p].weight;
          linkData.push({
            source: curSource,
            target: curTarget,
            weight: curWeight,
            targetLayerIndex: l,
            targetNodeIndex: n,
            sourceNodeIndex: inputNodeIndex
          });
        }
      }
    }
    return linkData;
  }

  const nodeClickHandler = (d, i) => {
    // Opens low-level convolution animation when a conv node is clicked.
    if (d.type === 'conv') {
      /*
      var data = new Array();
      for (let j = 0; j < d.inputLinks.length; j++) {
        data.push(new Array());
        data[j].push({
          input: d.inputLinks[j].source.output,
          kernel: d.inputLinks[j].weight,
          output: d.inputLinks[j].dest.output,
        })
      }
      nodeData = data[i];
      */
    }

    // Enter the second view (layer-view) when user clicks a conv node
    if (d.type === 'conv') {
      if (d.layerName === 'conv_1_1') {
        console.log(1);
        // Compute the target location

      }
    }
  }

  const nodeMouseoverHandler = (d, i, g) => {
    // Highlight the edges
    let layerIndex = layerIndexDict[d.layerName];
    let nodeIndex = d.index;
    let edgeGroup = svg.select('g.cnn-group').select('g.edge-group');
    
    edgeGroup.selectAll(`path.edge-${layerIndex}-${nodeIndex}`)
      .raise()
      .transition()
      .ease(d3.easeCubicInOut)
      .duration(400)
      .style('stroke', edgeHoverColor)
      .style('stroke-width', '1')
      .style('opacity', 1);
    
    // Highlight its border
    d3.select(g[i]).select('rect.bounding')
      .classed('hidden', false);
    
    // Highlight source's border
    d.inputLinks.forEach(link => {
      let layerIndex = layerIndexDict[link.source.layerName];
      let nodeIndex = link.source.index;
      svg.select(`g#layer-${layerIndex}-node-${nodeIndex}`)
        .select('rect.bounding')
        .classed('hidden', false);
    })
  }

  const nodeMouseoutHandler = (d, i, g) => {
    let layerIndex = layerIndexDict[d.layerName];
    let nodeIndex = d.index;
    let edgeGroup = svg.select('g.cnn-group').select('g.edge-group');
    
    edgeGroup.selectAll(`path.edge-${layerIndex}-${nodeIndex}`)
      .transition()
      .ease(d3.easeCubicOut)
      .duration(200)
      .style('stroke', edgeInitColor)
      .style('stroke-width', edgeStrokeWidth)
      .style('opacity', edgeOpacity);
    
    d3.select(g[i]).select('rect').classed('hidden', true);

    d.inputLinks.forEach(link => {
      let layerIndex = layerIndexDict[link.source.layerName];
      let nodeIndex = link.source.index;
      svg.select(`g#layer-${layerIndex}-node-${nodeIndex}`)
        .select('rect.bounding')
        .classed('hidden', true);
    })
  }

  const drawLegends = (legends, legendHeight) => {
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
        .attr('class', 'legend local-legend')
        .attr('id', `local-legend-${i}-1`)
        .classed('hidden', !detailedMode || selectedScaleLevel !== 'local')
        .attr('transform', `translate(${nodeCoordinate[start][0].x}, ${0})`);

      localLegend1.append('rect')
        .attr('width', 2 * nodeLength + hSpaceAroundGap)
        .attr('height', legendHeight)
        .style('fill', 'url(#convGradient)');
      
      localLegend1.append('g')
        .attr('transform', `translate(0, ${legendHeight})`)
        .call(localLegendAxis1)

      let localLegend2 = legends.append('g')
        .attr('class', 'legend local-legend')
        .attr('id', `local-legend-${i}-2`)
        .classed('hidden', !detailedMode || selectedScaleLevel !== 'local')
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
        .range([0, 5 * nodeLength + 3 * hSpaceAroundGap +
          1 * hSpaceAroundGap * gapRatio])
        .domain([-range, range]);

      let moduleLegendAxis = d3.axisBottom()
        .scale(moduleLegendScale)
        .tickFormat(d3.format('.2f'))
        .tickValues([-range, -(range / 2), 0, range/2, range]);

      let moduleLegend = legends.append('g')
        .attr('class', 'legend module-legend')
        .attr('id', `module-legend-${i}`)
        .classed('hidden', !detailedMode || selectedScaleLevel !== 'module')
        .attr('transform', `translate(${nodeCoordinate[start][0].x}, ${0})`);

      moduleLegend.append('rect')
        .attr('width', 5 * nodeLength + 3 * hSpaceAroundGap +
          1 * hSpaceAroundGap * gapRatio)
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
      .range([0, 10 * nodeLength + 6 * hSpaceAroundGap +
        3 * hSpaceAroundGap * gapRatio])
      .domain([-range, range]);

    let globalLegendAxis = d3.axisBottom()
      .scale(globalLegendScale)
      .tickFormat(d3.format('.2f'))
      .tickValues([-range, -(range / 2), 0, range/2, range]);

    let globalLegend = legends.append('g')
      .attr('class', 'legend global-legend')
      .attr('id', 'global-legend')
      .classed('hidden', !detailedMode || selectedScaleLevel !== 'global')
      .attr('transform', `translate(${nodeCoordinate[start][0].x}, ${0})`);

    globalLegend.append('rect')
      .attr('width', 10 * nodeLength + 6 * hSpaceAroundGap +
        3 * hSpaceAroundGap * gapRatio)
      .attr('height', legendHeight)
      .style('fill', 'url(#convGradient)');
    
    globalLegend.append('g')
      .attr('transform', `translate(0, ${legendHeight})`)
      .call(globalLegendAxis)

    // Add output legend
    let outputRectScale = d3.scaleLinear()
          .domain(cnnLayerRanges.output)
          .range([0, nodeLength]);

    let outputLegendAxis = d3.axisBottom()
      .scale(outputRectScale)
      .tickFormat(d3.format('.1f'))
      .tickValues([0, cnnLayerRanges.output[1]])
    
    let outputLegend = legends.append('g')
      .attr('class', 'legend output-legend')
      .attr('id', 'output-legend')
      .classed('hidden', !detailedMode)
      .attr('transform', `translate(${nodeCoordinate[11][0].x}, ${0})`);
    
    outputLegend.append('rect')
      .attr('width', nodeLength)
      .attr('height', legendHeight)
      .style('fill', 'gray');
    
    outputLegend.append('g')
      .attr('transform', `translate(0, ${legendHeight})`)
      .call(outputLegendAxis);
    
    // Add input image legend
    let inputScale = d3.scaleLinear()
      .range([0, nodeLength])
      .domain([0, 1]);

    let inputLegendAxis = d3.axisBottom()
      .scale(inputScale)
      .tickFormat(d3.format('.1f'))
      .tickValues([0, 0.5, 1]);

    let inputLegend = legends.append('g')
      .attr('class', 'legend input-legend')
      .classed('hidden', !detailedMode)
      .attr('transform', `translate(${nodeCoordinate[0][0].x}, ${0})`);
    
    inputLegend.append('rect')
      .attr('width', nodeLength)
      .attr('height', legendHeight)
      .attr('transform', `rotate(180, ${nodeLength/2}, ${legendHeight/2})`)
      .style('fill', 'url(#inputGradient)');
    
    inputLegend.append('g')
      .attr('transform', `translate(0, ${legendHeight})`)
      .call(inputLegendAxis);
  }

  const drawCNN = (width, height, cnn, cnnGroup) => {
    // Draw the CNN
    // There are 8 short gaps and 5 long gaps
    hSpaceAroundGap = (width - nodeLength * numLayers) / (8 + 5 * gapRatio);
    vSpaceAroundGap = undefined;
    let leftAccuumulatedSpace = 0;

    // Iterate through the cnn to draw nodes in each layer
    for (let l = 0; l < cnn.length; l++) {
      let curLayer = cnn[l];
      let isOutput = curLayer[0].layerName === 'output';

      nodeCoordinate.push([]);

      // Compute the x coordinate of the whole layer
      // Output layer and conv layer has long gaps
      if (isOutput || curLayer[0].type === 'conv') {
        leftAccuumulatedSpace += hSpaceAroundGap * gapRatio;
      } else {
        leftAccuumulatedSpace += hSpaceAroundGap;
      }

      // All nodes share the same x coordiante (left in div style)
      let left = leftAccuumulatedSpace;

      let layerGroup = cnnGroup.append('g')
        .attr('class', 'cnn-layer-group')
        .attr('id', `cnn-layer-group-${l}`);

      vSpaceAroundGap = (height - nodeLength * curLayer.length) /
        (curLayer.length + 1);

      let nodeGroups = layerGroup.selectAll('g.node-group')
        .data(curLayer)
        .enter()
        .append('g')
        .attr('class', 'node-group')
        .style('cursor', 'pointer')
        .style('pointer-events', 'all')
        .on('click', nodeClickHandler)
        .on('mouseover', nodeMouseoverHandler)
        .on('mouseout', nodeMouseoutHandler)
        .classed('node-output', isOutput)
        .attr('id', (d, i) => {
          // Compute the coordinate
          // Not using transform on the group object because of a decade old
          // bug on webkit (safari)
          // https://bugs.webkit.org/show_bug.cgi?id=23113
          let top = i * nodeLength + (i + 1) * vSpaceAroundGap;
          top += svgPaddings.top;
          nodeCoordinate[l].push({x: left, y: top});
          return `layer-${l}-node-${i}`
        });
      
      if (curLayer[0].layerName !== 'output') {
        // Embed canvas in these groups
        nodeGroups.append('foreignObject')
          .attr('width', nodeLength)
          .attr('height', nodeLength)
          .attr('x', left)
          .attr('y', (d, i) => nodeCoordinate[l][i].y)
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
        
        // Add a rectangle to show the border
        nodeGroups.append('rect')
          .attr('class', 'bounding')
          .attr('width', nodeLength)
          .attr('height', nodeLength)
          .attr('x', left)
          .attr('y', (d, i) => nodeCoordinate[l][i].y)
          .style('fill', 'none')
          .style('stroke', 'gray')
          .style('stroke-width', 1)
          .classed('hidden', true);
      } else {
        nodeGroups.append('rect')
          .attr('class', 'output-rect')
          .attr('x', left)
          .attr('y', (d, i) => nodeCoordinate[l][i].y + nodeLength / 4)
          .attr('height', nodeLength / 2)
          .attr('width', 0)
          .style('fill', 'gray');
        nodeGroups.append('text')
          .attr('class', 'output-text')
          .attr('x', left)
          .attr('y', (d, i) => nodeCoordinate[l][i].y + nodeLength * 3 / 4)
          .style('dominant-baseline', 'hanging')
          .style('font-size', '11px')
          .style('color', 'gray')
          .style('opacity', 0.5)
          .text((d, i) => classLists[i]);
      }
      leftAccuumulatedSpace += nodeLength;
    }

    // Compute the scale of the output score width (mapping the the node
    // width to the max output score)
    let outputRectScale = d3.scaleLinear()
          .domain(cnnLayerRanges.output)
          .range([0, nodeLength]);

    // Draw the canvas
    svg.selectAll('canvas.node-canvas').each(drawOutput);
    svg.selectAll('g.node-output').each(
      (d, i, g) => drawOutputScore(d, i, g, outputRectScale)
    );

    // Add layer label
    let layerNames = cnn.map(d => d[0].layerName);
    console.log(nodeCoordinate);
    svg.selectAll('g.layer-detailed-label')
      .data(layerNames)
      .enter()
      .append('g')
      .attr('class', 'layer-detailed-label')
      .classed('hidden', !detailedMode)
      .attr('transform', (d, i) => {
        let x = nodeCoordinate[i][0].x + nodeLength / 2;
        let y = (svgPaddings.top + vSpaceAroundGap) / 2;
        return `translate(${x}, ${y})`;
      })
      .append('text')
      .style('dominant-baseline', 'middle')
      .text(d => d);
    
    svg.selectAll('g.layer-label')
      .data(layerNames)
      .enter()
      .append('g')
      .attr('class', 'layer-label')
      .classed('hidden', detailedMode)
      .attr('transform', (d, i) => {
        let x = nodeCoordinate[i][0].x + nodeLength / 2;
        let y = (svgPaddings.top + vSpaceAroundGap) / 2;
        return `translate(${x}, ${y})`;
      })
      .append('text')
      .style('dominant-baseline', 'middle')
      .text(d => {
        if (d.includes('conv')) { return 'conv' }
        if (d.includes('relu')) { return 'relu' }
        if (d.includes('max_pool')) { return 'max_pool'}
        return d
      });

    // Add layer color scale legends
    getLegendGradient(svg, layerColorScales.conv, 'convGradient');
    getLegendGradient(svg, layerColorScales.input[0], 'inputGradient');

    let legendHeight = 5;
    let legends = svg.append('g')
        .attr('class', 'color-legend')
        .attr('transform', `translate(${0}, ${
          svgPaddings.top + vSpaceAroundGap * (10) + vSpaceAroundGap +
          nodeLength * 10
        })`);
    
    drawLegends(legends, legendHeight);

    // Add edges between nodes
    let linkGen = d3.linkHorizontal()
      .x(d => d.x)
      .y(d => d.y);
    
    let source = nodeCoordinate[0][0];
    let target = nodeCoordinate[1][0];
    let linkData = getLinkData(cnn, nodeCoordinate);

    let edgeGroup = cnnGroup.append('g')
      .attr('class', 'edge-group');
    
    edgeGroup.selectAll('path.edge')
      .data(linkData)
      .enter()
      .append('path')
      .attr('class', d =>
        `edge edge-${d.targetLayerIndex} edge-${d.targetLayerIndex}-${d.targetNodeIndex}`)
      .attr('id', d => 
        `edge-${d.targetLayerIndex}-${d.targetNodeIndex}-${d.sourceNodeIndex}`)
      .attr('d', d => linkGen({source: d.source, target: d.target}))
      .style('fill', 'none')
      .style('stroke-width', edgeStrokeWidth)
      .style('opacity', edgeOpacity)
      .style('stroke', edgeInitColor);
  }

  const updateCNN = (cnn) => {
    // Compute the scale of the output score width (mapping the the node
    // width to the max output score)
    let outputRectScale = d3.scaleLinear()
        .domain(cnnLayerRanges.output)
        .range([0, nodeLength]);

    // Rebind the cnn data to layer groups layer by layer
    for (let l = 0; l < cnn.length; l++) {
      let curLayer = cnn[l];
      let layerGroup = svg.select(`g#cnn-layer-group-${l}`);

      let nodeGroups = layerGroup.selectAll('g.node-group')
        .data(curLayer);

      if (l < cnn.length - 1) {
        // Redraw the canvas and output node
        nodeGroups.transition('disappear')
          .duration(300)
          .ease(d3.easeCubicOut)
          .style('opacity', 0)
          .on('end', function() {
            d3.select(this).select('canvas.node-canvas').each(drawOutput);
            d3.select(this).transition('appear')
              .duration(700)
              .ease(d3.easeCubicIn)
              .style('opacity', 1);
          });
      } else {
        nodeGroups.each(
          (d, i, g) => drawOutputScore(d, i, g, outputRectScale)
        );
      }
    }

    // Update the color scale legend
    // Local legends
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
      
      svg.select(`g#local-legend-${i}-1`).select('g').call(localLegendAxis1);
      svg.select(`g#local-legend-${i}-2`).select('g').call(localLegendAxis2);
    }

    // Module legend
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
      
      svg.select(`g#module-legend-${i}`).select('g').call(moduleLegendAxis);
    }

    // Global legend
    let start = 1;
    let range = cnnLayerRanges.global[start];

    let globalLegendScale = d3.scaleLinear()
      .range([0, 10 * nodeLength + 9 * hSpaceAroundGap])
      .domain([-range, range]);

    let globalLegendAxis = d3.axisBottom()
      .scale(globalLegendScale)
      .tickFormat(d3.format('.2f'))
      .tickValues([-range, -(range / 2), 0, range/2, range]);

    svg.select(`g#global-legend`).select('g').call(globalLegendAxis);

    // Output legend
    let outputLegendAxis = d3.axisBottom()
      .scale(outputRectScale)
      .tickFormat(d3.format('.1f'))
      .tickValues([0, cnnLayerRanges.output[1]]);
    
    svg.select('g#output-legend').select('g').call(outputLegendAxis);
  }

  const updateCNNLayerRanges = (cnn) => {
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
    cnnLayerRanges.output = [0, d3.max(cnn[cnn.length - 1].map(d => d.output))];
  }

  onMount(async () => {
    // Create SVG
    svg = d3.select(overviewComponent)
      .select('#cnn-svg');
    let width = Number(svg.style('width').replace('px', ''));
    let height = Number(svg.style('height').replace('px', '')) -
      svgPaddings.top - svgPaddings.bottom;
    let cnnGroup = svg.append('g')
      .attr('class', 'cnn-group');
    
    console.time('Construct cnn');
    model = await loadTrainedModel('/assets/data/model.json');
    let cnn = await constructCNN(`/assets/img/${selectedImage}`, model);
    console.timeEnd('Construct cnn');
    cnnStore.set(cnn);

    // Ignore the flatten layer for now
    let flatten = cnn[cnn.length - 2];
    cnn.splice(cnn.length - 2, 1);
    console.log(cnn);

    updateCNNLayerRanges(cnn);

    // Create and draw the CNN view
    drawCNN(width, height, cnn, cnnGroup);
  })

  const detailedButtonClicked = () => {
    detailedMode = !detailedMode;

    // Show the legend
    svg.selectAll(`.${selectedScaleLevel}-legend`)
      .classed('hidden', !detailedMode);
    
    svg.selectAll('.input-legend').classed('hidden', !detailedMode);
    svg.selectAll('.output-legend').classed('hidden', !detailedMode);
    
    // Switch the layer name
    svg.selectAll('.layer-detailed-label')
      .classed('hidden', !detailedMode);
    
    svg.selectAll('.layer-label')
      .classed('hidden', detailedMode);
  }

  const imageOptionClicked = async (e) => {
    let newImageName = d3.select(e.target).attr('data-imageName');

    if (newImageName !== selectedImage) {
      selectedImage = newImageName;

      // Re-compute the CNN using the new input image
      let cnn = await constructCNN(`/assets/img/${selectedImage}`, model);

      // Ignore the flatten layer for now
      let flatten = cnn[cnn.length - 2];
      cnn.splice(cnn.length - 2, 1);

      // Update all scales used in the CNN view
      updateCNNLayerRanges(cnn);
      updateCNN(cnn);
    }
  }
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
    padding: 5px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .left-control {
    display: flex;
  }

  .right-control {
    display: flex;
  }

  .cnn {
    width: 100%;
    padding: 0;
    background: var(--light-gray);
    display: flex;
  }

  svg {
    margin: 0 auto;
    height: calc(100vh - 100px);
    width: calc(100vw - 100px);
  }

  .is-very-small {
    font-size: 12px;
  }

  #detailed-button {
    margin-left: 10px;
    color: #dbdbdb;
    transition: border-color 300ms ease-in-out, color 200ms ease-in-out;
  }

  #detailed-button.is-activated, #detailed-button.is-activated:hover {
    color: #3273dc;
    border-color: #3273dc;
  }

  #detailed-button:hover {
    color: #b5b5b5;
  }

  .image-container {
    width: 40px;
    height: 40px;
    border-radius: 4px;
    display: inline-block;
    border: 2px solid black;
    margin-left: 10px;
    cursor: pointer;
    pointer-events: all;
    transition: border 300ms ease-in-out;
  }

  .image-container img {
    object-fit: cover;
    max-width: 100%;
    max-height: 100%;
    z-index: -1;
    transition: opacity 300ms ease-in-out;
  }

  .image-container.inactive {
    border: 2px solid rgba(0, 0, 0, 0.05);
  }

  .image-container.inactive > img {
    opacity: 0.3;
  }

  .image-container.inactive:hover {
    border: 2px solid rgba(0, 0, 0, 0.3);
  }

  :global(canvas) {
    image-rendering: crisp-edges;
  }

  :global(.layer-label, .layer-detailed-label) {
    font-size: 12px;
    text-anchor: middle;
    opacity: 0.8;
    transition: opacity 300ms ease-in-out;
  }

  :global(.colorLegend) {
    font-size: 10px;
  }

  :global(.legend) {
    transition: opacity 400ms ease-in-out;
  }

  :global(.legend > rect) {
    opacity: 0.8;
  }

  :global(.legend#output-legend > rect) {
    opacity: 1;
  }

  :global(.hidden) {
    opacity: 0;
    pointer-events: none;
  }

  :global(.bounding) {
    transition: opacity 400ms ease-in-out;
  }

</style>

<div class="overview"
  bind:this={overviewComponent}>

  <div class="control-container">

    <div class="left-control">
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

      <button class="button is-very-small"
        id="detailed-button"
        class:is-activated={detailedMode}
        on:click={detailedButtonClicked}>
        <span class="icon">
          <i class="fas fa-eye"></i>
        </span>
      </button>
    </div>

    <div class="right-control">
      {#each imageOptions as image, i}
        <div class="image-container"
          on:click={imageOptionClicked}
          class:inactive={selectedImage !== image}
          data-imageName={image}>
          <img src="/assets/img/{image}"
            alt="image option"
            data-imageName={image}/>
        </div>
      {/each}
    </div>
    
  </div>

  <div class="cnn">
    <svg id="cnn-svg"></svg>
  </div>
</div>
<ConvolutionView input={nodeData == undefined ? [[1,2,3,4], [4,5,6,7], [7,8,9,10], [7,8,9,10]] : nodeData[0].input} kernel={nodeData == undefined ? [[1,2], [3,4]] : nodeData[0].kernel} output={nodeData == undefined ? [[1,2,3], [4,5,6], [7,8,9]] : nodeData[0].output} />