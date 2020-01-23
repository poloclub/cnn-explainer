/* global d3 */

import {
  svgStore, vSpaceAroundGapStore, hSpaceAroundGapStore, cnnStore,
  nodeCoordinateStore, selectedScaleLevelStore, cnnLayerRangesStore,
  needRedrawStore, cnnLayerMinMaxStore
} from '../stores.js';
import {
  getExtent, getOutputKnot, getInputKnot, gappedColorScale
} from './draw-utils.js';
import {
  drawOutput
} from './overview-draw.js';
import { singleConv } from '../utils/cnn.js';
import { overviewConfig } from '../config.js';

// Configs
const layerColorScales = overviewConfig.layerColorScales;
const nodeLength = overviewConfig.nodeLength;
const plusSymbolRadius = overviewConfig.plusSymbolRadius;
const numLayers = overviewConfig.numLayers;
const intermediateColor = overviewConfig.intermediateColor;
const kernelRectLength = overviewConfig.kernelRectLength;
const svgPaddings = overviewConfig.svgPaddings;
const gapRatio = overviewConfig.gapRatio;
const overlayRectOffset = overviewConfig.overlayRectOffset;
const isSafari = window.safari !== undefined;

// Shared variables
let svg = undefined;
svgStore.subscribe( value => {svg = value;} )

let vSpaceAroundGap = undefined;
vSpaceAroundGapStore.subscribe( value => {vSpaceAroundGap = value;} )

let hSpaceAroundGap = undefined;
hSpaceAroundGapStore.subscribe( value => {hSpaceAroundGap = value;} )

let cnn = undefined;
cnnStore.subscribe( value => {cnn = value;} )

let nodeCoordinate = undefined;
nodeCoordinateStore.subscribe( value => {nodeCoordinate = value;} )

let selectedScaleLevel = undefined;
selectedScaleLevelStore.subscribe( value => {selectedScaleLevel = value;} )

let cnnLayerRanges = undefined;
cnnLayerRangesStore.subscribe( value => {cnnLayerRanges = value;} )

let cnnLayerMinMax = undefined;
cnnLayerMinMaxStore.subscribe( value => {cnnLayerMinMax = value;} )

let needRedraw = [undefined, undefined];
needRedrawStore.subscribe( value => {needRedraw = value;} )

/**
 * Move one layer horizontally
 * @param {object} arg Multiple arguments {
 *   layerIndex: current layer index
 *   targetX: destination x
 *   disable: make this layer unresponsible
 *   delay: animation delay
 *   opacity: change the current layer's opacity
 *   specialIndex: avoid manipulating `specialIndex`th node
 *   onEndFunc: call this function when animation finishes
 *   transitionName: animation ID
 * }
 */
export const moveLayerX = (arg) => {
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
      .select('image')
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
        .select('image')
        .style('opacity', opacity);
    }
  });
  
  // Also move the layer labels
  svg.selectAll(`g#layer-label-${layerIndex}`)
    .transition(transitionName)
    .ease(d3.easeCubicInOut)
    .delay(delay)
    .duration(500)
    .attr('transform', () => {
      let x = targetX + nodeLength / 2;
      let y = (svgPaddings.top + vSpaceAroundGap) / 2;
      return `translate(${x}, ${y})`;
    })
    .on('end', onEndFunc);

  svg.selectAll(`g#layer-detailed-label-${layerIndex}`)
    .transition(transitionName)
    .ease(d3.easeCubicInOut)
    .delay(delay)
    .duration(500)
    .attr('transform', () => {
      let x = targetX + nodeLength / 2;
      let y = (svgPaddings.top + vSpaceAroundGap) / 2 - 6;
      return `translate(${x}, ${y})`;
    })
    .on('end', onEndFunc);
}

/**
 * Append a gradient definition to `group`
 * @param {string} gradientID CSS ID for the gradient def
 * @param {[{offset: number, color: string, opacity: number}]} stops Gradient stops
 * @param {element} group Element to append def to
 */
export const addOverlayGradient = (gradientID, stops, group) => {
  if (group === undefined) {
    group = svg;
  }

  // Create a gradient
  let defs = group.append("defs")
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

/**
 * Draw the intermediate layer activation heatmaps
 * @param {element} image Neuron heatmap image
 * @param {number} range Colormap range
 * @param {function} colorScale Colormap
 * @param {number} length Image length
 * @param {[[number]]} dataMatrix Heatmap matrix
 */
const drawIntermidiateImage = (image, range, colorScale, length,
  dataMatrix) => {
  // Set up a buffer convas in order to resize image
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
    let color = d3.rgb(colorScale((dataMatrix[row][column] + range / 2) / range));

    imageSingleArray[i] = color.r;
    imageSingleArray[i + 1] = color.g;
    imageSingleArray[i + 2] = color.b;
    imageSingleArray[i + 3] = 255;
  }

  // canvas.toDataURL() only exports image in 96 DPI, so we can hack it to have
  // higher DPI by rescaling the image using canvas magic
  let largeCanvas = document.createElement('canvas');
  largeCanvas.width = nodeLength * 3;
  largeCanvas.height = nodeLength * 3;
  let largeCanvasContext = largeCanvas.getContext('2d');

  // Use drawImage to resize the original pixel array, and put the new image
  // (canvas) into corresponding canvas
  bufferContext.putImageData(imageSingle, 0, 0);
  largeCanvasContext.drawImage(bufferCanvas, 0, 0, imageLength, imageLength,
    0, 0, nodeLength * 3, nodeLength * 3);
  
  let imageDataURL = largeCanvas.toDataURL();
  image.attr('xlink:href', imageDataURL);

  // Destory the buffer canvas
  bufferCanvas.remove();
  largeCanvas.remove();
}

/**
 * Create a node group for the intermediate layer
 * @param {number} curLayerIndex Intermediate layer index
 * @param {number} selectedI Clicked node index
 * @param {element} groupLayer Group element
 * @param {number} x Node's x
 * @param {number} y Node's y
 * @param {number} nodeIndex Node's index
 * @param {function} intermediateNodeMouseOverHandler Mouse over handler
 * @param {function} intermediateNodeMouseLeaveHandler Mouse leave handler
 * @param {function} intermediateNodeClicked Mouse click handler
 * @param {bool} interaction Whether support interaction
 */
