<script>
  import { onMount } from 'svelte';
  import { loadTrainedModel, constructCNN } from './cnn-tf.js';
  import { singleConv, init2DArray, matrixAdd } from './cnn.js';
  import { cnnStore } from './stores.js';
  import ConvolutionView from './Convolutionview.svelte';

  // View bindings
  let overviewComponent;
  let cnnLayerRanges = {};
  let scaleLevelSet = new Set(['local', 'module', 'global']);
  let selectedScaleLevel = 'local';
  let previousSelectedScaleLevel = selectedScaleLevel;
  let wholeSvg = undefined;
  let svg = undefined;
  let detailedMode = false;
  let nodeCoordinate = [];

  $: selectedScaleLevel, selectedScaleLevelChanged();

  // Configs
  let nodeLength = 40;
  let plusSymbolRadius = nodeLength / 5;
  let numLayers = 12;
  let edgeOpacity = 0.8;
  let edgeInitColor = 'rgb(230, 230, 230)';
  let edgeHoverColor = 'rgb(130, 130, 130)';
  let edgeHoverOuting = false;
  let edgeStrokeWidth = 0.7;
  let intermediateColor = 'gray';
  let width = undefined;
  let height = undefined;
  let model = undefined;
  // gapRatio = long gap / short gap
  let gapRatio = 4;
  // hSpaceAroundGap is the short gap
  let hSpaceAroundGap = undefined;
  let vSpaceAroundGap = undefined;
  let needRedraw = [undefined, undefined];
  let selectedNode = {layerName: '', index: -1, data: null};
  let svgPaddings = {top: 20, bottom: 30, left: 50, right: 50};
  let isInIntermediateView = false;
  let kernelRectLength = 8/3;

  // Wait to load
  let cnn = undefined;

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
  let selectedNodeIndex = 0;

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

  const drawOutput = (d, i, g, range) => {
    let canvas = g[i];
    if (range === undefined) {
      range = cnnLayerRanges[selectedScaleLevel][layerIndexDict[d.layerName]];
    }
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

  const getLinkData = (nodeCoordinate) => {
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

  const moveLayerX = (arg) => {
    let layerIndex = arg.layerIndex;
    let targetX = arg.targetX;
    let disable = arg.disable;
    let delay = arg.delay;
    let opacity = arg.opacity;
    let specialIndex = arg.specialIndex;
    let onEndFunc = arg.onEndFunc;
    let transitionName = arg.onEndFunc === undefined ? 'move': arg.onEndFunc;

    // Move the selected layer
    let curLayer = svg.select(`g#cnn-layer-group-${layerIndex}`);
    curLayer.selectAll('g.node-group').each((d, i, g) => {
      d3.select(g[i])
        .style('cursor', disable && i !== specialIndex ? 'default' : 'pointer')
        .style('pointer-events', disable && i !== specialIndex ? 'none' : 'all')
        .select('foreignObject')
        .transition(transitionName)
        .ease(d3.easeCubicInOut)
        .delay(delay)
        .duration(500)
        .attr('x', targetX);
      
      d3.select(g[i])
        .select('rect.bounding')
        .transition(transitionName)
        .ease(d3.easeCubicInOut)
        .delay(delay)
        .duration(500)
        .attr('x', targetX);
      
      if (opacity !== undefined && i !== specialIndex) {
        d3.select(g[i])
          .select('foreignObject')
          .style('opacity', opacity);
      }
    });
    
    // Also move the layer labels
    svg.select(`g#layer-label-${layerIndex}`)
      .transition(transitionName)
      .ease(d3.easeCubicInOut)
      .delay(delay)
      .duration(500)
      .attr('transform', d => {
        let x = targetX + nodeLength / 2;
        let y = (svgPaddings.top + vSpaceAroundGap) / 2;
        return `translate(${x}, ${y})`;
      })
      .on('end', onEndFunc);
  }

  const addOverlayGradient = (gradientID, stops) => {
    // Create a gradient
    let defs = svg.append("defs")
      .attr('class', 'overlay-gradient');

    let gradient = defs.append("linearGradient")
      .attr("id", gradientID)
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "100%")
      .attr("y2", "100%");
    
    stops.forEach(s => {
      gradient.append('stop')
        .attr('offset', s.offset)
        .attr('stop-color', s.color)
        .attr('stop-opacity', s.opacity);
    })
  }

  const drawIntermidiateCanvas = (context, range, colorScale, length,
    dataMatrix) => {
    // Set up a second convas in order to resize image
    let imageLength = length;
    let bufferCanvas = document.createElement("canvas");
    let bufferContext = bufferCanvas.getContext("2d");
    bufferCanvas.width = imageLength;
    bufferCanvas.height = imageLength;

    // Fill image pixel array
    let imageSingle = bufferContext.getImageData(0, 0, imageLength, imageLength);
    let imageSingleArray = imageSingle.data;

    for (let i = 0; i < imageSingleArray.length; i+=4) {
      let pixeIndex = Math.floor(i / 4);
      let row = Math.floor(pixeIndex / imageLength);
      let column = pixeIndex % imageLength;
      let color = d3.rgb(colorScale((dataMatrix[row][column] + range / 2)
        / range));

      imageSingleArray[i] = color.r;
      imageSingleArray[i + 1] = color.g;
      imageSingleArray[i + 2] = color.b;
      imageSingleArray[i + 3] = 255;
    }

    // Use drawImage to resize the original pixel array, and put the new image
    // (canvas) into corresponding canvas
    bufferContext.putImageData(imageSingle, 0, 0);
    context.drawImage(bufferCanvas, 0, 0, imageLength, imageLength,
      0, 0, nodeLength, nodeLength);
  }

  const intermediateNodeMouseOverHandler = (d, i, g) => {
    d3.select(g[i])
      .select('rect.bounding')
      .classed('very-strong', true);
  }

  const intermediateNodeMouseLeaveHandler = (d, i, g) => {

  }

  const intermediateNodeClicked = (d, i, g) => {
    selectedNodeIndex = +g[0].getAttribute('node-index');
    // debugger;
  }

  const createIntermediateNode = (groupLayer, x, y, nodeIndex, interaction=false) => {
    let newNode = groupLayer.append('g')
      .attr('class', 'intermediate-node')
      .attr('cursor', interaction ? 'pointer': 'default')
      .attr('pointer-events', interaction ? 'all': 'none')
      .attr('node-index', nodeIndex)
      .on('mouseover', intermediateNodeMouseOverHandler)
      .on('mouseleave', intermediateNodeMouseLeaveHandler)
      .on('click', intermediateNodeClicked);
    
    let canvas = newNode.append('foreignObject')
      .attr('width', nodeLength)
      .attr('height', nodeLength)
      .attr('x', x)
      .attr('y', y)
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
    newNode.append('rect')
      .attr('class', 'bounding')
      .attr('width', nodeLength)
      .attr('height', nodeLength)
      .attr('x', x)
      .attr('y', y)
      .style('fill', 'none')
      .style('stroke', intermediateColor)
      .style('stroke-width', 1);
    
    return newNode;
  }

  const drawIntermediateLayer = (curLayerIndex, leftX, rightX, rightStart,
    intermediateGap, d, i) => {
    // Add the intermediate layer
    let intermediateLayer = svg.select('.cnn-group')
      .append('g')
      .attr('class', 'intermediate-layer')
      .style('opacity', 0);
    
    // Tried to add a rectangle to block the intermediate because of webkit's
    // horrible support (decade old bug) for foreignObject. It doesnt work either.
    // https://bugs.webkit.org/show_bug.cgi?id=23113
    // (1). ForeignObject's inside position is wrong on webkit
    // (2). 'opacity' of ForeignObject doesn't work on webkit
    // (3). ForeignObject always show up at the front regardless the svg
    //      stacking order on webkit

    let intermediateX1 = leftX + nodeLength + intermediateGap;
    let intermediateX2 = intermediateX1 + nodeLength + intermediateGap * 1.5;

    let range = cnnLayerRanges[selectedScaleLevel][curLayerIndex];
    let colorScale = layerColorScales[d.type];
    
    // Copy the previsious layer to construct foreignObject placeholder
    // Also add edges from/to the intermediate layer in this loop
    let linkData = [];

    // Accumulate the intermediate sum
    let itnermediateSumMatrix = init2DArray(d.output.length,
      d.output.length, 0);

    // First intermediate layer
    nodeCoordinate[curLayerIndex - 1].forEach((n, ni) => {

      // Compute the intermediate value
      let inputMatrix = cnn[curLayerIndex - 1][ni].output;
      let kernelMatrix = cnn[curLayerIndex][i].inputLinks[ni].weight;
      let interMatrix = singleConv(inputMatrix, kernelMatrix);

      // Update the intermediate sum
      itnermediateSumMatrix = matrixAdd(itnermediateSumMatrix, interMatrix);

      // Layout the canvas and rect
      let newNode = createIntermediateNode(intermediateLayer, intermediateX1,
        n.y, ni, true);
      
      // Draw the canvas
      let context = newNode.select('canvas').node().getContext('2d');
      drawIntermidiateCanvas(context, range, colorScale, d.output.length,
        interMatrix);      

      // Edge: input -> intermediate1
      linkData.push({
        source: getOutputKnot({x: leftX, y: n.y}),
        target: getInputKnot({x: intermediateX1, y: n.y}),
        name: `input-${ni}-inter1-${ni}`
      });

      // Edge: intermediate1 -> intermediate2-1
      linkData.push({
        source: getOutputKnot({x: intermediateX1, y: n.y}),
        target: getInputKnot({x: intermediateX2,
          y: nodeCoordinate[curLayerIndex][i].y}),
        name: `inter1-${ni}-inter2-1`
      });

      // Create a small kernel illustration
      // Here we minus 2 because of no padding
      let tickTime1D = nodeLength / kernelRectLength - 2;
      let kernelRectX = leftX - kernelRectLength * 3 * 2;
      let kernelGroup = intermediateLayer.append('g')
        .attr('class', `kernel-${i}`)
        .attr('transform', `translate(${kernelRectX}, ${n.y})`);

      for (let r = 0; r < kernelMatrix.length; r++) {
        for (let c = 0; c < kernelMatrix[0].length; c++) {
          kernelGroup.append('rect')
            .attr('class', 'kernel')
            .attr('x', kernelRectLength * c)
            .attr('y', kernelRectLength * r)
            .attr('width', kernelRectLength)
            .attr('height', kernelRectLength)
            .attr('fill', d3.rgb(colorScale((kernelMatrix[r][c] + range / 2) / range)));
        }
      }

      kernelGroup.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', kernelRectLength * 3)
        .attr('height', kernelRectLength * 3)
        .attr('fill', 'none')
        .attr('stroke', intermediateColor);

      // Sliding the kernel on the input channel and result channel at the same
      // time
      let kernelGroupInput = kernelGroup.clone(true);
      kernelGroupInput.style('opacity', 0.9)
        .selectAll('rect.kernel')
        .style('opacity', 0.7);

      kernelGroupInput.attr('transform',
        `translate(${leftX}, ${n.y})`)
        .attr('data-tick', 0)
        .attr('data-origin-x', leftX)
        .attr('data-origin-y', n.y);

      let kernelGroupResult = kernelGroup.clone(true);
      kernelGroupResult.style('opacity', 0.9)
        .selectAll('rect.kernel')
        .style('fill', 'none');

      kernelGroupResult.attr('transform',
        `translate(${intermediateX1}, ${n.y})`)
        .attr('data-origin-x', intermediateX1)
        .attr('data-origin-y', n.y);
      
      const slidingAnimation = () => {
        let originX = +kernelGroupInput.attr('data-origin-x');
        let originY = +kernelGroupInput.attr('data-origin-y');
        let originXResult = +kernelGroupResult.attr('data-origin-x');
        let oldTick = +kernelGroupInput.attr('data-tick');
        let x = originX + (oldTick % tickTime1D) * kernelRectLength;
        let y = originY + Math.floor(oldTick / tickTime1D) * kernelRectLength;
        let xResult = originXResult + (oldTick % tickTime1D) * kernelRectLength;

        kernelGroupInput.attr('data-tick', (oldTick + 1) % (tickTime1D * tickTime1D))
          .transition('window-sliding-input')
          .delay(800)
          .duration(0)
          .attr('transform', `translate(${x}, ${y})`);

        kernelGroupResult.attr('data-tick', (oldTick + 1) % (tickTime1D * tickTime1D))
          .transition('window-sliding-result')
          .delay(800)
          .duration(0)
          .attr('transform', `translate(${xResult}, ${y})`)
          .on('end', slidingAnimation);
      }

      slidingAnimation();
    });

    // Draw the plus operation symbol
    let symbolY = nodeCoordinate[curLayerIndex][i].y + nodeLength / 2;
    let symbolRectHeight = 1;
    let symbolGroup = intermediateLayer.append('g')
      .attr('class', 'plus-symbol')
      .attr('transform', `translate(${intermediateX2 + plusSymbolRadius}, ${symbolY})`);
    
    symbolGroup.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', plusSymbolRadius)
      .style('fill', 'none')
      .style('stroke', intermediateColor);
    
    symbolGroup.append('rect')
      .attr('x', -(plusSymbolRadius - 3))
      .attr('y', -symbolRectHeight / 2)
      .attr('width', 2 * (plusSymbolRadius - 3))
      .attr('height', symbolRectHeight)
      .style('fill', intermediateColor);

    symbolGroup.append('rect')
      .attr('x', -symbolRectHeight / 2)
      .attr('y', -(plusSymbolRadius - 3))
      .attr('width', symbolRectHeight)
      .attr('height', 2 * (plusSymbolRadius - 3))
      .style('fill', intermediateColor);

    // Place the bias rectangle below the plus sign if user clicks the firrst
    // conv node
    if (i == 0) {
      // Add bias symbol to the plus symbol
      symbolGroup.append('rect')
        .attr('x', -plusSymbolRadius)
        .attr('y', nodeLength / 2)
        .attr('width', 2 * plusSymbolRadius)
        .attr('height', 2 * plusSymbolRadius)
        .style('stroke', intermediateColor)
        .style('fill', d3.rgb(colorScale((d.bias + range / 2) / range)));
      
      // Link from bias to the plus symbol
      linkData.push({
        source: {x: intermediateX2 + plusSymbolRadius,
          y: nodeCoordinate[curLayerIndex][i].y + nodeLength},
        target: {x: intermediateX2 + plusSymbolRadius,
          y: nodeCoordinate[curLayerIndex][i].y + nodeLength / 2 + plusSymbolRadius},
        name: `bias-plus`
      });
    } else {
      // Add bias symbol to the plus symbol
      symbolGroup.append('rect')
        .attr('x', -plusSymbolRadius)
        .attr('y', -nodeLength / 2 - 2 * plusSymbolRadius)
        .attr('width', 2 * plusSymbolRadius)
        .attr('height', 2 * plusSymbolRadius)
        .style('stroke', intermediateColor)
        .style('fill', d3.rgb(colorScale((d.bias + range / 2) / range)));
      
      // Link from bias to the plus symbol
      linkData.push({
        source: {x: intermediateX2 + plusSymbolRadius,
          y: nodeCoordinate[curLayerIndex][i].y},
        target: {x: intermediateX2 + plusSymbolRadius,
          y: nodeCoordinate[curLayerIndex][i].y + nodeLength / 2 - plusSymbolRadius},
        name: `bias-plus`
      });
    }

    // Link from the plus symbol to the output
    linkData.push({
      source: getOutputKnot({x: intermediateX2 + 2 * plusSymbolRadius - nodeLength,
        y: nodeCoordinate[curLayerIndex][i].y}),
      target: getInputKnot({x: rightX,
        y: nodeCoordinate[curLayerIndex][i].y}),
      name: `symbol-output`
    });
    
    // Output -> next layer
    linkData.push({
      source: getOutputKnot({x: rightX,
        y: nodeCoordinate[curLayerIndex][i].y}),
      target: getInputKnot({x: rightStart,
        y: nodeCoordinate[curLayerIndex][i].y}),
      name: `output-next`
    });

    // Draw the layer label
    intermediateLayer.append('g')
      .attr('class', 'layer-label')
      .attr('transform', (d, i) => {
        let x = leftX + nodeLength + (nodeLength + 2 * plusSymbolRadius + 2 *
          hSpaceAroundGap * gapRatio) / 2;
        let y = (svgPaddings.top + vSpaceAroundGap) / 2;
        return `translate(${x}, ${y})`;
      })
      .append('text')
      .style('dominant-baseline', 'middle')
      .text('intermediate')

    // Draw the edges
    let linkGen = d3.linkHorizontal()
      .x(d => d.x)
      .y(d => d.y);
    
    let edgeGroup = intermediateLayer.append('g')
      .attr('class', 'edge-group');
    
    let dashoffset = 0;
    const animateEdge = (d, i, g, dashoffset) => {
      let curPath = d3.select(g[i]);
      curPath.transition()
        .duration(8000)
        .ease(d3.easeLinear)
        .attr('stroke-dashoffset', dashoffset)
        .on('end', (d, i, g) => animateEdge(d, i, g, dashoffset - 160));
    }

    edgeGroup.selectAll('path')
      .data(linkData)
      .enter()
      .append('path')
      .classed('flow-edge', d => d.name !== 'output-next')
      .attr('id', d => `edge-${d.name}`)
      .attr('d', d => linkGen({source: d.source, target: d.target}))
      .style('fill', 'none')
      .style('stroke-width', 1)
      .style('stroke', intermediateColor);

    edgeGroup.select('#edge-output-next')
      .style('opacity', 0.1);
    
    edgeGroup.selectAll('path.flow-edge')
      .attr('stroke-dasharray', '4 2')
      .attr('stroke-dashoffset', 0)
      .each((d, i, g) => animateEdge(d, i, g, dashoffset - 160));
    
    return intermediateLayer;
  }

  // Add an annotation for the kernel and the sliding
  const drawIntermediateLayerAnnotation = (arg) => {
    let leftX = arg.leftX,
      curLayerIndex = arg.curLayerIndex,
      group = arg.group,
      intermediateGap = arg.intermediateGap,
      isFirstConv = arg.isFirstConv,
      i = arg.i;

    let kernelAnnotation = group.append('g')
      .attr('class', 'kernel-annotation');
    
    kernelAnnotation.append('text')
      .text('Kernel')
      .attr('class', 'annotation-text')
      .attr('x', leftX - 2.5 * kernelRectLength * 3)
      .attr('y', nodeCoordinate[curLayerIndex - 1][0].y + kernelRectLength * 3)
      .style('dominant-baseline', 'baseline')
      .style('text-anchor', 'end');

    let sliderX, sliderY, arrowSX, arrowSY, dr;
    
    if (isFirstConv) {
      sliderX = leftX;
      sliderY = nodeCoordinate[curLayerIndex - 1][0].y + nodeLength +
        kernelRectLength * 3;
      arrowSX = leftX - 5;
      arrowSY = nodeCoordinate[curLayerIndex - 1][0].y + nodeLength +
        kernelRectLength * 3 + 5;
      dr = 20;
    } else {
      sliderX = leftX - 2.5 * kernelRectLength * 3;
      sliderY = nodeCoordinate[curLayerIndex - 1][0].y + nodeLength / 2;
      arrowSX = leftX - 2 * kernelRectLength * 3 - 2;
      arrowSY = nodeCoordinate[curLayerIndex - 1][0].y + nodeLength - 10;
      dr = 40;
    }

    let slideText = kernelAnnotation.append('text')
      .attr('x', sliderX)
      .attr('y', sliderY)
      .attr('class', 'annotation-text')
      .style('dominant-baseline', 'hanging')
      .style('text-anchor', isFirstConv ? 'start' : 'end');
    
    slideText.append('tspan')
      .text('Slide kernel over');

    slideText.append('tspan')
      .attr('x', sliderX)
      .attr('dy', '1em')
      .text('input channel to get');

    slideText.append('tspan')
      .attr('x', sliderX)
      .attr('dy', '1em')
      .text('intermediate result');

    drawArrow({
      group: group,
      tx: leftX - 5,
      ty: nodeCoordinate[curLayerIndex - 1][0].y + nodeLength / 2,
      sx: arrowSX,
      sy: arrowSY,
      dr: dr
    });

    // Add annotation for the sum operation
    let plusAnnotation = group.append('g')
      .attr('class', 'plus-annotation');
    
    let intermediateX2 = leftX + 2 * nodeLength + 2.5 * intermediateGap;
    let textX = intermediateX2;

    if (i == 0) {
      textX += 30;
    }

    let plusText = plusAnnotation.append('text')
      .attr('x', textX)
      .attr('y', nodeCoordinate[curLayerIndex][i].y + nodeLength +
        kernelRectLength * 3)
      .attr('class', 'annotation-text')
      .style('dominant-baseline', 'hanging')
      .style('text-anchor', 'start');
    
    plusText.append('tspan')
      .text('Sum up all intermediate');
    
    plusText.append('tspan')
      .attr('x', textX)
      .attr('dy', '1em')
      .text('results and then add bias');
    
    drawArrow({
      group: group,
      sx: intermediateX2 + 5,
      sy: nodeCoordinate[curLayerIndex][i].y + nodeLength + kernelRectLength * 2,
      tx: intermediateX2 + 2 * plusSymbolRadius + 3,
      ty: nodeCoordinate[curLayerIndex][i].y + nodeLength / 2 + plusSymbolRadius,
      dr: 30,
      hFlip: true
    });

    // Add annotation for the bias
    let biasTextY = nodeCoordinate[curLayerIndex][i].y;
    if (i === 0) {
      biasTextY += nodeLength + 2 * plusSymbolRadius;
    } else {
      biasTextY -= 2 * plusSymbolRadius + 5;
    }
    plusAnnotation.append('text')
      .attr('class', 'annotation-text')
      .attr('x', intermediateX2 + plusSymbolRadius)
      .attr('y', biasTextY)
      .style('text-anchor', 'middle')
      .style('dominant-baseline', i === 0 ? 'hanging' : 'baseline')
      .text('Bias');
  }

  const drawArrow = (arg) => {
      let group = arg.group,
        sx = arg.sx,
        sy = arg.sy,
        tx = arg.tx,
        ty = arg.ty,
        dr = arg.dr,
        vFlip = arg.vFlip,
        hFlip = arg.hFlip,
        cx = sx + (tx - sx) / 2,
        cy = sy + (ty - sy) / 2,
        scaleX = hFlip ? -1 : 1,
        scaleY = vFlip ? -1 : 1,
        translateX = (1 - scaleX) * tx,
        translateY = (1 - scaleY) * ty;
      
      let arrow = group.append('g')
        .attr('class', 'arrow-group');

      arrow.append('path')
        .attr("d", `M${sx},${sy}A${dr},${dr} 0 0,1 ${tx},${ty}`)
        .attr('marker-end', 'url(#marker)')
        .style('stroke', 'gray')
        .style('fill', 'none')
        .attr('transform', `translate(${translateX}, ${translateY})
          scale(${scaleX}, ${scaleY})`);
  }

  const redrawLayerIfNeeded = (curLayerIndex) => {
    // Determine the range for this layerview, and redraw the layer with
    // smaller range so all layers have the same range
    let rangePre = cnnLayerRanges[selectedScaleLevel][curLayerIndex - 1];
    let rangeCur = cnnLayerRanges[selectedScaleLevel][curLayerIndex];
    let range = Math.max(rangePre, rangeCur);

    if (rangePre > rangeCur) {
      // Redraw the current layer (selected node)
      d3.select(g[i])
        .select('canvas.node-canvas')
        .each((d, g, i) => drawOutput(d, g, i, range));
      
      // Record the change so we will re-redraw the layer when user quits
      // the intermediate view
      needRedraw = [curLayerIndex, i];
      
    } else if (rangePre < rangeCur) {
      // Redraw the previous layer (whole layer)
      svg.select(`g#cnn-layer-group-${curLayerIndex - 1}`)
        .selectAll('canvas.node-canvas')
        .each((d, g, i) => drawOutput(d, g, i, range));

      // Record the change so we will re-redraw the layer when user quits
      // the intermediate view
      needRedraw = [curLayerIndex - 1, undefined];
    }
    return range;
  }

  // Draw the legend for intermediate layer
  const drawIntermediateLayerLegend = (arg) => {
    let legendHeight = arg.legendHeight,
      curLayerIndex = arg.curLayerIndex,
      range = arg.range,
      group = arg.group,
      intermediateGap = arg.intermediateGap,
      x = arg.x,
      y = arg.y,
      isInput = arg.isInput,
      gradient = arg.gradient;

    let width = 2 * nodeLength + intermediateGap + 1.5;

    let legendScale = d3.scaleLinear()
      .range([0, width - 1.5])
      .domain(isInput ? [0, range] : [-range, range]);

    let legendAxis = d3.axisBottom()
      .scale(legendScale)
      .tickFormat(d3.format(isInput ? 'd' : '.2f'))
      .tickValues(isInput ? [0, range] : [-range, 0, range]);
    
    let intermediateLegend = group.append('g')
      .attr('id', `intermediate-legend-${curLayerIndex - 1}`)
      .attr('transform', `translate(${x}, ${y})`);
    
    let legendGroup = intermediateLegend.append('g')
      .attr('transform', `translate(0, ${legendHeight - 3})`)
      .call(legendAxis);
    
    legendGroup.selectAll('text')
      .style('font-size', '9px')
      .style('fill', intermediateColor);
    
    legendGroup.selectAll('path, line')
      .style('stroke', intermediateColor);

    intermediateLegend.append('rect')
      .attr('width', width)
      .attr('height', legendHeight)
      .attr('transform', `rotate(${isInput ? 180 : 0},
        ${width / 2}, ${legendHeight / 2})`)
      .style('fill', gradient);
  }

  const nodeClickHandler = (d, i, g) => {
    // Opens low-level convolution animation when a conv node is clicked.
    if (d.type === 'conv') {
      var data = [];
      for (let j = 0; j < d.inputLinks.length; j++) {
        data.push({
          input: d.inputLinks[j].source.output,
          kernel: d.inputLinks[j].weight,
          output: d.inputLinks[j].dest.output,
        })
      }
      nodeData = data;
    }
    // If clicked a new node, deselect the old clicked node
    if ((selectedNode.layerName !== d.layerName ||
      selectedNode.index !== d.index) && selectedNode.index !== -1) {
      let layerIndex = layerIndexDict[selectedNode.layerName];
      let nodeIndex = selectedNode.index;
      svg.select(`g#layer-${layerIndex}-node-${nodeIndex}`)
        .select('rect')
        .classed('hidden', true);

      selectedNode.data.inputLinks.forEach(link => {
        let layerIndex = layerIndexDict[link.source.layerName];
        let nodeIndex = link.source.index;
        svg.select(`g#layer-${layerIndex}-node-${nodeIndex}`)
          .select('rect.bounding')
          .classed('hidden', true);
      })
    }

    // Record the current clicked node
    selectedNode.layerName = d.layerName;
    selectedNode.index = d.index;
    selectedNode.data = d;

    // Enter the second view (layer-view) when user clicks a conv node
    if (d.type === 'conv' && !isInIntermediateView) {
      isInIntermediateView = true;
      if (d.layerName === 'conv_1_1') {
        // Compute the target location
        let curLayerIndex = layerIndexDict[d.layerName];
        let targetX = nodeCoordinate[curLayerIndex - 1][0].x + 2 * nodeLength +
          2 * hSpaceAroundGap * gapRatio + plusSymbolRadius * 2;
        let intermediateGap = (hSpaceAroundGap * gapRatio * 2) / 3;

        // Move the selected layer
        moveLayerX({layerIndex: curLayerIndex, targetX: targetX, disable: true,
          delay: 0, opacity: 0.15, specialIndex: i});

        // Hide the edges
        svg.select('g.edge-group').classed('hidden', true);

        // Compute the gap in the right shrink region
        let rightStart = targetX + nodeLength + hSpaceAroundGap * gapRatio;
        let rightGap = (width - rightStart - 10 * nodeLength) / 10;

        // Move the right layers
        for (let i = curLayerIndex + 1; i < numLayers; i++) {
          let curX = rightStart + (i - (curLayerIndex + 1)) * (nodeLength + rightGap);
          moveLayerX({layerIndex: i, targetX: curX, disable: true, delay: 0});
        }

        // Add an overlay
        let stops = [{offset: '0%', color: 'rgb(250, 250, 250)', opacity: 0.85},
          {offset: '50%', color: 'rgb(250, 250, 250)', opacity: 0.95},
          {offset: '100%', color: 'rgb(250, 250, 250)', opacity: 1}];
        addOverlayGradient('overlay-gradient', stops);

        let intermediateLayerOverlay = svg.append('g')
          .attr('class', 'intermediate-layer-overlay');

        let overlayRect = intermediateLayerOverlay.append('rect')
          .attr('class', 'overlay')
          .style('fill', 'url(#overlay-gradient)')
          .style('stroke', 'none')
          .attr('width', width - rightStart)
          .attr('height', height + svgPaddings.top + svgPaddings.bottom)
          .attr('x', rightStart)
          .attr('y', 0)
          .style('opacity', 0);
        
        overlayRect.transition('move')
          .duration(800)
          .ease(d3.easeCubicInOut)
          .style('opacity', 1);
        
        // Draw the intermediate layer
        let leftX = nodeCoordinate[curLayerIndex - 1][0].x;
        let intermediateLayer = drawIntermediateLayer(curLayerIndex, leftX,
          targetX, rightStart, intermediateGap, d, i);
        
        // Add annotation to the intermediate layer
        let intermediateLayerAnnotation = svg.append('g')
          .attr('class', 'intermediate-layer-annotation')
          .style('opacity', 0);

        drawIntermediateLayerAnnotation({
          leftX: leftX,
          curLayerIndex: curLayerIndex,
          group: intermediateLayerAnnotation,
          intermediateGap: intermediateGap,
          isFirstConv: true,
          i: i
        });

        let range = cnnLayerRanges.local[curLayerIndex];

        drawIntermediateLayerLegend({
          legendHeight: 5,
          curLayerIndex: curLayerIndex,
          range: 1,
          group: intermediateLayer,
          intermediateGap: intermediateGap,
          isInput: true,
          x: leftX,
          y: nodeCoordinate[curLayerIndex][9].y,
          gradient: 'url(#inputGradient)'
        });

        drawIntermediateLayerLegend({
          legendHeight: 5,
          curLayerIndex: curLayerIndex,
          range: range,
          group: intermediateLayer,
          intermediateGap: intermediateGap,
          x: nodeCoordinate[curLayerIndex - 1][2].x,
          y: nodeCoordinate[curLayerIndex][9].y + 25,
          gradient: 'url(#convGradient)'
        });
        
        // Show everything
        svg.selectAll('g.intermediate-layer, g.intermediate-layer-annotation')
          .transition()
          .delay(500)
          .duration(500)
          .ease(d3.easeCubicInOut)
          .style('opacity', 1);
      }

      else if (d.layerName === 'conv_1_2') {
        let curLayerIndex = layerIndexDict[d.layerName];
        let targetX = nodeCoordinate[curLayerIndex - 1][0].x + 2 * nodeLength +
          2 * hSpaceAroundGap * gapRatio + plusSymbolRadius * 2;
        let intermediateGap = (hSpaceAroundGap * gapRatio * 2) / 3;

        // Make sure two layers have the same range
        let range = redrawLayerIfNeeded(curLayerIndex);

        // Move the selected layer
        moveLayerX({layerIndex: curLayerIndex, targetX: targetX, disable: true,
          delay: 0, opacity: 0.15, specialIndex: i});

        // Hide the edges
        svg.select('g.edge-group').classed('hidden', true);

        // Compute the gap in the right shrink region
        let rightStart = targetX + nodeLength + hSpaceAroundGap * gapRatio;
        let rightGap = (width - rightStart - 8 * nodeLength) / 8;

        // Move the right layers
        for (let i = curLayerIndex + 1; i < numLayers; i++) {
          let curX = rightStart + (i - (curLayerIndex + 1)) * (nodeLength + rightGap);
          moveLayerX({layerIndex: i, targetX: curX, disable: true, delay: 0});
        }

        // Add an overlay
        let stops = [{offset: '0%', color: 'rgb(250, 250, 250)', opacity: 0.85},
          {offset: '50%', color: 'rgb(250, 250, 250)', opacity: 0.95},
          {offset: '100%', color: 'rgb(250, 250, 250)', opacity: 1}];
        addOverlayGradient('overlay-gradient-right', stops);

        let leftRightRatio = (2 * nodeLength + hSpaceAroundGap * gapRatio) /
          (8 * nodeLength + intermediateGap * 7);
        let endingGradient = 0.85 + (0.95 - 0.85) * leftRightRatio;
        stops = [{offset: '0%', color: 'rgb(250, 250, 250)', opacity: endingGradient},
          {offset: '100%', color: 'rgb(250, 250, 250)', opacity: 0.85}];
        addOverlayGradient('overlay-gradient-left', stops);

        let intermediateLayerOverlay = svg.append('g')
          .attr('class', 'intermediate-layer-overlay');

        intermediateLayerOverlay.append('rect')
          .attr('class', 'overlay')
          .style('fill', 'url(#overlay-gradient-right)')
          .style('stroke', 'none')
          .attr('width', width - rightStart)
          .attr('height', height + svgPaddings.top + svgPaddings.bottom)
          .attr('x', rightStart)
          .attr('y', 0)
          .style('opacity', 0);
        
        intermediateLayerOverlay.append('rect')
          .attr('class', 'overlay')
          .style('fill', 'url(#overlay-gradient-left)')
          .style('stroke', 'none')
          .attr('width', nodeLength * 2 + hSpaceAroundGap * gapRatio)
          .attr('height', height + svgPaddings.top + svgPaddings.bottom)
          .attr('x', nodeCoordinate[0][0].x)
          .attr('y', 0)
          .style('opacity', 0);
        
        intermediateLayerOverlay.selectAll('rect.overlay')
          .transition('move')
          .duration(800)
          .ease(d3.easeCubicInOut)
          .style('opacity', 1);
        
        // Draw the intermediate layer
        let leftX = nodeCoordinate[curLayerIndex - 1][0].x;
        let intermediateLayer = drawIntermediateLayer(curLayerIndex, leftX,
          targetX, rightStart, intermediateGap, d, i);
        
        // Add annotation to the intermediate layer
        let intermediateLayerAnnotation = svg.append('g')
          .attr('class', 'intermediate-layer-annotation')
          .style('opacity', 0);

        drawIntermediateLayerAnnotation({
          leftX: leftX,
          curLayerIndex: curLayerIndex,
          group: intermediateLayerAnnotation,
          intermediateGap: intermediateGap,
          i: i
        });

        drawIntermediateLayerLegend({
          legendHeight: 5,
          curLayerIndex: curLayerIndex,
          range: range,
          group: intermediateLayer,
          intermediateGap: intermediateGap,
          x: leftX,
          y: nodeCoordinate[curLayerIndex - 1][9].y + nodeLength + 10,
          gradient: 'url(#convGradient)'
        });

        // Show everything
        svg.selectAll('g.intermediate-layer, g.intermediate-layer-annotation')
          .transition()
          .delay(500)
          .duration(500)
          .ease(d3.easeCubicInOut)
          .style('opacity', 1);
      }

      else if (d.layerName === 'conv_2_1') {
        let curLayerIndex = layerIndexDict[d.layerName];
        let leftX = nodeCoordinate[curLayerIndex][0].x - (2 * nodeLength +
          2 * hSpaceAroundGap * gapRatio + plusSymbolRadius * 2);
        let intermediateGap = (hSpaceAroundGap * gapRatio * 2) / 3;

        // Make sure two layers have the same range
        let range = redrawLayerIfNeeded(curLayerIndex);

        // Move the previous layer
        moveLayerX({layerIndex: curLayerIndex - 1, targetX: leftX,
          disable: true, delay: 0});

        moveLayerX({layerIndex: curLayerIndex,
          targetX: nodeCoordinate[curLayerIndex][0].x, disable: true,
          delay: 0, opacity: 0.15, specialIndex: i});

        // Hide the edges
        svg.select('g.edge-group').classed('hidden', true);

        // Compute the gap in the left shrink region
        let leftEnd = leftX - hSpaceAroundGap;
        let leftGap = (leftEnd - nodeCoordinate[0][0].x - 5 * nodeLength) / 5;
        let rightStart = nodeCoordinate[curLayerIndex][0].x +
          nodeLength + hSpaceAroundGap;

        // Move the left layers
        for (let i = 0; i < curLayerIndex - 1; i++) {
          let curX = nodeCoordinate[0][0].x + i * (nodeLength + leftGap);
          moveLayerX({layerIndex: i, targetX: curX, disable: true, delay: 0});
        }

        // Add an overlay
        let stops = [{offset: '0%', color: 'rgb(250, 250, 250)', opacity: 1},
          {offset: '50%', color: 'rgb(250, 250, 250)', opacity: 0.9},
          {offset: '100%', color: 'rgb(250, 250, 250)', opacity: 0.85}];
        addOverlayGradient('overlay-gradient-left', stops);

        stops = [{offset: '0%', color: 'rgb(250, 250, 250)', opacity: 0.85},
          {offset: '50%', color: 'rgb(250, 250, 250)', opacity: 0.95},
          {offset: '100%', color: 'rgb(250, 250, 250)', opacity: 1}];
        addOverlayGradient('overlay-gradient-right', stops);

        let intermediateLayerOverlay = svg.append('g')
          .attr('class', 'intermediate-layer-overlay');

        intermediateLayerOverlay.append('rect')
          .attr('class', 'overlay')
          .style('fill', 'url(#overlay-gradient-left)')
          .style('stroke', 'none')
          .attr('width', leftEnd - nodeCoordinate[0][0].x)
          .attr('height', height + svgPaddings.top + svgPaddings.bottom)
          .attr('x', nodeCoordinate[0][0].x)
          .attr('y', 0)
          .style('opacity', 0);
        
        intermediateLayerOverlay.append('rect')
          .attr('class', 'overlay')
          .style('fill', 'url(#overlay-gradient-right)')
          .style('stroke', 'none')
          .attr('width', width - rightStart)
          .attr('height', height + svgPaddings.top + svgPaddings.bottom)
          .attr('x', rightStart)
          .attr('y', 0)
          .style('opacity', 0);
        
        intermediateLayerOverlay.selectAll('rect.overlay')
          .transition('move')
          .duration(800)
          .ease(d3.easeCubicInOut)
          .style('opacity', 1);
        
        // Draw the intermediate layer
        let intermediateLayer = drawIntermediateLayer(curLayerIndex, leftX,
          nodeCoordinate[curLayerIndex][0].x, rightStart, intermediateGap, d, i);

        // Add annotation to the intermediate layer
        let intermediateLayerAnnotation = svg.append('g')
          .attr('class', 'intermediate-layer-annotation')
          .style('opacity', 0);

        drawIntermediateLayerAnnotation({
          leftX: leftX,
          curLayerIndex: curLayerIndex,
          group: intermediateLayerAnnotation,
          intermediateGap: intermediateGap,
          i: i
        });

        drawIntermediateLayerLegend({
          legendHeight: 5,
          curLayerIndex: curLayerIndex,
          range: range,
          group: intermediateLayer,
          intermediateGap: intermediateGap,
          x: leftX,
          y: nodeCoordinate[curLayerIndex - 1][9].y + nodeLength + 10,
          gradient: 'url(#convGradient)'
        });

        // Show everything
        svg.selectAll('g.intermediate-layer, g.intermediate-layer-annotation')
          .transition()
          .delay(500)
          .duration(500)
          .ease(d3.easeCubicInOut)
          .style('opacity', 1);
      }
      
      else if (d.layerName === 'conv_2_2') {
        let curLayerIndex = layerIndexDict[d.layerName];
        let leftX = nodeCoordinate[curLayerIndex][0].x - (2 * nodeLength +
          2 * hSpaceAroundGap * gapRatio + plusSymbolRadius * 2);
        let intermediateGap = (hSpaceAroundGap * gapRatio * 2) / 3;

        // Make sure two layers have the same range
        let range = redrawLayerIfNeeded(curLayerIndex);

        // Move the previous layer
        moveLayerX({layerIndex: curLayerIndex - 1, targetX: leftX,
          disable: true, delay: 0});

        moveLayerX({layerIndex: curLayerIndex,
          targetX: nodeCoordinate[curLayerIndex][0].x, disable: true,
          delay: 0, opacity: 0.15, specialIndex: i});

        // Hide the edges
        svg.select('g.edge-group').classed('hidden', true);

        // Compute the gap in the left shrink region
        let leftEnd = leftX - hSpaceAroundGap;
        let leftGap = (leftEnd - nodeCoordinate[0][0].x - 7 * nodeLength) / 7;
        let rightStart = nodeCoordinate[curLayerIndex][0].x +
          nodeLength + hSpaceAroundGap;

        // Move the left layers
        for (let i = 0; i < curLayerIndex - 1; i++) {
          let curX = nodeCoordinate[0][0].x + i * (nodeLength + leftGap);
          moveLayerX({layerIndex: i, targetX: curX, disable: true, delay: 0});
        }

        // Add an overlay
        let stops = [{offset: '0%', color: 'rgb(250, 250, 250)', opacity: 1},
          {offset: '50%', color: 'rgb(250, 250, 250)', opacity: 0.95},
          {offset: '100%', color: 'rgb(250, 250, 250)', opacity: 0.85}];
        addOverlayGradient('overlay-gradient-left', stops);

        stops = [{offset: '0%', color: 'rgb(250, 250, 250)', opacity: 0.85},
          {offset: '50%', color: 'rgb(250, 250, 250)', opacity: 0.95},
          {offset: '100%', color: 'rgb(250, 250, 250)', opacity: 1}];
        addOverlayGradient('overlay-gradient-right', stops);

        let intermediateLayerOverlay = svg.append('g')
          .attr('class', 'intermediate-layer-overlay');

        intermediateLayerOverlay.append('rect')
          .attr('class', 'overlay')
          .style('fill', 'url(#overlay-gradient-left)')
          .style('stroke', 'none')
          .attr('width', leftEnd - nodeCoordinate[0][0].x)
          .attr('height', height + svgPaddings.top + svgPaddings.bottom)
          .attr('x', nodeCoordinate[0][0].x)
          .attr('y', 0)
          .style('opacity', 0);
        
        intermediateLayerOverlay.append('rect')
          .attr('class', 'overlay')
          .style('fill', 'url(#overlay-gradient-right)')
          .style('stroke', 'none')
          .attr('width', width - rightStart)
          .attr('height', height + svgPaddings.top + svgPaddings.bottom)
          .attr('x', rightStart)
          .attr('y', 0)
          .style('opacity', 0);
        
        intermediateLayerOverlay.selectAll('rect.overlay')
          .transition('move')
          .duration(800)
          .ease(d3.easeCubicInOut)
          .style('opacity', 1);
        
        // Draw the intermediate layer
        let intermediateLayer = drawIntermediateLayer(curLayerIndex, leftX,
          nodeCoordinate[curLayerIndex][0].x, rightStart, intermediateGap, d, i);

        // Add annotation to the intermediate layer
        let intermediateLayerAnnotation = svg.append('g')
          .attr('class', 'intermediate-layer-annotation')
          .style('opacity', 0);

        drawIntermediateLayerAnnotation({
          leftX: leftX,
          curLayerIndex: curLayerIndex,
          group: intermediateLayerAnnotation,
          intermediateGap: intermediateGap,
          i: i
        });

        drawIntermediateLayerLegend({
          legendHeight: 5,
          curLayerIndex: curLayerIndex,
          range: range,
          group: intermediateLayer,
          intermediateGap: intermediateGap,
          x: leftX,
          y: nodeCoordinate[curLayerIndex - 1][9].y + nodeLength + 10,
          gradient: 'url(#convGradient)'
        });

        // Show everything
        svg.selectAll('g.intermediate-layer, g.intermediate-layer-annotation')
          .transition()
          .delay(500)
          .duration(500)
          .ease(d3.easeCubicInOut)
          .style('opacity', 1);
      }
    }

    // Quit the layerview
    else if (d.type === 'conv' && isInIntermediateView) {
      isInIntermediateView = false;

      // Also unclick the node
      // Record the current clicked node
      selectedNode.layerName = '';
      selectedNode.index = -1;
      selectedNode.data = null;

      // Remove the intermediate layer
      let intermediateLayer = svg.select('g.intermediate-layer');
      intermediateLayer.transition('remove')
        .duration(500)
        .ease(d3.easeCubicInOut)
        .style('opacity', 0)
        .on('end', (d, i, g) => { d3.select(g[i]).remove()});
      
      // Remove the overlay rect
      svg.selectAll('g.intermediate-layer-overlay, g.intermediate-layer-annotation')
        .transition('remove')
        .duration(500)
        .ease(d3.easeCubicInOut)
        .style('opacity', 0)
        .on('end', (d, i, g) => {
          svg.selectAll('g.intermediate-layer-overlay, g.intermediate-layer-annotation').remove();
          svg.selectAll('defs.overlay-gradient').remove();
        });
      
      // Recover the layer if we have drdrawn it
      if (needRedraw[0] !== undefined) {
        if (needRedraw[1] !== undefined) {
          svg.select(`g#layer-${needRedraw[0]}-node-${needRedraw[1]}`)
            .select('canvas.node-canvas')
            .each(drawOutput);
        } else {
          svg.select(`g#cnn-layer-group-${needRedraw[0]}`)
            .selectAll('canvas.node-canvas')
            .each(drawOutput);
        }
      }
      
      // Move all layers to their original place
      for (let i = 0; i < numLayers; i++) {
        moveLayerX({layerIndex: i, targetX: nodeCoordinate[i][0].x,
          disable:false, delay:500, opacity: 1});
      }

      moveLayerX({layerIndex: numLayers - 2,
        targetX: nodeCoordinate[numLayers - 2][0].x, opacity: 1,
        disable:false, delay:500, onEndFunc: () => {
          // Show all edges on the last moving animation end
          svg.select('g.edge-group').classed('hidden', false);
        }});
      
    }
  }

  const nodeMouseOverHandler = (d, i, g) => {
    if (isInIntermediateView) { return; }

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

  const nodeMouseLeaveHandler = (d, i, g) => {
    if (isInIntermediateView) { return; }

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
    
    // Keep the highlight if user has clicked
    if (d.layerName !== selectedNode.layerName || d.index !== selectedNode.index){
      d3.select(g[i]).select('rect.bounding').classed('hidden', true);

      d.inputLinks.forEach(link => {
        let layerIndex = layerIndexDict[link.source.layerName];
        let nodeIndex = link.source.index;
        svg.select(`g#layer-${layerIndex}-node-${nodeIndex}`)
          .select('rect.bounding')
          .classed('hidden', true);
      })
    }

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

  const drawCNN = (width, height, cnnGroup) => {
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
        .on('mouseover', nodeMouseOverHandler)
        .on('mouseleave', nodeMouseLeaveHandler)
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
      .attr('id', (d, i) => `layer-label-${i}`)
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
    
    let linkData = getLinkData(nodeCoordinate);

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

  const updateCNN = () => {
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

  const updateCNNLayerRanges = () => {
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
    wholeSvg = d3.select(overviewComponent)
      .select('#cnn-svg');
    svg = wholeSvg.append('g')
      .attr('class', 'main-svg')
      .attr('transform', `translate(${svgPaddings.left}, 0)`);

    width = Number(wholeSvg.style('width').replace('px', '')) -
      svgPaddings.left - svgPaddings.right;
    height = Number(wholeSvg.style('height').replace('px', '')) -
      svgPaddings.top - svgPaddings.bottom;

    let cnnGroup = svg.append('g')
      .attr('class', 'cnn-group');
    
    // Define global arrow marker end
    svg.append("defs")
      .append("marker")
      .attr("id", 'marker')
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 6)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr('fill', 'gray')
      .attr("d", "M0,-5L10,0L0,5");
    
    console.time('Construct cnn');
    model = await loadTrainedModel('/assets/data/model.json');
    cnn = await constructCNN(`/assets/img/${selectedImage}`, model);
    console.timeEnd('Construct cnn');
    cnnStore.set(cnn);

    // Ignore the flatten layer for now
    let flatten = cnn[cnn.length - 2];
    cnn.splice(cnn.length - 2, 1);
    console.log(cnn);

    updateCNNLayerRanges();

    // Create and draw the CNN view
    drawCNN(width, height, cnnGroup);
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
      cnn = await constructCNN(`/assets/img/${selectedImage}`, model);

      // Ignore the flatten layer for now
      let flatten = cnn[cnn.length - 2];
      cnn.splice(cnn.length - 2, 1);
      cnnStore.set(cnn);

      // Update all scales used in the CNN view
      updateCNNLayerRanges();
      updateCNN();
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
    width: 100vw;
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

  :global(.very-strong) {
    stroke-width: 3px;
  }

  :global(.bounding, .edge-group, foreignObject) {
    transition: opacity 300ms ease-in-out;
  }

  :global(.annotation-text) {
    font-size: 10px;
    font-style: italic;
    fill: gray;
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

<ConvolutionView input={nodeData == undefined ? [[1,2,3,4], [4,5,6,7], [7,8,9,10], [7,8,9,10]] : nodeData[selectedNodeIndex].input} 
                  kernel={nodeData == undefined ? [[1,2], [3,4]] : nodeData[selectedNodeIndex].kernel} 
                  output={nodeData == undefined ? [[1,2,3], [4,5,6], [7,8,9]] : nodeData[selectedNodeIndex].output} />