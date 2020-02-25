/* global d3 */

import {
  svgStore, vSpaceAroundGapStore, hSpaceAroundGapStore, cnnStore,
  nodeCoordinateStore, selectedScaleLevelStore, cnnLayerRangesStore,
  cnnLayerMinMaxStore
} from '../stores.js';
import {
  getOutputKnot, getInputKnot, gappedColorScale
} from './draw-utils.js';
import {
  drawIntermediateLayerLegend, moveLayerX, addOverlayGradient,
  drawArrow
} from './intermediate-utils.js';
import { overviewConfig } from '../config.js';

// Configs
const layerColorScales = overviewConfig.layerColorScales;
const nodeLength = overviewConfig.nodeLength;
const plusSymbolRadius = overviewConfig.plusSymbolRadius;
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
  let totalLength = (2 * nodeLength +
    5 * hSpaceAroundGap * gapRatio + pixelWidth);
  let leftX = nodeCoordinate[curLayerIndex][0].x - totalLength;
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
  
  intermediateLayerOverlay.selectAll('rect.overlay')
    .transition('move')
    .duration(800)
    .ease(d3.easeCubicInOut)
    .style('opacity', 1);

  // Add the intermediate layer
  let intermediateLayer = svg.append('g')
    .attr('class', 'intermediate-layer')
    .style('opacity', 0);
  
  let intermediateX1 = leftX + nodeLength + intermediateGap;
  let intermediateX2 = intermediateX1 + intermediateGap + pixelWidth;
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
        target: {x: intermediateX2,
          //nodeCoordinate[curLayerIndex][i].x - nodeLength,
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
    /*
    let meanOutput = d3.mean(cnn.flatten.slice(flattenLength * n,
      flattenLength * (n + 1)).map(d => d.output));
    let meanWeight= d3.mean(cnn.flatten.slice(flattenLength * n,
      flattenLength * (n + 1)).map(d => d.outputLinks[i].weight));
    meanValues.push({index: n, output: meanOutput, weight: meanWeight});
    */
   meanValues.push({index: n});
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
      // .style('fill', colorScale((v.output + range / 2) / range));
      .style('fill', '#E5E5E5');
    
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
      source: {x: leftX + nodeLength + 10,
        y: nodeCoordinate[curLayerIndex - 1][v.index].y + nodeLength / 2},
      target: {x: intermediateX1 - 3,
        y: topY + flattenLength * pixelHeight + middleGap * (vi + 1) +
          middleRectHeight * (vi + 0.5)},
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
      target: {x: intermediateX2,
      y: nodeCoordinate[curLayerIndex][i].y + nodeLength / 2},
      index: -1,
      name: `flatten-abstract-${v.index}-output`,
      // color: gappedColorScale(layerColorScales.weight, flattenRange,
      //   v.weight, 0.35),
      color: '#E5E5E5',
      weight: v.weight,
      width: 1,
      opacity: 1,
      class: `flatten-abstract-output`
    });
  })

  // Draw the plus operation symbol
  let symbolY = nodeCoordinate[curLayerIndex][i].y + nodeLength / 2;
  let symbolRectHeight = 1;
  let symbolGroup = intermediateLayer.append('g')
    .attr('class', 'plus-symbol')
    .attr('transform', `translate(${intermediateX2 + plusSymbolRadius}, ${symbolY})`);
  
  symbolGroup.append('rect')
    .attr('x', -plusSymbolRadius)
    .attr('y', -plusSymbolRadius)
    .attr('width', plusSymbolRadius * 2)
    .attr('height', plusSymbolRadius * 2)
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
      .attr('cy', nodeLength / 2)
      .attr('r', kernelRectLength * 1.5)
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
    symbolGroup.append('circle')
      .attr('cx', 0)
      .attr('cy', -nodeLength / 2 - 0.5 * kernelRectLength)
      .attr('r', kernelRectLength * 1.5)
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

  // Draw softmax operation symbol
  let softmaxWidth = 55;
  let softmaxX = ((totalLength - 2 * nodeLength - 2 * intermediateGap)
    - softmaxWidth) / 2 + intermediateX2 + plusSymbolRadius * 2;

  let softmaxSymbol = intermediateLayer.append('g')
    .attr('class', 'softmax-symbol')
    .attr('transform', `translate(${softmaxX}, ${symbolY})`)
    .style('pointer-event', 'all')
    .style('cursor', 'pointer');
  
  softmaxSymbol.append('rect')
    .attr('x', 0)
    .attr('y', -plusSymbolRadius)
    .attr('width', softmaxWidth)
    .attr('height', plusSymbolRadius * 2)
    .attr('stroke', intermediateColor)
    .attr('rx', 2)
    .attr('ry', 2)
    .attr('fill', '#FAFAFA');
  
  softmaxSymbol.append('text')
    .attr('x', 5)
    .attr('y', 1)
    .style('dominant-baseline', 'middle')
    .style('font-size', '12px')
    .style('opacity', 0.5)
    .text('softmax');

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
  
  // let textX = nodeCoordinate[curLayerIndex][i].x - 50;
  let textX = intermediateX2;
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
    textY -= 110;
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
    biasTextY += nodeLength + 2 * kernelRectLength;
    if (isSafari) { biasTextY += kernelRectLength; }
  } else {
    biasTextY -= 2 * kernelRectLength + 3;
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