const createIntermediateNode = (curLayerIndex, selectedI, groupLayer, x, y,
  nodeIndex, intermediateNodeMouseOverHandler, intermediateNodeMouseLeaveHandler,
  intermediateNodeClicked, interaction) => {
  let newNode = groupLayer.append('g')
    .datum(cnn[curLayerIndex - 1][nodeIndex])
    .attr('class', 'intermediate-node')
    .attr('cursor', interaction ? 'pointer': 'default')
    .attr('pointer-events', interaction ? 'all': 'none')
    .attr('node-index', nodeIndex)
    .on('mouseover', intermediateNodeMouseOverHandler)
    .on('mouseleave', intermediateNodeMouseLeaveHandler)
    .on('click', (d, g, i) => intermediateNodeClicked(d, g, i, selectedI, curLayerIndex));
  
  newNode.append('image')
    .attr('width', nodeLength)
    .attr('height', nodeLength)
    .attr('x', x)
    .attr('y', y);
    /*
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
    */

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

/**
 * Draw one intermediate layer
 * @param {number} curLayerIndex 
 * @param {number} leftX X value of intermediate layer left border
 * @param {number} rightX X value of intermediate layer right border
 * @param {number} rightStart X value of right component starting anchor
 * @param {number} intermediateGap The inner gap
 * @param {number} d Clicked node bounded data
 * @param {number} i Clicked node index
 * @param {function} intermediateNodeMouseOverHandler Mouse over handler
 * @param {function} intermediateNodeMouseLeaveHandler Mouse leave handler
 * @param {function} intermediateNodeClicked Mouse click handler
 */
const drawIntermediateLayer = (curLayerIndex, leftX, rightX, rightStart,
  intermediateGap, d, i, intermediateNodeMouseOverHandler,
  intermediateNodeMouseLeaveHandler, intermediateNodeClicked) => {
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
  let intermediateMinMax = [];
  
  // Copy the previsious layer to construct foreignObject placeholder
  // Also add edges from/to the intermediate layer in this loop
  let linkData = [];

  // Accumulate the intermediate sum
  // let itnermediateSumMatrix = init2DArray(d.output.length,
  //  d.output.length, 0);

  // Compute the min max of all kernel weights in the intermediate layer
  let kernelExtents = d.inputLinks.map(link => getExtent(link.weight));
  let kernelExtent = kernelExtents.reduce((acc, cur) => {
    return [Math.min(acc[0], cur[0]), Math.max(acc[1], cur[1])];
  })
  let kernelRange = 2 * (Math.round(
    Math.max(...kernelExtent.map(Math.abs)) * 1000) / 1000);
  let kernelColorGap = 0.2;

  // First intermediate layer
  nodeCoordinate[curLayerIndex - 1].forEach((n, ni) => {

    // Compute the intermediate value
    let inputMatrix = cnn[curLayerIndex - 1][ni].output;
    let kernelMatrix = cnn[curLayerIndex][i].inputLinks[ni].weight;
    let interMatrix = singleConv(inputMatrix, kernelMatrix);

    // Compute the intermediate layer min max
    intermediateMinMax.push(getExtent(interMatrix));

    // Update the intermediate sum
    // itnermediateSumMatrix = matrixAdd(itnermediateSumMatrix, interMatrix);

    // Layout the canvas and rect
    let newNode = createIntermediateNode(curLayerIndex, i, intermediateLayer,
      intermediateX1, n.y, ni, intermediateNodeMouseOverHandler,
      intermediateNodeMouseLeaveHandler, intermediateNodeClicked, true);
    
    // Draw the image
    let image = newNode.select('image');
    drawIntermidiateImage(image, range, colorScale, d.output.length,
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
          .attr('fill', gappedColorScale(layerColorScales.weight, kernelRange,
            kernelMatrix[r][c], kernelColorGap));
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

  // Aggregate the intermediate min max
  let aggregatedExtent = intermediateMinMax.reduce((acc, cur) => {
    return [Math.min(acc[0], cur[0]), Math.max(acc[1], cur[1])];
  })
  let aggregatedMinMax = {min: aggregatedExtent[0], max: aggregatedExtent[1]};

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
      .attr('x', -kernelRectLength)
      .attr('y', nodeLength / 2)
      .attr('width', 2 * kernelRectLength)
      .attr('height', 2 * kernelRectLength)
      .style('stroke', intermediateColor)
      .style('fill', gappedColorScale(layerColorScales.weight, kernelRange,
        d.bias, kernelColorGap));
    
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
      .attr('x', -kernelRectLength)
      .attr('y', -nodeLength / 2 - 2 * kernelRectLength)
      .attr('width', 2 * kernelRectLength)
      .attr('height', 2 * kernelRectLength)
      .style('stroke', intermediateColor)
      .style('fill', gappedColorScale(layerColorScales.weight, kernelRange,
        d.bias, kernelColorGap));
    
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
    .attr('class', 'layer-intermediate-label')
    .attr('transform', () => {
      let x = leftX + nodeLength + (nodeLength + 2 * plusSymbolRadius + 2 *
        hSpaceAroundGap * gapRatio) / 2;
      let y = (svgPaddings.top + vSpaceAroundGap) / 2;
      return `translate(${x}, ${y})`;
    })
    .append('text')
    .style('dominant-baseline', 'middle')
    .style('opacity', '0.8')
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
      .duration(60000)
      .ease(d3.easeLinear)
      .attr('stroke-dashoffset', dashoffset)
      .on('end', (d, i, g) => animateEdge(d, i, g, dashoffset - 1000));
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
    .each((d, i, g) => animateEdge(d, i, g, dashoffset - 1000));
  
  return {intermediateLayer: intermediateLayer,
    intermediateMinMax: aggregatedMinMax,
    kernelRange: kernelRange,
    kernelMinMax: {min: kernelExtent[0], max: kernelExtent[1]}};
}

/**
 * Add an annotation for the kernel and the sliding
 * @param {object} arg 
 * {
 *  leftX: X value of the left border of intermedaite layer
 *  group: element group
 *  intermediateGap: the inner gap of intermediate layer
 *  isFirstConv: if this intermediate layer is after the first layer
 *  i: index of the selected node
 * }
 */
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

  if (isSafari) { sliderY += 2 * kernelRectLength; }

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
  let textY = nodeCoordinate[curLayerIndex][i].y + nodeLength +
      kernelRectLength * 3;
  
  // Safari special position
  if (isSafari) { textY += 2 * kernelRectLength; }

  // Special case 1: first node
  if (i === 0) { textX += 30; }

  // Special case 2: last node
  if (i === 9) {
    textX = intermediateX2 + plusSymbolRadius - 10;
    textY -= 2.5 * nodeLength;
  }

  let plusText = plusAnnotation.append('text')
    .attr('x', textX)
    .attr('y', textY)
    .attr('class', 'annotation-text')
    .style('dominant-baseline', 'hanging')
    .style('text-anchor', 'start');
  
  plusText.append('tspan')
    .text('Add up all intermediate');
  
  plusText.append('tspan')
    .attr('x', textX)
    .attr('dy', '1em')
    .text('results and then add bias');
  
  if (i === 9) {
    drawArrow({
      group: group,
      sx: intermediateX2 + 50,
      sy: nodeCoordinate[curLayerIndex][i].y - (nodeLength / 2 + kernelRectLength * 2),
      tx: intermediateX2 + 2 * plusSymbolRadius + 3,
      ty: nodeCoordinate[curLayerIndex][i].y + nodeLength / 2 - plusSymbolRadius,
      dr: 50,
      hFlip: false
    });
  } else {
    drawArrow({
      group: group,
      sx: intermediateX2 + 35,
      sy: nodeCoordinate[curLayerIndex][i].y + nodeLength + kernelRectLength * 2,
      tx: intermediateX2 + 2 * plusSymbolRadius + 3,
      ty: nodeCoordinate[curLayerIndex][i].y + nodeLength / 2 + plusSymbolRadius,
      dr: 30,
      hFlip: true
    });
  }

  // Add annotation for the bias
  let biasTextY = nodeCoordinate[curLayerIndex][i].y;
  if (i === 0) {
    biasTextY += nodeLength + 2 * kernelRectLength;
  } else {
    biasTextY -= 2 * kernelRectLength + 5;
  }
  plusAnnotation.append('text')
    .attr('class', 'annotation-text')
    .attr('x', intermediateX2 + plusSymbolRadius)
    .attr('y', biasTextY)
    .style('text-anchor', 'middle')
    .style('dominant-baseline', i === 0 ? 'hanging' : 'baseline')
    .text('Bias');
}

/**
 * Draw an very neat arrow!
 * @param {object} arg 
 * {
 *   group: element to append this arrow to
 *   sx: source x
 *   sy: source y
 *   tx: target x
 *   ty: target y
 *   dr: radius of curve (I'm using a circle)
 *   hFlip: the direction to choose the circle (there are always two ways)
 * }
 */
const drawArrow = (arg) => {
    let group = arg.group,
      sx = arg.sx,
      sy = arg.sy,
      tx = arg.tx,
      ty = arg.ty,
      dr = arg.dr,
      hFlip = arg.hFlip;

    /* Cool graphics trick -> merge translate and scale together
    translateX = (1 - scaleX) * tx,
    translateY = (1 - scaleY) * ty;
    */
    
    let arrow = group.append('g')
      .attr('class', 'arrow-group');

    arrow.append('path')
      .attr("d", `M${sx},${sy}A${dr},${dr} 0 0,${hFlip ? 0 : 1} ${tx},${ty}`)
      .attr('marker-end', 'url(#marker)')
      .style('stroke', 'gray')
      .style('fill', 'none');
}

/**
 * Draw the legend for intermediate layer
 * @param {object} arg 
 * {
 *   legendHeight: height of the legend rectangle
 *   curLayerIndex: the index of selected layer
 *   range: colormap range
 *   group: group to append the legend
 *   minMax: {min: min value, max: max value}
 *   width: width of the legend
 *   x: x position of the legend
 *   y: y position of the legend
 *   isInput: if the legend is for the input layer (special handle black to
 *      white color scale)
 *   colorScale: d3 color scale
 *   gradientAppendingName: name of the appending gradient
 *   gradientGap: gap to make the color lighter
 * }
 */
const drawIntermediateLayerLegend = (arg) => {
  let legendHeight = arg.legendHeight,
    curLayerIndex = arg.curLayerIndex,
    range = arg.range,
    group = arg.group,
    minMax = arg.minMax,
    width = arg.width,
    x = arg.x,
    y = arg.y,
    isInput = arg.isInput,
    colorScale = arg.colorScale,
    gradientAppendingName = arg.gradientAppendingName,
    gradientGap = arg.gradientGap;
  
  if (colorScale === undefined) { colorScale = layerColorScales.conv; }
  if (gradientGap === undefined) { gradientGap = 0; }
  
  // Add a legend color gradient
  let gradientName = 'url(#inputGradient)';
  let normalizedColor = v => colorScale(v * (1 - 2 * gradientGap) + gradientGap);

  if (!isInput) {
    let leftValue = (minMax.min + range / 2) / range,
      zeroValue = (0 + range / 2) / range,
      rightValue = (minMax.max + range / 2) / range,
      totalRange = minMax.max - minMax.min,
      zeroLocation = (0 - minMax.min) / totalRange,
      leftMidValue = leftValue + (zeroValue - leftValue)/2,
      rightMidValue = zeroValue + (rightValue - zeroValue)/2;

    let stops = [
      {offset: 0, color: normalizedColor(leftValue), opacity: 1},
      {offset: zeroLocation / 2,
        color: normalizedColor(leftMidValue),
        opacity: 1},
      {offset: zeroLocation,
        color: normalizedColor(zeroValue),
        opacity: 1},
      {offset: zeroLocation + (1 - zeroValue) / 2,
        color: normalizedColor(rightMidValue),
        opacity: 1},
      {offset: 1, color: normalizedColor(rightValue), opacity: 1}
    ];

    if (gradientAppendingName === undefined) {
      addOverlayGradient('intermediate-legend-gradient', stops, group);
      gradientName = 'url(#intermediate-legend-gradient)';
    } else {
      addOverlayGradient(`${gradientAppendingName}`, stops, group);
      gradientName = `url(#${gradientAppendingName})`;
    }
  }

  let legendScale = d3.scaleLinear()
    .range([0, width - 1.2])
    .domain(isInput ? [0, range] : [minMax.min, minMax.max]);

  let legendAxis = d3.axisBottom()
    .scale(legendScale)
    .tickFormat(d3.format(isInput ? 'd' : '.2f'))
    .tickValues(isInput ? [0, range] : [minMax.min, 0, minMax.max]);
  
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
    .style('fill', gradientName);
}

/**
 * Append a filled rectangle under a pair of nodes.
 * @param {number} curLayerIndex Index of the selected layer
 * @param {number} i Index of the selected node
 * @param {number} leftX X value of the left border of intermediate layer
 * @param {number} intermediateGap Inner gap of this intermediate layer
 * @param {number} padding Padding around the rect
 * @param {function} intermediateNodeMouseOverHandler Mouse over handler
 * @param {function} intermediateNodeMouseLeaveHandler Mouse leave handler
 * @param {function} intermediateNodeClicked Mouse click handler
 */
const addUnderneathRect = (curLayerIndex, i, leftX,
  intermediateGap, padding, intermediateNodeMouseOverHandler,
  intermediateNodeMouseLeaveHandler, intermediateNodeClicked) => {
  // Add underneath rects
  let underGroup = svg.select('g.underneath');
  for (let n = 0; n < cnn[curLayerIndex - 1].length; n++) {
    underGroup.append('rect')
      .attr('class', 'underneath-gateway')
      .attr('id', `underneath-gateway-${n}`)
      .attr('x', leftX - padding)
      .attr('y', nodeCoordinate[curLayerIndex - 1][n].y - padding)
      .attr('width', (2 * nodeLength + intermediateGap) + 2 * padding)
      .attr('height', nodeLength + 2 * padding)
      .attr('rx', 10)
      .style('fill', 'rgba(160, 160, 160, 0.2)')
      .style('opacity', 0);
    
    // Register new events for input layer nodes
    svg.select(`g#layer-${curLayerIndex - 1}-node-${n}`)
      .on('mouseover', intermediateNodeMouseOverHandler)
      .on('mouseleave', intermediateNodeMouseLeaveHandler)
      .on('click', (d, g, ni) => intermediateNodeClicked(d, g, ni,
        i, curLayerIndex))
  }
  underGroup.lower();
}

/**
 * Add an overlaying rect
 * @param {string} gradientName Gradient name of overlay rect
 * @param {number} x X value of the overlaying rect
 * @param {number} y Y value of the overlaying rect
 * @param {number} width Rect width
 * @param {number} height Rect height
 */
export const addOverlayRect = (gradientName, x, y, width, height) => {
  if (svg.select('.intermediate-layer-overlay').empty()) {
    svg.append('g').attr('class', 'intermediate-layer-overlay');
  }

  let intermediateLayerOverlay = svg.select('.intermediate-layer-overlay');

  let overlayRect = intermediateLayerOverlay.append('rect')
    .attr('class', 'overlay')
    .style('fill', `url(#${gradientName})`)
    .style('stroke', 'none')
    .attr('width', width)
    .attr('height', height)
    .attr('x', x)
    .attr('y', y)
    .style('opacity', 0);
  
  overlayRect.transition('move')
    .duration(800)
    .ease(d3.easeCubicInOut)
    .style('opacity', 1);
}

/**
 * Redraw the layer if needed (entering the intermediate view to make sure
 * all layers have the same color scale)
 * @param {number} curLayerIndex Index of the selected layer
 * @param {number} i Index of the selected node
 */
const redrawLayerIfNeeded = (curLayerIndex, i) => {
  // Determine the range for this layerview, and redraw the layer with
  // smaller range so all layers have the same range
  let rangePre = cnnLayerRanges[selectedScaleLevel][curLayerIndex - 1];
  let rangeCur = cnnLayerRanges[selectedScaleLevel][curLayerIndex];
  let range = Math.max(rangePre, rangeCur);

  if (rangePre > rangeCur) {
    // Redraw the current layer (selected node)
    svg.select(`g#layer-${curLayerIndex}-node-${i}`)
      .select('image.node-image')
      .each((d, g, i) => drawOutput(d, g, i, range));
    
    // Record the change so we will re-redraw the layer when user quits
    // the intermediate view
    needRedraw = [curLayerIndex, i];
    needRedrawStore.set(needRedraw);
    
  } else if (rangePre < rangeCur) {
    // Redraw the previous layer (whole layer)
    svg.select(`g#cnn-layer-group-${curLayerIndex - 1}`)
      .selectAll('image.node-image')
      .each((d, g, i) => drawOutput(d, g, i, range));

    // Record the change so we will re-redraw the layer when user quits
    // the intermediate view
    needRedraw = [curLayerIndex - 1, undefined];
    needRedrawStore.set(needRedraw);
  }

  // Compute the min, max value of all nodes in pre-layer and the selected
  // node of cur-layer
  let min = cnnLayerMinMax[curLayerIndex - 1].min,
    max = cnnLayerMinMax[curLayerIndex - 1].max;

  // Selected node
  let n = cnn[curLayerIndex][i];
  for (let r = 0; r < n.output.length; r++) {
    for (let c = 0; c < n.output[0].length; c++) {
      if (n.output[r][c] < min) { min = n.output[r][c]; }
      if (n.output[r][c] > max) { max = n.output[r][c]; }
    }
  }

  return {range: range, minMax: {min: min, max: max}};
}

/**
 * Draw the intermediate layer before conv_1_1
 * @param {number} curLayerIndex Index of the selected layer
 * @param {object} d Bounded d3 data
 * @param {number} i Index of the selected node
 * @param {number} width CNN group width
 * @param {number} height CNN group height
 * @param {function} intermediateNodeMouseOverHandler mouse over handler
 * @param {function} intermediateNodeMouseLeaveHandler mouse leave handler
 * @param {function} intermediateNodeClicked node clicking handler
 */
export const drawConv1 = (curLayerIndex, d, i, width, height,
  intermediateNodeMouseOverHandler, intermediateNodeMouseLeaveHandler,
  intermediateNodeClicked) => {
  // Compute the target location
  let targetX = nodeCoordinate[curLayerIndex - 1][0].x + 2 * nodeLength +
    2 * hSpaceAroundGap * gapRatio + plusSymbolRadius * 2;
  let intermediateGap = (hSpaceAroundGap * gapRatio * 2) / 3;
  let leftX = nodeCoordinate[curLayerIndex - 1][0].x;

  // Hide the edges
  svg.select('g.edge-group')
    .style('visibility', 'hidden');

  // Move the selected layer
  moveLayerX({layerIndex: curLayerIndex, targetX: targetX, disable: true,
    delay: 0, opacity: 0.15, specialIndex: i});

  // Compute the gap in the right shrink region
  let rightStart = targetX + nodeLength + hSpaceAroundGap * gapRatio;
  let rightGap = (width - rightStart - 10 * nodeLength) / 10;

  // Move the right layers
  for (let i = curLayerIndex + 1; i < numLayers; i++) {
  let curX = rightStart + (i - (curLayerIndex + 1)) * (nodeLength + rightGap);
  moveLayerX({layerIndex: i, targetX: curX, disable: true, delay: 0});
  }

  // Add an overlay gradient and rect
  let stops = [{offset: '0%', color: 'rgb(250, 250, 250)', opacity: 0.85},
  {offset: '50%', color: 'rgb(250, 250, 250)', opacity: 0.95},
  {offset: '100%', color: 'rgb(250, 250, 250)', opacity: 1}];
  addOverlayGradient('overlay-gradient', stops);

  addOverlayRect('overlay-gradient', rightStart - overlayRectOffset / 2,
  0, width - rightStart + overlayRectOffset,
  height + svgPaddings.top + svgPaddings.bottom);

  // Draw the intermediate layer
  let {intermediateLayer, intermediateMinMax, kernelRange, kernelMinMax} =
  drawIntermediateLayer(curLayerIndex, leftX, targetX, rightStart,
    intermediateGap, d, i, intermediateNodeMouseOverHandler,
    intermediateNodeMouseLeaveHandler, intermediateNodeClicked);
  addUnderneathRect(curLayerIndex, i, leftX, intermediateGap, 8,
  intermediateNodeMouseOverHandler, intermediateNodeMouseLeaveHandler,
  intermediateNodeClicked);

  // Compute the selected node's min max
  // Selected node
  let min = Infinity, max = -Infinity;
  let n = cnn[curLayerIndex][i];
  for (let r = 0; r < n.output.length; r++) {
  for (let c = 0; c < n.output[0].length; c++) {
    if (n.output[r][c] < min) { min = n.output[r][c]; }
    if (n.output[r][c] > max) { max = n.output[r][c]; }
  }
  }

  let finalMinMax = {
  min: Math.min(min, intermediateMinMax.min),
  max: Math.max(max, intermediateMinMax.max)
  }

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
  width: 2 * nodeLength + intermediateGap,
  isInput: true,
  x: leftX,
  y: nodeCoordinate[curLayerIndex][9].y,
  });

  drawIntermediateLayerLegend({
  legendHeight: 5,
  curLayerIndex: curLayerIndex,
  range: range,
  minMax: finalMinMax,
  group: intermediateLayer,
  width: 2 * nodeLength + intermediateGap,
  x: nodeCoordinate[curLayerIndex - 1][2].x,
  y: nodeCoordinate[curLayerIndex][9].y + 25
  });

  drawIntermediateLayerLegend({
  legendHeight: 5,
  curLayerIndex: curLayerIndex,
  range: kernelRange,
  minMax: kernelMinMax,
  group: intermediateLayer,
  width: 2 * nodeLength + intermediateGap,
  x: targetX + nodeLength - (2 * nodeLength + intermediateGap),
  y: nodeCoordinate[curLayerIndex][9].y + 25,
  gradientAppendingName: 'kernelColorGradient',
  colorScale: layerColorScales.weight,
  gradientGap: 0.2
  });

  // Show everything
  svg.selectAll('g.intermediate-layer, g.intermediate-layer-annotation')
  .transition()
  .delay(500)
  .duration(500)
  .ease(d3.easeCubicInOut)
  .style('opacity', 1);
}

/**
 * Draw the intermediate layer before conv_1_2
 * @param {number} curLayerIndex Index of the selected layer
 * @param {object} d Bounded d3 data
 * @param {number} i Index of the selected node
 * @param {number} width CNN group width
 * @param {number} height CNN group height
 * @param {function} intermediateNodeMouseOverHandler mouse over handler
 * @param {function} intermediateNodeMouseLeaveHandler mouse leave handler
 * @param {function} intermediateNodeClicked node clicking handler
 */
export const drawConv2 = (curLayerIndex, d, i, width, height,
  intermediateNodeMouseOverHandler, intermediateNodeMouseLeaveHandler,
  intermediateNodeClicked) => {
  let targetX = nodeCoordinate[curLayerIndex - 1][0].x + 2 * nodeLength +
    2 * hSpaceAroundGap * gapRatio + plusSymbolRadius * 2;
  let intermediateGap = (hSpaceAroundGap * gapRatio * 2) / 3;

  // Make sure two layers have the same range
  let {range, minMax} = redrawLayerIfNeeded(curLayerIndex, i);

  // Hide the edges
  svg.select('g.edge-group')
    .style('visibility', 'hidden');

  // Move the selected layer
  moveLayerX({layerIndex: curLayerIndex, targetX: targetX, disable: true,
    delay: 0, opacity: 0.15, specialIndex: i});

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

  addOverlayRect('overlay-gradient-right', rightStart - overlayRectOffset / 2,
    0, width - rightStart + overlayRectOffset,
    height + svgPaddings.top + svgPaddings.bottom);

  addOverlayRect('overlay-gradient-left', nodeCoordinate[0][0].x - overlayRectOffset / 2,
    0, nodeLength * 2 + hSpaceAroundGap * gapRatio + overlayRectOffset,
    height + svgPaddings.top + svgPaddings.bottom);

  // Draw the intermediate layer
  let leftX = nodeCoordinate[curLayerIndex - 1][0].x;
  let {intermediateLayer, intermediateMinMax, kernelRange, kernelMinMax} =
    drawIntermediateLayer(curLayerIndex, leftX, targetX, rightStart,
      intermediateGap, d, i, intermediateNodeMouseOverHandler,
      intermediateNodeMouseLeaveHandler, intermediateNodeClicked);
  addUnderneathRect(curLayerIndex, i, leftX, intermediateGap, 5,
    intermediateNodeMouseOverHandler, intermediateNodeMouseLeaveHandler,
    intermediateNodeClicked);

  // After getting the intermediateMinMax, we can finally aggregate it with
  // the preLayer minmax, curLayer minmax
  let finalMinMax = {
    min: Math.min(minMax.min, intermediateMinMax.min),
    max: Math.max(minMax.max, intermediateMinMax.max)
  }

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
    minMax: finalMinMax,
    group: intermediateLayer,
    width: 2 * nodeLength + intermediateGap,
    x: leftX,
    y: nodeCoordinate[curLayerIndex - 1][9].y + nodeLength + 10,
  });

  drawIntermediateLayerLegend({
    legendHeight: 5,
    curLayerIndex: curLayerIndex,
    range: kernelRange,
    minMax: kernelMinMax,
    group: intermediateLayer,
    width: 2 * nodeLength + intermediateGap,
    x: targetX + nodeLength - (2 * nodeLength + intermediateGap),
    y: nodeCoordinate[curLayerIndex - 1][9].y + nodeLength + 10,
    gradientAppendingName: 'kernelColorGradient',
    colorScale: layerColorScales.weight,
    gradientGap: 0.2
  });

  // Show everything
  svg.selectAll('g.intermediate-layer, g.intermediate-layer-annotation')
    .transition()
    .delay(500)
    .duration(500)
    .ease(d3.easeCubicInOut)
    .style('opacity', 1);
}

