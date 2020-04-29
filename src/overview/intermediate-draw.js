/* global d3 */

import {
  svgStore, vSpaceAroundGapStore, hSpaceAroundGapStore, cnnStore,
  nodeCoordinateStore, selectedScaleLevelStore, cnnLayerRangesStore,
  needRedrawStore, cnnLayerMinMaxStore, shouldIntermediateAnimateStore,
  hoverInfoStore, detailedModeStore, intermediateLayerPositionStore
} from '../stores.js';
import {
  getExtent, getOutputKnot, getInputKnot, gappedColorScale
} from './draw-utils.js';
import {
  drawOutput
} from './overview-draw.js';
import {
  drawIntermediateLayerLegend, moveLayerX, addOverlayGradient,
  drawArrow
} from './intermediate-utils.js';
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
const formater = d3.format('.4f');
let isEndOfAnimation = false;

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

let shouldIntermediateAnimate = undefined;
shouldIntermediateAnimateStore.subscribe(value => {
  shouldIntermediateAnimate = value;
})

let detailedMode = undefined;
detailedModeStore.subscribe( value => {detailedMode = value;} )

let intermediateLayerPosition = undefined;
intermediateLayerPositionStore.subscribe ( value => {intermediateLayerPosition = value;} )

// let curRightX = 0;

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
  nodeIndex, stride, intermediateNodeMouseOverHandler,
  intermediateNodeMouseLeaveHandler, intermediateNodeClicked, interaction) => {
  let newNode = groupLayer.append('g')
    .datum(cnn[curLayerIndex - 1][nodeIndex])
    .attr('class', 'intermediate-node')
    .attr('cursor', interaction ? 'pointer': 'default')
    .attr('pointer-events', interaction ? 'all': 'none')
    .attr('node-index', nodeIndex)
    .on('mouseover', intermediateNodeMouseOverHandler)
    .on('mouseleave', intermediateNodeMouseLeaveHandler)
    .on('click', (d, g, i) => intermediateNodeClicked(d, g, i, selectedI,
      curLayerIndex));
  
  newNode.append('image')
    .attr('width', nodeLength)
    .attr('height', nodeLength)
    .attr('x', x)
    .attr('y', y);

  // Overlay the image with a mask of many small rectangles
  let strideTime = Math.floor(nodeLength / stride);
  let overlayGroup = newNode.append('g')
    .attr('class', 'overlay-group')
    .attr('transform', `translate(${x}, ${y})`);
  
  for (let i = 0; i < strideTime; i++) {
    for (let j = 0; j < strideTime; j++) {
      overlayGroup.append('rect')
        .attr('class', `mask-overlay mask-${i}-${j}`)
        .attr('width', stride)
        .attr('height', stride)
        .attr('x', i * stride)
        .attr('y', j * stride)
        .style('fill', 'var(--light-gray)')
        .style('stroke', 'var(--light-gray)')
        .style('opacity', 1);
    }
  }

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

const startOutputAnimation = (kernelGroup, tickTime1D, stride, delay,
  curLayerIndex) => {
  const slidingAnimation = () => {
    let originX = +kernelGroup.attr('data-origin-x');
    let originY = +kernelGroup.attr('data-origin-y');
    let oldTick = +kernelGroup.attr('data-tick');
    let i = (oldTick) % tickTime1D;
    let j = Math.floor((oldTick) / tickTime1D);
    let x = originX + i * stride;
    let y = originY + j * stride;
    let newTick = (oldTick + 1) % (tickTime1D * tickTime1D);

    // Remove one mask rect at each tick
    svg.selectAll(`rect.mask-${i}-${j}`)
      .transition('window-sliding-mask')
      .delay(delay + 100)
      .duration(300)
      .style('opacity', 0);

      kernelGroup.attr('data-tick', newTick)
      .transition('window-sliding-input')
      .delay(delay)
      .duration(200)
      .attr('transform', `translate(${x}, ${y})`)
      .on('end', () => {
        if (newTick === 0) {
          /* Uncomment to wrap the sliding
          svg.selectAll(`rect.mask-overlay`)
            .transition('window-sliding-mask')
            .delay(delay - 200)
            .duration(300)
            .style('opacity', 1);
          */

          // Stop the animation
          // Be careful with animation racing so call this function here instead
          // of under selectALL
          if (!isEndOfAnimation) {
            animationButtonClicked(curLayerIndex);
          }
        }
        if (shouldIntermediateAnimate) {
          slidingAnimation();
        }
      });
  }
  slidingAnimation();
}

const startIntermediateAnimation = (kernelGroupInput, kernelGroupResult,
  tickTime1D, stride) => {
  let delay = 200;
  const slidingAnimation = () => {
    let originX = +kernelGroupInput.attr('data-origin-x');
    let originY = +kernelGroupInput.attr('data-origin-y');
    let originXResult = +kernelGroupResult.attr('data-origin-x');
    let oldTick = +kernelGroupInput.attr('data-tick');
    let i = (oldTick) % tickTime1D;
    let j = Math.floor((oldTick) / tickTime1D);
    let x = originX + i * stride;
    let y = originY + j * stride;
    let xResult = originXResult + (oldTick % tickTime1D) * stride;
    let newTick = (oldTick + 1) % (tickTime1D * tickTime1D);

    // Remove one mask rect at each tick
    svg.selectAll(`rect.mask-${i}-${j}`)
      .transition('window-sliding-mask')
      .delay(delay + 100)
      .duration(300)
      .style('opacity', 0);

    kernelGroupInput.attr('data-tick', newTick)
      .transition('window-sliding-input')
      .delay(delay)
      .duration(200)
      .attr('transform', `translate(${x}, ${y})`);

    kernelGroupResult.attr('data-tick', newTick)
      .transition('window-sliding-result')
      .delay(delay)
      .duration(200)
      .attr('transform', `translate(${xResult}, ${y})`)
      .on('end', () => {
        /* Uncomment to wrap the sliding
        if (newTick === 0) {
          svg.selectAll(`rect.mask-overlay`)
            .transition('window-sliding-mask')
            .delay(delay - 200)
            .duration(300)
            .style('opacity', 1);
        }
        */
        if (shouldIntermediateAnimate) {
          slidingAnimation();
        }
      });
  }
  slidingAnimation();
}

const animationButtonClicked = (curLayerIndex) => {
  if (d3.event !== null) {
    d3.event.stopPropagation();
  }
  
  let delay = 200;
  let tickTime1D = nodeLength / (kernelRectLength * 3);
  let stride = kernelRectLength * 3; 

  if (isEndOfAnimation) {
    // Start the animation
    shouldIntermediateAnimateStore.set(true);

    // Show kernel
    svg.selectAll('.kernel-clone')
      .transition()
      .duration(300)
      .style('opacity', 1)

    // Restore the mask
    svg.selectAll(`rect.mask-overlay`)
      .transition()
      .duration(300)
      .style('opacity', 1);

    // Start the intermediate animation
    for (let i  = 0; i < nodeCoordinate[curLayerIndex - 1].length; i++) {
      startIntermediateAnimation(d3.select(`.kernel-input-${i}`),
        d3.select(`.kernel-result-${i}`), tickTime1D, stride);
    }

    // Start the output animation
    startOutputAnimation(d3.select('.kernel-output'),
      tickTime1D, stride, delay, curLayerIndex);
    
    // Change the flow edge style
    svg.selectAll('path.flow-edge')
      .attr('stroke-dasharray', '4 2')
      .attr('stroke-dashoffset', 0)
      .each((d, i, g) => animateEdge(d, i, g, 0 - 1000));

    // Change button icon
    svg.select('.animation-control-button')
      .attr('xlink:href', 'PUBLIC_URL/assets/img/fast_forward.svg');
    
    isEndOfAnimation = false;

  } else {
    // End the animation
    shouldIntermediateAnimateStore.set(false);
    
    // Show all intermediate and output results
    svg.selectAll(`rect.mask-overlay`)
      .transition('skip')
      .duration(600)
      .style('opacity', 0);
    
    // Move kernel to the beginning to prepare for the next animation
    let kernelClones = svg.selectAll('.kernel-clone');
    kernelClones.attr('data-tick', 0)
      .transition('skip')
      .duration(300)
      .style('opacity', 0)
      .on('end', (d, i, g) => {
        let element = d3.select(g[i]);
        let originX = +element.attr('data-origin-x');
        let originY = +element.attr('data-origin-y');
        element.attr('transform', `translate(${originX}, ${originY})`);
      });
    
    // Change flow edge style
    svg.selectAll('path.flow-edge')
      .interrupt()
      .attr('stroke-dasharray', '0 0');
    
    // Change button icon
    svg.select('.animation-control-button')
      .attr('xlink:href', 'PUBLIC_URL/assets/img/redo.svg');
    
    isEndOfAnimation = true;
  }
}

const animateEdge = (d, i, g, dashoffset) => {
  let curPath = d3.select(g[i]);
  curPath.transition()
    .duration(60000)
    .ease(d3.easeLinear)
    .attr('stroke-dashoffset', dashoffset)
    .on('end', (d, i, g) => {
      if (shouldIntermediateAnimate) {
        animateEdge(d, i, g, dashoffset - 2000);
      }
    });
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
  
  // curRightX = rightStart;

  // Add the intermediate layer
  let intermediateLayer = svg.append('g')
    .attr('class', 'intermediate-layer')
    .style('opacity', 0);
  
  // Recovert the animation counter
  isEndOfAnimation = false;
  
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

  // Compute stride for the kernel animation
  let stride = kernelRectLength * 3; 

  // Also add the overlay mask on the output node
  let outputY = nodeCoordinate[curLayerIndex][i].y;
  let curNode = svg.select(`#layer-${curLayerIndex}-node-${i}`);
  let outputOverlayGroup = curNode.append('g')
    .attr('class', 'overlay-group')
    .attr('transform', `translate(${rightX}, ${outputY})`);

  let strideTime = Math.floor(nodeLength / stride);
  
  for (let i = 0; i < strideTime; i++) {
    for (let j = 0; j < strideTime; j++) {
      outputOverlayGroup.append('rect')
        .attr('class', `mask-overlay mask-${i}-${j}`)
        .attr('width', stride)
        .attr('height', stride)
        .attr('x', i * stride)
        .attr('y', j * stride)
        .style('fill', 'var(--light-gray)')
        .style('stroke', 'var(--light-gray)')
        .style('opacity', 1);
    }
  }

  // Make sure the bounding box is on top of other things
  curNode.select('rect.bounding').raise();

  // Add sliding kernel for the output node
  let kernelGroup = intermediateLayer.append('g')
    .attr('class', `kernel kernel-output kernel-clone`)
    .attr('transform', `translate(${rightX}, ${outputY})`);

  kernelGroup.append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', kernelRectLength * 3)
    .attr('height', kernelRectLength * 3)
    .attr('fill', 'none')
    .attr('stroke', intermediateColor);
  
  kernelGroup.attr('data-tick', 0)
    .attr('data-origin-x', rightX)
    .attr('data-origin-y', outputY);

  let delay = 200;
  let tickTime1D = nodeLength / (kernelRectLength * 3);

  startOutputAnimation(kernelGroup, tickTime1D, stride, delay, curLayerIndex);

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
      intermediateX1, n.y, ni, stride, intermediateNodeMouseOverHandler,
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
    // let tickTime1D = nodeLength / (kernelRectLength) - 2;
    let kernelRectX = leftX - kernelRectLength * 3 * 2;
    let kernelGroup = intermediateLayer.append('g')
      .attr('class', `kernel kernel-${ni}`)
      .attr('transform', `translate(${kernelRectX}, ${n.y})`);

    let weightText = 'Kernel weights: [';
    let f2 = d3.format('.2f');
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

        let sep = '';
        if (c === 0 && r == 0) { sep = ''; }
        else if (c === 0) { sep = '; '; }
        else { sep = ', '; }
        weightText = weightText.concat(sep, `${f2(kernelMatrix[r][c])}`);
      }
    }
    weightText = weightText.concat(']');

    kernelGroup.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', kernelRectLength * 3)
      .attr('height', kernelRectLength * 3)
      .attr('fill', 'none')
      .attr('stroke', intermediateColor);
    
    kernelGroup.style('pointer-events', 'all')
      .style('cursor', 'crosshair')
      .on('mouseover', () => {
        hoverInfoStore.set( {show: true, text: weightText} );
      })
      .on('mouseleave', () => {
        hoverInfoStore.set( {show: false, text: weightText} );
      })
      .on('click', () => {d3.event.stopPropagation()});

    // Sliding the kernel on the input channel and result channel at the same
    // time
    let kernelGroupInput = kernelGroup.clone(true)
      .style('pointer-events', 'none')
      .style('cursor', 'pointer')
      .classed('kernel-clone', true)
      .classed(`kernel-input-${ni}`, true);

    kernelGroupInput.style('opacity', 0.9)
      .selectAll('rect.kernel')
      .style('opacity', 0.7);

    kernelGroupInput.attr('transform', `translate(${leftX}, ${n.y})`)
      .attr('data-tick', 0)
      .attr('data-origin-x', leftX)
      .attr('data-origin-y', n.y);

    let kernelGroupResult = kernelGroup.clone(true)
      .style('pointer-events', 'none')
      .style('cursor', 'pointer')
      .classed('kernel-clone', true)
      .classed(`kernel-result-${ni}`, true);

    kernelGroupResult.style('opacity', 0.9)
      .selectAll('rect.kernel')
      .style('fill', 'none');

    kernelGroupResult.attr('transform',
      `translate(${intermediateX1}, ${n.y})`)
      .attr('data-origin-x', intermediateX1)
      .attr('data-origin-y', n.y);
    
    startIntermediateAnimation(kernelGroupInput, kernelGroupResult, tickTime1D,
      stride);
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
  
  symbolGroup.append('rect')
    .attr('x', -plusSymbolRadius)
    .attr('y', -plusSymbolRadius)
    .attr('width', 2 * plusSymbolRadius)
    .attr('height', 2 * plusSymbolRadius)
    .attr('rx', 3)
    .attr('ry', 3)
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
    symbolGroup.append('circle')
        .attr('cx', 0)
        .attr('cy', nodeLength / 2 + kernelRectLength)
        .attr('r', 4)
        .style('stroke', intermediateColor)
        .style('cursor', 'crosshair')
        .style('fill', gappedColorScale(layerColorScales.weight, kernelRange,
          d.bias, kernelColorGap))
        .on('mouseover', () => {
          hoverInfoStore.set( {show: true, text: `Bias: ${formater(d.bias)}`} );
        })
        .on('mouseleave', () => {
          hoverInfoStore.set( {show: false, text: `Bias: ${formater(d.bias)}`} );
        });

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
    symbolGroup.append('circle')
      .attr('cx', 0)
      .attr('cy', -nodeLength / 2 - kernelRectLength)
      .attr('r', 4)
      .style('stroke', intermediateColor)
      .style('cursor', 'crosshair')
      .style('fill', gappedColorScale(layerColorScales.weight, kernelRange,
        d.bias, kernelColorGap))
      .on('mouseover', () => {
        hoverInfoStore.set( {show: true, text: `Bias: ${formater(d.bias)}`} );
      })
      .on('mouseleave', () => {
        hoverInfoStore.set( {show: false, text: `Bias: ${formater(d.bias)}`} );
      });
    
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
    .attr('class', 'layer-intermediate-label layer-label')
    .attr('transform', () => {
      let x = intermediateX1 + nodeLength / 2;
      let y = (svgPaddings.top + vSpaceAroundGap) / 2 + 5;
      return `translate(${x}, ${y})`;
    })
    .classed('hidden', detailedMode)
    .append('text')
    .style('text-anchor', 'middle')
    .style('dominant-baseline', 'middle')
    .style('font-weight', 800)
    .style('opacity', '0.8')
    .text('intermediate');
  
  intermediateLayer.append('g')
    .attr('class', 'animation-control')
    .attr('transform', () => {
      let x = intermediateX1 + nodeLength / 2;
      let y = (svgPaddings.top + vSpaceAroundGap) / 2 - 4;
      return `translate(${x}, ${y})`;
    })
    .on('click', () => animationButtonClicked(curLayerIndex))
    .append('image')
    .attr('class', 'animation-control-button')
    .attr('xlink:href', 'PUBLIC_URL/assets/img/fast_forward.svg')
    .attr('x', 50)
    .attr('y', 0)
    .attr('height', 13)
    .attr('width', 13);

  // Draw the detailed model layer label
  intermediateLayer.append('g')
    .attr('class', 'layer-intermediate-label layer-detailed-label')
    .attr('transform', () => {
      let x = intermediateX1 + nodeLength / 2;
      let y = (svgPaddings.top + vSpaceAroundGap) / 2 - 5;
      return `translate(${x}, ${y})`;
    })
    .classed('hidden', !detailedMode)
    .append('text')
    .style('text-anchor', 'middle')
    .style('dominant-baseline', 'middle')
    .style('opacity', '0.7')
    .style('font-weight', 800)
    .append('tspan')
    .text('intermediate')
    .append('tspan')
    .style('font-size', '8px')
    .style('font-weight', 'normal')
    .attr('x', 0)
    .attr('dy', '1.5em')
    .text(`(${cnn[curLayerIndex][0].output.length},
      ${cnn[curLayerIndex][0].output[0].length},
      ${cnn[curLayerIndex].length})`);

  // Draw the edges
  let linkGen = d3.linkHorizontal()
    .x(d => d.x)
    .y(d => d.y);
  
  let edgeGroup = intermediateLayer.append('g')
    .attr('class', 'edge-group')
    .lower();
  
  let dashoffset = 0;

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
  let sliderX2, sliderY2, arrowSX2, arrowSY2, dr2, arrowTX2, arrowTY2;
  
  if (isFirstConv) {
    sliderX = leftX;
    sliderY = nodeCoordinate[curLayerIndex - 1][0].y + nodeLength +
      kernelRectLength * 3;
    arrowSX = leftX - 5;
    arrowSY = nodeCoordinate[curLayerIndex - 1][0].y + nodeLength +
      kernelRectLength * 3 + 5;
    dr = 20;

    sliderX2 = leftX;
      sliderY2 = nodeCoordinate[curLayerIndex - 1][1].y + nodeLength +
    kernelRectLength * 3;
    arrowSX2 = leftX - kernelRectLength * 3;
    arrowSY2 = nodeCoordinate[curLayerIndex - 1][1].y + nodeLength + 15;
    arrowTX2 = leftX - 13;
    arrowTY2 =  nodeCoordinate[curLayerIndex - 1][1].y + 15;
    dr2 = 35;
  } else {
    sliderX = leftX - 3 * kernelRectLength * 3;
    sliderY = nodeCoordinate[curLayerIndex - 1][0].y + nodeLength / 3;
    arrowSX = leftX - 2 * kernelRectLength * 3 - 5;
    arrowSY = nodeCoordinate[curLayerIndex - 1][0].y + nodeLength - 10;
    dr = 50;

    sliderX2 = leftX - 3 * kernelRectLength * 3;
    sliderY2 = nodeCoordinate[curLayerIndex - 1][2].y - 3;
    arrowTX2 = leftX - kernelRectLength * 3 - 4;
    arrowTY2 = nodeCoordinate[curLayerIndex - 1][2].y + kernelRectLength * 3 + 6;
    arrowSX2 = leftX - kernelRectLength * 3 - 13;
    arrowSY2 = nodeCoordinate[curLayerIndex - 1][2].y + 26;
    dr2 = 20;
  }

  let slideText = kernelAnnotation.append('text')
    .attr('x', sliderX)
    .attr('y', sliderY)
    .attr('class', 'annotation-text')
    .style('dominant-baseline', 'hanging')
    .style('text-anchor', isFirstConv ? 'start' : 'end');
  
  slideText.append('tspan')
    .style('dominant-baseline', 'hanging')
    .text('Slide kernel over input channel');

  slideText.append('tspan')
    .attr('x', sliderX)
    .attr('dy', '1em')
    .style('dominant-baseline', 'hanging')
    .text('to get intermediate result');

  // slideText.append('tspan')
  //   .attr('x', sliderX)
  //   .attr('dy', '1em')
  //   .style('dominant-baseline', 'hanging')
  //   .text('');

  slideText.append('tspan')
    .attr('x', sliderX)
    .attr('dy', '1.2em')
    .style('dominant-baseline', 'hanging')
    .style('font-weight', 700)
    .text('Click ');
  
  slideText.append('tspan')
    .style('dominant-baseline', 'hanging')
    .style('font-weight', 400)
    .text('to learn more')

  drawArrow({
    group: group,
    tx: leftX - 7,
    ty: nodeCoordinate[curLayerIndex - 1][0].y + nodeLength / 2,
    sx: arrowSX,
    sy: arrowSY,
    hFlip: !isFirstConv,
    dr: dr,
    marker: 'marker'
  });

  // Add kernel annotation
  let slideText2 = kernelAnnotation.append('text')
    .attr('x', sliderX2)
    .attr('y', sliderY2)
    .attr('class', 'annotation-text')
    .style('dominant-baseline', 'hanging')
    .style('text-anchor', isFirstConv ? 'start' : 'end');

  slideText2.append('tspan')
    .style('dominant-baseline', 'hanging')
    .text('Each input chanel');

  slideText2.append('tspan')
    .attr('x', sliderX)
    .attr('dy', '1em')
    .style('dominant-baseline', 'hanging')
    .text('gets a different kernel');

  slideText2.append('tspan')
    .attr('x', sliderX)
    .attr('dy', '1.3em')
    .style('font-weight', 700)
    .style('dominant-baseline', 'hanging')
    .text('Hover over ');

  slideText2.append('tspan')
    .style('font-weight', 400)
    .style('dominant-baseline', 'hanging')
    .text('to see value!')

  drawArrow({
    group: group,
    tx: arrowTX2,
    ty: arrowTY2,
    sx: arrowSX2,
    sy: arrowSY2,
    dr: dr2,
    hFlip: !isFirstConv,
    marker: 'marker'
  });


  // Add annotation for the sum operation
  let plusAnnotation = group.append('g')
    .attr('class', 'plus-annotation');
  
  let intermediateX2 = leftX + 2 * nodeLength + 2.5 * intermediateGap;
  let textX = intermediateX2;
  let textY = nodeCoordinate[curLayerIndex][i].y + nodeLength +
      kernelRectLength * 3;
  
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
    .style('dominant-baseline', 'hanging')
    .text('Add up all intermediate');
  
  plusText.append('tspan')
    .attr('x', textX)
    .attr('dy', '1em')
    .style('dominant-baseline', 'hanging')
    .text('results and then add bias');
  
  if (i === 9) {
    drawArrow({
      group: group,
      sx: intermediateX2 + 50,
      sy: nodeCoordinate[curLayerIndex][i].y - (nodeLength / 2 + kernelRectLength * 2),
      tx: intermediateX2 + 2 * plusSymbolRadius + 5,
      ty: nodeCoordinate[curLayerIndex][i].y + nodeLength / 2 - plusSymbolRadius,
      dr: 50,
      hFlip: false,
      marker: 'marker-alt'
    });
  } else {
    drawArrow({
      group: group,
      sx: intermediateX2 + 35,
      sy: nodeCoordinate[curLayerIndex][i].y + nodeLength + kernelRectLength * 2,
      tx: intermediateX2 + 2 * plusSymbolRadius + 5,
      ty: nodeCoordinate[curLayerIndex][i].y + nodeLength / 2 + plusSymbolRadius,
      dr: 30,
      hFlip: true,
      marker: 'marker-alt'
    });
  }

  // Add annotation for the bias
  let biasTextY = nodeCoordinate[curLayerIndex][i].y;
  if (i === 0) {
    biasTextY += nodeLength + 3 * kernelRectLength;
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
      .style('pointer-events', 'all')
      .style('cursor', 'pointer')
      .on('mouseover', intermediateNodeMouseOverHandler)
      .on('mouseleave', intermediateNodeMouseLeaveHandler)
      .on('click', (d, ni, g) => intermediateNodeClicked(d, ni, g,
        i, curLayerIndex));
      // .on('click', (d, i) => {console.log(i)});
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

  // Record the left x position for dynamic detial view positioning
  intermediateLayerPosition['conv_1_1'] = targetX + nodeLength;
  intermediateLayerPositionStore.set(intermediateLayerPosition);

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
    y: svgPaddings.top + vSpaceAroundGap * (10) + vSpaceAroundGap + 
      nodeLength * 10 - 25
  });

  drawIntermediateLayerLegend({
    legendHeight: 5,
    curLayerIndex: curLayerIndex,
    range: range,
    minMax: finalMinMax,
    group: intermediateLayer,
    width: 2 * nodeLength + intermediateGap,
    x: nodeCoordinate[curLayerIndex - 1][2].x,
    y: svgPaddings.top + vSpaceAroundGap * (10) + vSpaceAroundGap + 
      nodeLength * 10
  });

  drawIntermediateLayerLegend({
    legendHeight: 5,
    curLayerIndex: curLayerIndex,
    range: kernelRange,
    minMax: kernelMinMax,
    group: intermediateLayer,
    width: 2 * nodeLength + intermediateGap,
    x: targetX + nodeLength - (2 * nodeLength + intermediateGap),
    y: svgPaddings.top + vSpaceAroundGap * (10) + vSpaceAroundGap + 
      nodeLength * 10,
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

  // Record the left x position for dynamic detial view positioning
  intermediateLayerPosition['conv_1_2'] = targetX + nodeLength;
  intermediateLayerPositionStore.set(intermediateLayerPosition);

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
    y: svgPaddings.top + vSpaceAroundGap * (10) + vSpaceAroundGap + 
      nodeLength * 10
  });

  drawIntermediateLayerLegend({
    legendHeight: 5,
    curLayerIndex: curLayerIndex,
    range: kernelRange,
    minMax: kernelMinMax,
    group: intermediateLayer,
    width: 2 * nodeLength + intermediateGap,
    x: targetX + nodeLength - (2 * nodeLength + intermediateGap),
    y: svgPaddings.top + vSpaceAroundGap * (10) + vSpaceAroundGap + 
      nodeLength * 10,
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

  // Record the left x position for dynamic detial view positioning
  intermediateLayerPosition['conv_2_1'] = targetX + nodeLength;
  intermediateLayerPositionStore.set(intermediateLayerPosition);

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
    y: svgPaddings.top + vSpaceAroundGap * (10) + vSpaceAroundGap + 
      nodeLength * 10
  });

  drawIntermediateLayerLegend({
    legendHeight: 5,
    curLayerIndex: curLayerIndex,
    range: kernelRange,
    minMax: kernelMinMax,
    group: intermediateLayer,
    width: 2 * nodeLength + intermediateGap,
    x: targetX + nodeLength - (2 * nodeLength + intermediateGap),
    y: svgPaddings.top + vSpaceAroundGap * (10) + vSpaceAroundGap + 
      nodeLength * 10,
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

  // Record the left x position for dynamic detial view positioning
  intermediateLayerPosition['conv_2_2'] = leftX;
  intermediateLayerPositionStore.set(intermediateLayerPosition);

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
    y: svgPaddings.top + vSpaceAroundGap * (10) + vSpaceAroundGap + 
      nodeLength * 10
  });

  drawIntermediateLayerLegend({
    legendHeight: 5,
    curLayerIndex: curLayerIndex,
    range: kernelRange,
    minMax: kernelMinMax,
    group: intermediateLayer,
    width: 2 * nodeLength + intermediateGap,
    x: targetX + nodeLength - (2 * nodeLength + intermediateGap),
    y: svgPaddings.top + vSpaceAroundGap * (10) + vSpaceAroundGap + 
      nodeLength * 10,
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