/**
 * Draw the intermediate layer before conv_2_1
 * @param {number} curLayerIndex Index of the selected layer
 * @param {object} d Bounded d3 data
 * @param {number} i Index of the selected node
 * @param {number} width CNN group width
 * @param {number} height CNN group height
 * @param {function} intermediateNodeMouseOverHandler mouse over handler
 * @param {function} intermediateNodeMouseLeaveHandler mouse leave handler
 * @param {function} intermediateNodeClicked node clicking handler
 */
export const drawConv3 = (curLayerIndex, d, i, width, height,
  intermediateNodeMouseOverHandler, intermediateNodeMouseLeaveHandler,
  intermediateNodeClicked) => {

  let targetX = nodeCoordinate[curLayerIndex][0].x;
  let leftX = targetX - (2 * nodeLength +
    2 * hSpaceAroundGap * gapRatio + plusSymbolRadius * 2);
  let intermediateGap = (hSpaceAroundGap * gapRatio * 2) / 3;

  // Hide the edges
  svg.select('g.edge-group')
    .style('visibility', 'hidden');

  // Make sure two layers have the same range
  let {range, minMax} = redrawLayerIfNeeded(curLayerIndex, i);

  // Move the previous layer
  moveLayerX({layerIndex: curLayerIndex - 1, targetX: leftX,
    disable: true, delay: 0});

  moveLayerX({layerIndex: curLayerIndex,
    targetX: targetX, disable: true,
    delay: 0, opacity: 0.15, specialIndex: i});

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

  addOverlayRect('overlay-gradient-left', nodeCoordinate[0][0].x - overlayRectOffset / 2,
    0, leftEnd - nodeCoordinate[0][0].x + overlayRectOffset,
    height + svgPaddings.top + svgPaddings.bottom);
  
  addOverlayRect('overlay-gradient-right', rightStart - overlayRectOffset / 2,
    0, width - rightStart + overlayRectOffset,
    height + svgPaddings.top + svgPaddings.bottom);
  
  // Draw the intermediate layer
  let {intermediateLayer, intermediateMinMax, kernelRange, kernelMinMax} =
    drawIntermediateLayer(curLayerIndex, leftX,
      nodeCoordinate[curLayerIndex][0].x, rightStart, intermediateGap,
      d, i, intermediateNodeMouseOverHandler,
      intermediateNodeMouseLeaveHandler, intermediateNodeClicked);
  addUnderneathRect(curLayerIndex, i, leftX, intermediateGap, 5,
    intermediateNodeMouseOverHandler, intermediateNodeMouseLeaveHandler,
    intermediateNodeClicked);
          
  // After getting the intermediateMinMax, we can finally aggregate it with
  // the preLayer minmax, curLayer minmax
  let finalMinMax = {
    min: Math.min(minMax.min, intermediateMinMax.min),
    max: Math.max(minMax.max, intermediateMinMax.max)
  }

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
    width: 2 * nodeLength + intermediateGap,
    minMax: finalMinMax,
    x: leftX,
    y: nodeCoordinate[curLayerIndex - 1][9].y + nodeLength + 10
  });

  drawIntermediateLayerLegend({
    legendHeight: 5,
    curLayerIndex: curLayerIndex,
    range: kernelRange,
    minMax: kernelMinMax,
    group: intermediateLayer,
    width: 2 * nodeLength + intermediateGap,
    x: targetX + nodeLength - (2 * nodeLength + intermediateGap),
    y: nodeCoordinate[curLayerIndex - 1][9].y + nodeLength + 10,
    gradientAppendingName: 'kernelColorGradient',
    colorScale: layerColorScales.weight,
    gradientGap: 0.2
  });

  // Show everything
  svg.selectAll('g.intermediate-layer, g.intermediate-layer-annotation')
    .transition()
    .delay(500)
    .duration(500)
    .ease(d3.easeCubicInOut)
    .style('opacity', 1);
}

/**
 * Draw the intermediate layer before conv_2_2
 * @param {number} curLayerIndex Index of the selected layer
 * @param {object} d Bounded d3 data
 * @param {number} i Index of the selected node
 * @param {number} width CNN group width
 * @param {number} height CNN group height
 * @param {function} intermediateNodeMouseOverHandler mouse over handler
 * @param {function} intermediateNodeMouseLeaveHandler mouse leave handler
 * @param {function} intermediateNodeClicked node clicking handler
 */
export const drawConv4 = (curLayerIndex, d, i, width, height,
  intermediateNodeMouseOverHandler, intermediateNodeMouseLeaveHandler,
  intermediateNodeClicked) => {
  let targetX = nodeCoordinate[curLayerIndex][0].x;
  let leftX = targetX - (2 * nodeLength +
    2 * hSpaceAroundGap * gapRatio + plusSymbolRadius * 2);
  let intermediateGap = (hSpaceAroundGap * gapRatio * 2) / 3;

  // Hide the edges
  svg.select('g.edge-group')
    .style('visibility', 'hidden');

  // Make sure two layers have the same range
  let {range, minMax} = redrawLayerIfNeeded(curLayerIndex, i);

  // Move the previous layer
  moveLayerX({layerIndex: curLayerIndex - 1, targetX: leftX,
    disable: true, delay: 0});

  moveLayerX({layerIndex: curLayerIndex,
    targetX: targetX, disable: true,
    delay: 0, opacity: 0.15, specialIndex: i});

  // Compute the gap in the left shrink region
  let leftEnd = leftX - hSpaceAroundGap;
  let leftGap = (leftEnd - nodeCoordinate[0][0].x - 7 * nodeLength) / 7;
  let rightStart = targetX + nodeLength + hSpaceAroundGap;

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

  addOverlayRect('overlay-gradient-left', nodeCoordinate[0][0].x - overlayRectOffset / 2,
    0, leftEnd - nodeCoordinate[0][0].x + overlayRectOffset,
    height + svgPaddings.top + svgPaddings.bottom);
  
  addOverlayRect('overlay-gradient-right', rightStart - overlayRectOffset / 2,
    0, width - rightStart + overlayRectOffset,
    height + svgPaddings.top + svgPaddings.bottom);
  
  // Draw the intermediate layer
  let {intermediateLayer, intermediateMinMax, kernelRange, kernelMinMax} =
    drawIntermediateLayer(curLayerIndex, leftX,
      nodeCoordinate[curLayerIndex][0].x, rightStart, intermediateGap,
      d, i, intermediateNodeMouseOverHandler,
      intermediateNodeMouseLeaveHandler, intermediateNodeClicked);
  addUnderneathRect(curLayerIndex, i, leftX, intermediateGap, 5,
    intermediateNodeMouseOverHandler, intermediateNodeMouseLeaveHandler,
    intermediateNodeClicked);
          
  // After getting the intermediateMinMax, we can finally aggregate it with
  // the preLayer minmax, curLayer minmax
  let finalMinMax = {
    min: Math.min(minMax.min, intermediateMinMax.min),
    max: Math.max(minMax.max, intermediateMinMax.max)
  }

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
    minMax: finalMinMax,
    width: 2 * nodeLength + intermediateGap,
    x: leftX,
    y: nodeCoordinate[curLayerIndex - 1][9].y + nodeLength + 10
  });

  drawIntermediateLayerLegend({
    legendHeight: 5,
    curLayerIndex: curLayerIndex,
    range: kernelRange,
    minMax: kernelMinMax,
    group: intermediateLayer,
    width: 2 * nodeLength + intermediateGap,
    x: targetX + nodeLength - (2 * nodeLength + intermediateGap),
    y: nodeCoordinate[curLayerIndex - 1][9].y + nodeLength + 10,
    gradientAppendingName: 'kernelColorGradient',
    colorScale: layerColorScales.weight,
    gradientGap: 0.2
  });

  // Show everything
  svg.selectAll('g.intermediate-layer, g.intermediate-layer-annotation')
    .transition()
    .delay(500)
    .duration(500)
    .ease(d3.easeCubicInOut)
    .style('opacity', 1);
}

/**
 * Draw the flatten layer before output layer
 * @param {number} curLayerIndex Index of the selected layer
 * @param {object} d Bounded d3 data
 * @param {number} i Index of the selected node
 * @param {number} width CNN group width
 * @param {number} height CNN group height
 */
export const drawFlatten = (curLayerIndex, d, i, width, height) => {
  // Show the output legend
  svg.selectAll('.output-legend').classed('hidden', false);

  let pixelWidth = nodeLength / 2;
  let pixelHeight = 1.1;
  let leftX = nodeCoordinate[curLayerIndex][0].x - (2 * nodeLength +
    4 * hSpaceAroundGap * gapRatio + pixelWidth);
  let intermediateGap = (hSpaceAroundGap * gapRatio * 4) / 2;

  // Hide the edges
  svg.select('g.edge-group')
    .style('visibility', 'hidden');

  // Move the previous layer
  moveLayerX({layerIndex: curLayerIndex - 1, targetX: leftX,
    disable: true, delay: 0});

  moveLayerX({layerIndex: curLayerIndex,
    targetX: nodeCoordinate[curLayerIndex][0].x, disable: true,
    delay: 0, opacity: 0.15, specialIndex: i});

  // Compute the gap in the left shrink region
  let leftEnd = leftX - hSpaceAroundGap;
  let leftGap = (leftEnd - nodeCoordinate[0][0].x - 10 * nodeLength) / 10;
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
    .attr('width', leftEnd - nodeCoordinate[0][0].x + overlayRectOffset)
    .attr('height', height + svgPaddings.top + svgPaddings.bottom)
    .attr('x', nodeCoordinate[0][0].x - overlayRectOffset/2)
    .attr('y', 0)
    .style('opacity', 0);
  
  intermediateLayerOverlay.append('rect')
    .attr('class', 'overlay')
    .style('fill', 'url(#overlay-gradient-right)')
    .style('stroke', 'none')
    .attr('width', width - rightStart + overlayRectOffset)
    .attr('height', height + svgPaddings.top + svgPaddings.bottom)
    .attr('x', rightStart - overlayRectOffset/2)
    .attr('y', 0)
    .style('opacity', 0);
  
  intermediateLayerOverlay.selectAll('rect.overlay')
    .transition('move')
    .duration(800)
    .ease(d3.easeCubicInOut)
    .style('opacity', 1);

  // Add the intermediate layer
  let intermediateLayer = svg.select('.cnn-group')
    .append('g')
    .attr('class', 'intermediate-layer')
    .style('opacity', 0);
  
  let intermediateX1 = leftX + nodeLength + intermediateGap;
  let range = cnnLayerRanges[selectedScaleLevel][curLayerIndex - 1];
  let colorScale = layerColorScales.conv;
  let flattenLength = cnn.flatten.length / cnn[1].length;
  let linkData = [];

  let flattenLayer = intermediateLayer.append('g')
    .attr('class', 'flatten-layer');
  
  let topY = nodeCoordinate[curLayerIndex - 1][0].y;
  let bottomY = nodeCoordinate[curLayerIndex - 1][9].y + nodeLength -
        flattenLength * pixelHeight;
  
  // Compute the pre-layer gap
  let preLayerDimension = cnn[curLayerIndex - 1][0].output.length;
  let preLayerGap = nodeLength / (2 * preLayerDimension);

  // Compute bounding box length
  let boundingBoxLength = nodeLength / preLayerDimension;

  // Compute the weight color scale
  let flattenExtent = d3.extent(cnn.flatten.slice(flattenLength)
    .map(d => d.outputLinks[i].weight)
    .concat(cnn.flatten.slice(9 * flattenLength, 10 * flattenLength)
      .map(d => d.outputLinks[i].weight)));

  let flattenRange = 2 * (Math.round(
    Math.max(...flattenExtent.map(Math.abs)) * 1000) / 1000);

  let flattenMouseOverHandler = (d) => {
    let index = d.index;
    flattenLayer.select(`#edge-flatten-${index}`)
      .raise()
      .style('stroke', intermediateColor)
      .style('stroke-width', 1);

    flattenLayer.select(`#edge-flatten-${index}-output`)
      .raise()
      .style('stroke-width', 1)
      .style('stroke', da => gappedColorScale(layerColorScales.weight,
        flattenRange, da.weight, 0.1));

    flattenLayer.select(`#bounding-${index}`)
      .raise()
      .style('opacity', 1);
  }

  let flattenMouseLeaveHandler = (d) => {
    let index = d.index;
    flattenLayer.select(`#edge-flatten-${index}`)
      .style('stroke-width', 0.6)
      .style('stroke', '#E5E5E5')

    flattenLayer.select(`#edge-flatten-${index}-output`)
      .style('stroke-width', 0.6)
      .style('stroke', da => gappedColorScale(layerColorScales.weight,
        flattenRange, da.weight, 0.35));

    flattenLayer.select(`#bounding-${index}`)
      .raise()
      .style('opacity', 0);
  }

  for (let f = 0; f < flattenLength; f++) {
    let loopFactors = [0, 9];
    loopFactors.forEach(l => {
      let factoredF = f + l * flattenLength;
      flattenLayer.append('rect')
        .attr('x', intermediateX1)
        .attr('y', l === 0 ? topY + f * pixelHeight : bottomY + f * pixelHeight)
        .attr('width', pixelWidth)
        .attr('height', pixelHeight)
        .style('fill', colorScale((cnn.flatten[factoredF].output + range / 2) / range))
        .on('mouseover', () => flattenMouseOverHandler({index: factoredF}))
        .on('mouseleave', () => flattenMouseLeaveHandler({index: factoredF}));

      // Flatten -> output
      linkData.push({
        source: {x: intermediateX1 + pixelWidth + 3,
          y:  l === 0 ? topY + f * pixelHeight : bottomY + f * pixelHeight},
        target: {x: nodeCoordinate[curLayerIndex][i].x - nodeLength,
          y: nodeCoordinate[curLayerIndex][i].y + nodeLength / 2},
        index: factoredF,
        weight: cnn.flatten[factoredF].outputLinks[i].weight,
        name: `flatten-${factoredF}-output`,
        color: gappedColorScale(layerColorScales.weight,
          flattenRange, cnn.flatten[factoredF].outputLinks[i].weight, 0.35),
        width: 0.6,
        opacity: 1,
        class: `flatten-output`
      });

      // Pre-layer -> flatten
      let row = Math.floor(f / preLayerDimension);
      linkData.push({
        target: {x: intermediateX1 - 3,
          y:  l === 0 ? topY + f * pixelHeight : bottomY + f * pixelHeight},
        source: {x: leftX + nodeLength + 3,
          y: nodeCoordinate[curLayerIndex - 1][l].y + (2 * row + 1) * preLayerGap},
        index: factoredF,
        name: `flatten-${factoredF}`,
        color: '#E5E5E5',
        // color: gappedColorScale(layerColorScales.conv,
        //   2 * Math.max(Math.abs(cnnLayerMinMax[10].max), Math.abs(cnnLayerMinMax[10].min)),
        //   cnn.flatten[factoredF].output, 0.2),
        width: 0.6,
        opacity: 1,
        class: `flatten`
      });

      // Add original pixel bounding box
      let loc = cnn.flatten[factoredF].inputLinks[0].weight;
      flattenLayer.append('rect')
        .attr('id', `bounding-${factoredF}`)
        .attr('class', 'flatten-bounding')
        .attr('x', leftX + loc[1] * boundingBoxLength)
        .attr('y', nodeCoordinate[curLayerIndex - 1][l].y + loc[0] * boundingBoxLength)
        .attr('width', boundingBoxLength)
        .attr('height', boundingBoxLength)
        .style('fill', 'none')
        .style('stroke', intermediateColor)
        .style('stroke-length', '0.5')
        .style('pointer-events', 'all')
        .style('opacity', 0)
        .on('mouseover', () => flattenMouseOverHandler({index: factoredF}))
        .on('mouseleave', () => flattenMouseLeaveHandler({index: factoredF}));
    }) 
  }
  
  // Use abstract symbol to represent the flatten nodes in between (between
  // the first and the last nodes)
  
  // Compute the average value of input node and weights
  let meanValues = [];
  for (let n = 1; n < cnn[curLayerIndex - 1].length - 1; n++) {
    let meanOutput = d3.mean(cnn.flatten.slice(flattenLength * n,
      flattenLength * (n + 1)).map(d => d.output));
    let meanWeight= d3.mean(cnn.flatten.slice(flattenLength * n,
      flattenLength * (n + 1)).map(d => d.outputLinks[i].weight));
    meanValues.push({index: n, output: meanOutput, weight: meanWeight});
  }

  // Compute the middle gap
  let middleGap = 5;
  let middleRectHeight = (10 * nodeLength + (10 - 1) * vSpaceAroundGap -
    pixelHeight * flattenLength * 2 - 5 * (8 + 1)) / 8;

  // Add middle nodes
  meanValues.forEach((v, vi) => {
    // Add a small rectangle
    flattenLayer.append('rect')
      .attr('x', intermediateX1 + pixelWidth / 4)
      .attr('y', topY + flattenLength * pixelHeight + middleGap * (vi + 1) +
        middleRectHeight * vi)
      .attr('width', pixelWidth / 2)
      .attr('height', middleRectHeight)
      .style('fill', colorScale((v.output + range / 2) / range));
    
    // Add a triangle next to the input node
    flattenLayer.append('polyline')
      .attr('points',
        `${leftX + nodeLength + 3}
        ${nodeCoordinate[curLayerIndex - 1][v.index].y},
        ${leftX + nodeLength + 10}
        ${nodeCoordinate[curLayerIndex - 1][v.index].y + nodeLength / 2},
        ${leftX + nodeLength + 3}
        ${nodeCoordinate[curLayerIndex - 1][v.index].y + nodeLength}`)
      .style('fill', '#E5E5E5')
      .style('opacity', 1);
    
    // Input -> flatten
    linkData.push({
      target: {x: intermediateX1 - 3,
        y: topY + flattenLength * pixelHeight + middleGap * (vi + 1) +
          middleRectHeight * (vi + 0.5)},
      source: {x: leftX + nodeLength + 10,
        y: nodeCoordinate[curLayerIndex - 1][v.index].y + nodeLength / 2},
      index: -1,
      width: 1,
      opacity: 1,
      name: `flatten-abstract-${v.index}`,
      color: '#E5E5E5',
      class: `flatten-abstract`
    });

    // Flatten -> output
    linkData.push({
      source: {x: intermediateX1 + pixelWidth + 3,
        y: topY + flattenLength * pixelHeight + middleGap * (vi + 1) +
          middleRectHeight * (vi + 0.5)},
      target: {x: nodeCoordinate[curLayerIndex][i].x - nodeLength,
        y: nodeCoordinate[curLayerIndex][i].y + nodeLength / 2},
      index: -1,
      name: `flatten-abstract-${v.index}-output`,
      color: gappedColorScale(layerColorScales.weight, flattenRange,
        v.weight, 0.35),
      weight: v.weight,
      width: 1,
      opacity: 1,
      class: `flatten-abstract-output`
    });
  })

  // Draw the plus operation symbol
  let intermediateX2 = intermediateX1 + intermediateGap + pixelWidth;
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
      .attr('x', -kernelRectLength)
      .attr('y', nodeLength / 2)
      .attr('width', 2 * kernelRectLength)
      .attr('height', 2 * kernelRectLength)
      .style('stroke', intermediateColor)
      .style('fill', gappedColorScale(layerColorScales.weight,
          flattenRange, d.bias, 0.35));
    
    // Link from bias to the plus symbol
    linkData.push({
      source: {x: intermediateX2 + plusSymbolRadius,
        y: nodeCoordinate[curLayerIndex][i].y + nodeLength},
      target: {x: intermediateX2 + plusSymbolRadius,
        y: nodeCoordinate[curLayerIndex][i].y + nodeLength / 2 + plusSymbolRadius},
      name: `bias-plus`,
      width: 1.2,
      color: '#E5E5E5'
    });
  } else {
    // Add bias symbol to the plus symbol
    symbolGroup.append('rect')
      .attr('x', -kernelRectLength)
      .attr('y', -nodeLength / 2 - 2 * kernelRectLength)
      .attr('width', 2 * kernelRectLength)
      .attr('height', 2 * kernelRectLength)
      .style('stroke', intermediateColor)
      .style('fill', gappedColorScale(layerColorScales.weight,
          flattenRange, d.bias, 0.35));
    
    // Link from bias to the plus symbol
    linkData.push({
      source: {x: intermediateX2 + plusSymbolRadius,
        y: nodeCoordinate[curLayerIndex][i].y},
      target: {x: intermediateX2 + plusSymbolRadius,
        y: nodeCoordinate[curLayerIndex][i].y + nodeLength / 2 - plusSymbolRadius},
      name: `bias-plus`,
      width: 1.2,
      color: '#E5E5E5'
    });
  }

  // Link from the plus symbol to the output
  linkData.push({
    source: getOutputKnot({x: intermediateX2 + 2 * plusSymbolRadius - nodeLength,
      y: nodeCoordinate[curLayerIndex][i].y}),
    target: getInputKnot({x: nodeCoordinate[curLayerIndex][i].x - 3,
      y: nodeCoordinate[curLayerIndex][i].y}),
    name: `symbol-output`,
    width: 1.2,
    color: '#E5E5E5'
  });

  // Draw the layer label
  intermediateLayer.append('g')
    .attr('class', 'layer-label')
    .attr('transform', () => {
      let x = leftX + nodeLength + (4 * hSpaceAroundGap * gapRatio +
        pixelWidth) / 2;
      let y = (svgPaddings.top + vSpaceAroundGap) / 2;
      return `translate(${x}, ${y})`;
    })
    .append('text')
    .style('dominant-baseline', 'middle')
    .style('opacity', 0.8)
    .text('flatten');

  // Add edges between nodes
  let linkGen = d3.linkHorizontal()
    .x(d => d.x)
    .y(d => d.y);

  let edgeGroup = flattenLayer.append('g')
    .attr('class', 'edge-group');
  
  edgeGroup.selectAll('path')
    .data(linkData)
    .enter()
    .append('path')
    .attr('class', d => d.class)
    .attr('id', d => `edge-${d.name}`)
    .attr('d', d => linkGen({source: d.source, target: d.target}))
    .style('fill', 'none')
    .style('stroke-width', d => d.width)
    .style('stroke', d => d.color === undefined ? intermediateColor : d.color)
    .style('opacity', d => d.opacity);
  
  edgeGroup.selectAll('path.flatten-abstract-output').lower();

  edgeGroup.selectAll('path.flatten,path.flatten-output')
    .on('mouseover', flattenMouseOverHandler)
    .on('mouseleave', flattenMouseLeaveHandler);
  
  // Add legend
  drawIntermediateLayerLegend({
    legendHeight: 5,
    curLayerIndex: curLayerIndex,
    range: range,
    minMax: cnnLayerMinMax[10],
    group: intermediateLayer,
    width: intermediateGap * 0.5,
    x: leftX,
    y: nodeCoordinate[curLayerIndex - 1][9].y + nodeLength + 10,
  });

  drawIntermediateLayerLegend({
    legendHeight: 5,
    curLayerIndex: curLayerIndex,
    range: flattenRange,
    minMax: {min: flattenExtent[0], max: flattenExtent[1]},
    group: intermediateLayer,
    width: intermediateGap * 0.5,
    gradientAppendingName: 'flatten-weight-gradient',
    gradientGap: 0.1,
    colorScale: layerColorScales.weight,
    x: leftX + intermediateGap * 0.5 + (nodeLength  +
      intermediateGap) - (2 * 0.5) * intermediateGap,
    y: nodeCoordinate[curLayerIndex - 1][9].y + nodeLength + 10,
  });

  // Add annotation to the intermediate layer
  let intermediateLayerAnnotation = svg.append('g')
    .attr('class', 'intermediate-layer-annotation')
    .style('opacity', 0);

  // Add annotation for the sum operation
  let plusAnnotation = intermediateLayerAnnotation.append('g')
    .attr('class', 'plus-annotation');
  
  let textX = nodeCoordinate[curLayerIndex][i].x - 50;
  let textY = nodeCoordinate[curLayerIndex][i].y + nodeLength +
    kernelRectLength * 3;
  let arrowSY = nodeCoordinate[curLayerIndex][i].y + nodeLength +
    kernelRectLength * 2;
  let arrowTY = nodeCoordinate[curLayerIndex][i].y + nodeLength / 2 +
    plusSymbolRadius;

  if (isSafari) { textY += 3 * kernelRectLength; }

  if (i == 0) {
    textY += 10;
    arrowSY += 10;
  } else if (i == 9) {
    textY -= 120;
    arrowSY -= 70;
    arrowTY -= 18;
  }

  let plusText = plusAnnotation.append('text')
    .attr('x', textX)
    .attr('y', textY)
    .attr('class', 'annotation-text')
    .style('dominant-baseline', 'hanging')
    .style('text-anchor', 'middle');
  
  plusText.append('tspan')
    .text('Add up all products');
  
  plusText.append('tspan')
    .attr('x', textX)
    .attr('dy', '1em')
    .text('(');

  plusText.append('tspan')
    .style('fill', '#66a3c8')
    .text('element');

  plusText.append('tspan')
    .text(' × ');

  plusText.append('tspan')
    .style('fill', '#b58946')
    .text('weight');

  plusText.append('tspan')
    .text(')');

  plusText.append('tspan')
    .attr('x', textX)
    .attr('dy', '1em')
    .text('and then ');

  plusText.append('tspan')
    .style('fill', '#479d94')
    .text('bias');
  
  drawArrow({
    group: plusAnnotation,
    sx: intermediateX2 - 2 * plusSymbolRadius - 3,
    sy: arrowSY,
    tx: intermediateX2 - 5,
    ty: arrowTY,
    dr: 30,
    hFlip: i === 9
  });

  // Add annotation for the bias
  let biasTextY = nodeCoordinate[curLayerIndex][i].y;
  if (isSafari) { biasTextY -= 0.5 * kernelRectLength; }

  if (i === 0) {
    biasTextY += nodeLength + 2.5 * kernelRectLength;
    if (isSafari) { biasTextY += kernelRectLength; }
  } else {
    biasTextY -= 2 * kernelRectLength + 5;
  }
  
  plusAnnotation.append('text')
    .attr('class', 'annotation-text')
    .attr('x', intermediateX2 + plusSymbolRadius)
    .attr('y', biasTextY)
    .style('text-anchor', 'middle')
    .style('dominant-baseline', i === 0 ? 'hanging' : 'baseline')
    .text('Bias');

  // Add annotation for the flatten layer
  let flattenAnnotation = intermediateLayerAnnotation.append('g')
    .attr('class', 'flatten-annotation');
  
  textX = leftX - 80;
  textY = nodeCoordinate[curLayerIndex - 1][0].y;

  let flattenText = flattenAnnotation.append('text')
    .attr('x', textX)
    .attr('y', textY)
    .attr('class', 'annotation-text')
    .style('dominant-baseline', 'hanging')
    .style('text-anchor', 'middle');

  flattenText.append('tspan')
    .text('Hover over matrix to');
  
  flattenText.append('tspan')
    .attr('x', textX)
    .attr('dy', '1em')
    .text('see how it is flattened');
  
  flattenText.append('tspan')
    .attr('x', textX)
    .attr('dy', '1em')
    .text('into a 1D array!');

  drawArrow({
    group: flattenAnnotation,
    sx: textX + 45,
    sy: textY + nodeLength * 0.4 + 12,
    tx: leftX - 10,
    ty: textY + nodeLength / 2,
    dr: 80,
    hFlip: true
  });

  /* Prototype of using arc to represent the flatten layer (future)
  let pie = d3.pie()
    .padAngle(0)
    .sort(null)
    .value(d => d.output)
    .startAngle(0)
    .endAngle(-Math.PI);

  let radius = 490 / 2;
  let arc = d3.arc()
    .innerRadius(radius - 20)
    .outerRadius(radius);

  let arcs = pie(cnn.flatten);
  console.log(arcs);

  let test = svg.append('g')
    .attr('class', 'test')
    .attr('transform', 'translate(500, 250)');

  test.selectAll("path")
    .data(arcs)
    .join("path")
      .attr('class', 'arc')
      .attr("fill", d => colorScale((d.value + range/2) / range))
      .attr("d", arc);
  */

  // Show everything
  svg.selectAll('g.intermediate-layer, g.intermediate-layer-annotation')
    .transition()
    .delay(500)
    .duration(500)
    .ease(d3.easeCubicInOut)
    .style('opacity', 1);
}