/* global d3, SmoothScroll */

import {
  svgStore, vSpaceAroundGapStore, hSpaceAroundGapStore, cnnStore,
  nodeCoordinateStore, selectedScaleLevelStore, cnnLayerRangesStore,
  cnnLayerMinMaxStore, isInSoftmaxStore, softmaxDetailViewStore,
  hoverInfoStore, allowsSoftmaxAnimationStore, detailedModeStore
} from '../stores.js';
import {
  getOutputKnot, getInputKnot, gappedColorScale, getMidCoords
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
const classList = overviewConfig.classLists;
const formater = d3.format('.4f');

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

let isInSoftmax = undefined;
isInSoftmaxStore.subscribe( value => {isInSoftmax = value;} )

let allowsSoftmaxAnimation = undefined;
allowsSoftmaxAnimationStore.subscribe( value => {allowsSoftmaxAnimation = value;} )

let softmaxDetailViewInfo = undefined;
softmaxDetailViewStore.subscribe( value => {softmaxDetailViewInfo = value;} )

let hoverInfo = undefined;
hoverInfoStore.subscribe( value => {hoverInfo = value;} )

let detailedMode = undefined;
detailedModeStore.subscribe( value => {detailedMode = value;} )

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

let hasInitialized = false;
let logits = [];
let flattenFactoredFDict = {};

const moveLegend = (d, i, g, moveX, duration, restore) => {
  let legend = d3.select(g[i]);

  if (!restore) {
    let previousTransform = legend.attr('transform');
    let previousLegendX = +previousTransform.replace(/.*\(([\d\.]+),.*/, '$1');
    let previousLegendY = +previousTransform.replace(/.*,\s([\d\.]+)\)/, '$1');
  
    legend.transition('softmax')
      .duration(duration)
      .ease(d3.easeCubicInOut)
      .attr('transform', `translate(${previousLegendX - moveX}, ${previousLegendY})`);
    
    // If not in restore mode, we register the previous location to the DOM element
    legend.attr('data-preX', previousLegendX);
    legend.attr('data-preY', previousLegendY);
  } else {
    // Restore the recorded location
    let previousLegendX = +legend.attr('data-preX');
    let previousLegendY = +legend.attr('data-preY');

    legend.transition('softmax')
      .duration(duration)
      .ease(d3.easeCubicInOut)
      .attr('transform', `translate(${previousLegendX}, ${previousLegendY})`);
  }
}

const logitCircleMouseOverHandler = (i) => {
  // Update the hover info UI
  hoverInfoStore.set({
    show: true,
    text: `Logit: ${formater(logits[i])}`
  })

  // Highlight the text in the detail view
  softmaxDetailViewInfo.highlightI = i;
  softmaxDetailViewStore.set(softmaxDetailViewInfo);

  let logitLayer = svg.select('.logit-layer');
  let logitLayerLower = svg.select('.underneath');
  let intermediateLayer = svg.select('.intermediate-layer');

  // Highlight the circle
  logitLayer.select(`#logit-circle-${i}`)
    .style('stroke-width', 2);

  // Highlight the associated plus symbol
  intermediateLayer.select(`#plus-symbol-clone-${i}`)
    .style('opacity', 1)
    .select('circle')
    .style('fill', d => d.fill);
  
  // Raise the associated edge group
  logitLayerLower.select(`#logit-lower-${i}`).raise();

  // Highlight the associated edges
  logitLayerLower.selectAll(`.softmax-abstract-edge-${i}`)
    .style('stroke-width', 0.8)
    .style('stroke', '#E0E0E0');

  logitLayerLower.selectAll(`.softmax-edge-${i}`)
    .style('stroke-width', 1)
    .style('stroke', '#E0E0E0');
  
  logitLayerLower.selectAll(`.logit-output-edge-${i}`)
    .style('stroke-width', 3)
    .style('stroke', '#E0E0E0');

  logitLayer.selectAll(`.logit-output-edge-${i}`)
    .style('stroke-width', 3)
    .style('stroke', '#E0E0E0');
}

const logitCircleMouseLeaveHandler = (i) => {
  // screenshot
  // return;

  // Update the hover info UI
  hoverInfoStore.set({
    show: false,
    text: `Logit: ${formater(logits[i])}`
  })

  // Dehighlight the text in the detail view
  softmaxDetailViewInfo.highlightI = -1;
  softmaxDetailViewStore.set(softmaxDetailViewInfo);

  let logitLayer = svg.select('.logit-layer');
  let logitLayerLower = svg.select('.underneath');
  let intermediateLayer = svg.select('.intermediate-layer');

  // Restore the circle
  logitLayer.select(`#logit-circle-${i}`)
    .style('stroke-width', 1);

  // Restore the associated plus symbol
  intermediateLayer.select(`#plus-symbol-clone-${i}`)
    .style('opacity', 0.2);

  // Restore the associated edges
  logitLayerLower.selectAll(`.softmax-abstract-edge-${i}`)
    .style('stroke-width', 0.2)
    .style('stroke', '#EDEDED');

  logitLayerLower.selectAll(`.softmax-edge-${i}`)
    .style('stroke-width', 0.2)
    .style('stroke', '#F1F1F1');

  logitLayerLower.selectAll(`.logit-output-edge-${i}`)
    .style('stroke-width', 1.2)
    .style('stroke', '#E5E5E5');
  
  logitLayer.selectAll(`.logit-output-edge-${i}`)
    .style('stroke-width', 1.2)
    .style('stroke', '#E5E5E5');
}

// This function is binded to the detail view in Overview.svelte
export const softmaxDetailViewMouseOverHandler = (event) => {
  logitCircleMouseOverHandler(event.detail.curI);
}

// This function is binded to the detail view in Overview.svelte
export const softmaxDetailViewMouseLeaveHandler = (event) => {
  logitCircleMouseLeaveHandler(event.detail.curI);
}

const drawLogitLayer = (arg) => {
  let curLayerIndex = arg.curLayerIndex,
    moveX = arg.moveX,
    softmaxLeftMid = arg.softmaxLeftMid,
    selectedI = arg.selectedI,
    intermediateX1 = arg.intermediateX1,
    intermediateX2 = arg.intermediateX2,
    pixelWidth = arg.pixelWidth,
    pixelHeight = arg.pixelHeight,
    topY = arg.topY,
    bottomY = arg.bottomY,
    softmaxX = arg.softmaxX,
    middleGap = arg.middleGap,
    middleRectHeight = arg.middleRectHeight,
    symbolGroup = arg.symbolGroup,
    symbolX = arg.symbolX,
    flattenRange = arg.flattenRange;

  let logitLayer = svg.select('.intermediate-layer')
    .append('g')
    .attr('class', 'logit-layer')
    .raise();
  
  // Minotr layer ordering change
  let tempClone = svg.select('.intermediate-layer')
    .select('.flatten-layer')
    .select('.plus-symbol')
    .clone(true)
    .attr('class', 'temp-clone-plus-symbol')
    .attr('transform', `translate(${symbolX - moveX},
      ${nodeCoordinate[curLayerIndex][selectedI].y + nodeLength / 2})`)
    // Cool hack -> d3 clone doesnt clone events, make the front object pointer
    // event transparent so users can trigger the underlying object's event!
    .style('pointer-events', 'none')
    .remove();

  let tempPlusSymbol = logitLayer.append(() => tempClone.node());
  
  svg.select('.softmax-symbol').raise();

  let logitLayerLower = svg.select('.underneath')
    .append('g')
    .attr('class', 'logit-layer-lower')
    .lower();
  
  // Use circles to encode logit values
  let centerX = softmaxLeftMid - moveX * 4 / 5;

  // Get all logits
  logits = [];
  for (let i = 0; i < cnn[layerIndexDict['output']].length; i++) {
    logits.push(cnn[layerIndexDict['output']][i].logit);
  }

  // Construct a color scale for the logit values
  let logitColorScale = d3.scaleLinear()
    .domain(d3.extent(logits))
    .range([0.2, 1]);
  
  // Draw the current logit circle before animation
  let logitRadius = 8;
  logitLayer.append('circle')
    .attr('class', 'logit-circle')
    .attr('id', `logit-circle-${selectedI}`)
    .attr('cx', centerX)
    .attr('cy', nodeCoordinate[curLayerIndex - 1][selectedI].y + nodeLength / 2)
    .attr('r', logitRadius)
    .style('fill', layerColorScales.logit(logitColorScale(logits[selectedI])))
    .style('cursor', 'crosshair')
    .style('pointer-events', 'all')
    .style('stroke', intermediateColor)
    .on('mouseover', () => logitCircleMouseOverHandler(selectedI))
    .on('mouseleave', () => logitCircleMouseLeaveHandler(selectedI))
    .on('click', () => { d3.event.stopPropagation() });
  
  // Show the logit circle corresponding label
  let softmaxDetailAnnotation = svg.select('.intermediate-layer-annotation')
    .select('.softmax-detail-annoataion');

  softmaxDetailAnnotation.select(`#logit-text-${selectedI}`)
    .style('opacity', 1);

  tempPlusSymbol.raise();

  // Draw another line from plus symbol to softmax symbol
  logitLayer.append('line')
    .attr('class', `logit-output-edge-${selectedI}`)
    .attr('x1', intermediateX2 - moveX + plusSymbolRadius * 2)
    .attr('x2', softmaxX)
    .attr('y1', nodeCoordinate[curLayerIndex - 1][selectedI].y + nodeLength / 2)
    .attr('y2', nodeCoordinate[curLayerIndex - 1][selectedI].y + nodeLength / 2)
    .style('fill', 'none')
    .style('stroke', '#EAEAEA')
    .style('stroke-width', '1.2')
    .lower();

  // Add the flatten to logit links
  let linkData = [];
  let flattenLength = cnn.flatten.length / cnn[1].length;
  let underneathIs = [...Array(cnn[layerIndexDict['output']].length).keys()]
    .filter(d => d != selectedI);
  let curIIndex = 0;
  let linkGen = d3.linkHorizontal()
    .x(d => d.x)
    .y(d => d.y);

  const drawOneEdgeGroup = () => {
    // Only draw the new group if it is in the softmax mode
    if (!allowsSoftmaxAnimation) {
      svg.select('.underneath')
        .selectAll(`.logit-lower`)
        .remove();
      return;
    }

    let curI = underneathIs[curIIndex];

    let curEdgeGroup = svg.select('.underneath')
      .select(`#logit-lower-${curI}`);
    
    if (curEdgeGroup.empty()) {
      curEdgeGroup = svg.select('.underneath')
        .append('g')
        .attr('class', 'logit-lower')
        .attr('id', `logit-lower-${curI}`)
        .style('opacity', 0);

      // Hack: now show all edges, only draw 1/3 of the actual edges
      for (let f = 0; f < flattenLength; f += 3) {
        let loopFactors = [0, 9];
        loopFactors.forEach(l => {
          let factoredF = f + l * flattenLength;
    
          // Flatten -> output
          linkData.push({
            source: {x: intermediateX1 + pixelWidth + 3 - moveX,
              y:  l === 0 ? topY + f * pixelHeight : bottomY + f * pixelHeight},
            target: {x: intermediateX2 - moveX,
              y: nodeCoordinate[curLayerIndex][curI].y + nodeLength / 2},
            index: factoredF,
            weight: cnn.flatten[factoredF].outputLinks[curI].weight,
            color: '#F1F1F1',
            width: 0.5,
            opacity: 1,
            class: `softmax-edge-${curI}`
          });
        });
      }

      // Draw middle rect to logits
      for (let vi = 0; vi < cnn[layerIndexDict['output']].length - 2; vi++) {
        linkData.push({
          source: {x: intermediateX1 + pixelWidth + 3 - moveX,
            y: topY + flattenLength * pixelHeight + middleGap * (vi + 1) +
            middleRectHeight * (vi + 0.5)},
          target: {x: intermediateX2 - moveX,
            y: nodeCoordinate[curLayerIndex][curI].y + nodeLength / 2},
          index: -1,
          color: '#EDEDED',
          width: 0.5,
          opacity: 1,
          class: `softmax-abstract-edge-${curI}`
        });
      }

      // Render the edges on the underneath layer
      curEdgeGroup.selectAll(`path.softmax-edge-${curI}`)
        .data(linkData)
        .enter()
        .append('path')
        .attr('class', d => d.class)
        .attr('id', d => `edge-${d.name}`)
        .attr('d', d => linkGen({source: d.source, target: d.target}))
        .style('fill', 'none')
        .style('stroke-width', d => d.width)
        .style('stroke', d => d.color === undefined ? intermediateColor : d.color)
        .style('opacity', d => d.opacity)
        .style('pointer-events', 'none');
    }
    
    let curNodeGroup = logitLayer.append('g')
      .attr('class', `logit-layer-${curI}`)
      .style('opacity', 0);
    
    // Draw the plus symbol
    let symbolClone = symbolGroup.clone(true)
      .style('opacity', 0);

    // Change the style of the clone
    symbolClone.attr('class', 'plus-symbol-clone')
      .attr('id', `plus-symbol-clone-${curI}`)
      .select('circle')
      .datum({fill: gappedColorScale(layerColorScales.weight,
        flattenRange, cnn[layerIndexDict['output']][curI].bias, 0.35)})
      .style('pointer-events', 'none')
      .style('fill', '#E5E5E5');

    symbolClone.attr('transform', `translate(${symbolX},
      ${nodeCoordinate[curLayerIndex][curI].y + nodeLength / 2})`);
    
    // Draw the outter link using only merged path
    let outputEdgeD1 = linkGen({
      source: {
        x: intermediateX2 - moveX + plusSymbolRadius * 2,
        y: nodeCoordinate[curLayerIndex][curI].y + nodeLength / 2
      },
      target: {
        x: centerX + logitRadius,
        y: nodeCoordinate[curLayerIndex][curI].y + nodeLength / 2
      }
    });

    let outputEdgeD2 = linkGen({
      source: {
        x: centerX + logitRadius,
        y: nodeCoordinate[curLayerIndex][curI].y + nodeLength / 2
      },
      target: {
        x: softmaxX,
        y: nodeCoordinate[curLayerIndex][selectedI].y + nodeLength / 2
      }
    });

    // There are ways to combine these two paths into one. However, the animation
    // for merged path is not continuous, so we use two saperate paths here.

    let outputEdge1 = logitLayerLower.append('path')
      .attr('class', `logit-output-edge-${curI}`)
      .attr('d', outputEdgeD1)
      .style('fill', 'none')
      .style('stroke', '#EAEAEA')
      .style('stroke-width', '1.2');

    let outputEdge2 = logitLayerLower.append('path')
      .attr('class', `logit-output-edge-${curI}`)
      .attr('d', outputEdgeD2)
      .style('fill', 'none')
      .style('stroke', '#EAEAEA')
      .style('stroke-width', '1.2');
    
    let outputEdgeLength1 = outputEdge1.node().getTotalLength();
    let outputEdgeLength2 = outputEdge2.node().getTotalLength();
    let totalLength = outputEdgeLength1 + outputEdgeLength2;
    let totalDuration = hasInitialized ? 500 : 800;
    let opacityDuration = hasInitialized ? 400 : 600;

    outputEdge1.attr('stroke-dasharray', outputEdgeLength1 + ' ' + outputEdgeLength1)
      .attr('stroke-dashoffset', outputEdgeLength1);
    
    outputEdge2.attr('stroke-dasharray', outputEdgeLength2 + ' ' + outputEdgeLength2)
      .attr('stroke-dashoffset', outputEdgeLength2);

    outputEdge1.transition('softmax-output-edge')
      .duration(outputEdgeLength1 / totalLength * totalDuration)
      .attr('stroke-dashoffset', 0);

    outputEdge2.transition('softmax-output-edge')
      .delay(outputEdgeLength1 / totalLength * totalDuration)
      .duration(outputEdgeLength2 / totalLength * totalDuration)
      .attr('stroke-dashoffset', 0);
    
    // Draw the logit circle
    curNodeGroup.append('circle')
      .attr('class', 'logit-circle')
      .attr('id', `logit-circle-${curI}`)
      .attr('cx', centerX)
      .attr('cy', nodeCoordinate[curLayerIndex - 1][curI].y + nodeLength / 2)
      .attr('r', 7)
      .style('fill', layerColorScales.logit(logitColorScale(logits[curI])))
      .style('stroke', intermediateColor)
      .style('cursor', 'crosshair')
      .on('mouseover', () => logitCircleMouseOverHandler(curI))
      .on('mouseleave', () => logitCircleMouseLeaveHandler(curI))
      .on('click', () => { d3.event.stopPropagation() });
    
    // Show the element in the detailed view
    softmaxDetailViewInfo.startAnimation = {
      i: curI,
      duration: opacityDuration,
      // Always show the animation
      hasInitialized: false
    };
    softmaxDetailViewStore.set(softmaxDetailViewInfo);

    // Show the elements with animation    
    curNodeGroup.transition('softmax-edge')
      .duration(opacityDuration)
      .style('opacity', 1);

    if ((selectedI < 3 && curI == 9) || (selectedI >= 3 && curI == 0)) {
      // Show the hover text
      softmaxDetailAnnotation.select('.softmax-detail-hover-annotation')
        .transition('softmax-edge')
        .duration(opacityDuration)
        .style('opacity', 1);
    }

    softmaxDetailAnnotation.select(`#logit-text-${curI}`)
      .transition('softmax-edge')
      .duration(opacityDuration)
      .style('opacity', 1);
    
    curEdgeGroup.transition('softmax-edge')
      .duration(opacityDuration)
      .style('opacity', 1)
      .on('end', () => {
        // Recursive animaiton
        curIIndex ++;
        if (curIIndex < underneathIs.length) {
          linkData = [];
          drawOneEdgeGroup();
        } else {
          hasInitialized = true;
          softmaxDetailViewInfo.hasInitialized = true;
          softmaxDetailViewStore.set(softmaxDetailViewInfo);
        }
      });
    
    symbolClone.transition('softmax-edge')
      .duration(opacityDuration)
      .style('opacity', 0.2);
  }

  // Show the softmax detail view
  let anchorElement = svg.select('.intermediate-layer')
    .select('.layer-label').node();
  let pos = getMidCoords(svg, anchorElement);
  let wholeSvg = d3.select('#cnn-svg');
  let svgYMid = +wholeSvg.style('height').replace('px', '') / 2;
  let detailViewTop = 100 + svgYMid - 192 / 2;

  const detailview = document.getElementById('detailview');
  detailview.style.top = `${detailViewTop}px`;
  detailview.style.left = `${pos.left - 490 - 50}px`;
  detailview.style.position = 'absolute';

  softmaxDetailViewStore.set({
    show: true,
    logits: logits,
    logitColors: logits.map(d => layerColorScales.logit(logitColorScale(d))),
    selectedI: selectedI,
    highlightI: -1,
    outputName: classList[selectedI],
    outputValue: cnn[layerIndexDict['output']][selectedI].output,
    startAnimation: {i: -1, duration: 0, hasInitialized: hasInitialized}
  })

  drawOneEdgeGroup();

  // Draw logit circle color scale
  drawIntermediateLayerLegend({
    legendHeight: 5,
    curLayerIndex: curLayerIndex,
    range: d3.extent(logits)[1] - d3.extent(logits)[0],
    minMax: {min: d3.extent(logits)[0], max: d3.extent(logits)[1]},
    group: logitLayer,
    width: softmaxX - (intermediateX2 + plusSymbolRadius * 2 - moveX + 5),
    gradientAppendingName: 'flatten-logit-gradient',
    gradientGap: 0.1,
    colorScale: layerColorScales.logit,
    x: intermediateX2 + plusSymbolRadius * 2 - moveX + 5,
    y: svgPaddings.top + vSpaceAroundGap * (10) + vSpaceAroundGap + 
      nodeLength * 10
  });

  // Draw logit layer label
  let logitLabel = logitLayer.append('g')
    .attr('class', 'layer-label')
    .classed('hidden', detailedMode)
    .attr('transform', () => {
      let x = centerX;
      let y = (svgPaddings.top + vSpaceAroundGap) / 2 + 5;
      return `translate(${x}, ${y})`;
    });

  logitLabel.append('text')
    .style('text-anchor', 'middle')
    .style('dominant-baseline', 'middle')
    .style('opacity', 0.8)
    .style('font-weight', 800)
    .text('logit');
}

const removeLogitLayer = () => {
  svg.select('.logit-layer').remove();
  svg.select('.logit-layer-lower').remove();
  svg.selectAll('.plus-symbol-clone').remove();

  // Instead of removing the paths, we hide them, so it is faster to load in
  // the future
  svg.select('.underneath')
    .selectAll('.logit-lower')
    .style('opacity', 0);

  softmaxDetailViewStore.set({
      show: false,
      logits: []
  })
}

const softmaxClicked = (arg) => {
  let curLayerIndex = arg.curLayerIndex,
    moveX = arg.moveX,
    symbolX = arg.symbolX,
    symbolY = arg.symbolY,
    outputX = arg.outputX,
    outputY = arg.outputY,
    softmaxLeftMid = arg.softmaxLeftMid,
    selectedI = arg.selectedI,
    intermediateX1 = arg.intermediateX1,
    intermediateX2 = arg.intermediateX2,
    pixelWidth = arg.pixelWidth,
    pixelHeight = arg.pixelHeight,
    topY = arg.topY,
    bottomY = arg.bottomY,
    middleGap = arg.middleGap,
    middleRectHeight = arg.middleRectHeight,
    softmaxX = arg.softmaxX,
    softmaxTextY = arg.softmaxTextY,
    softmaxWidth = arg.softmaxWidth,
    symbolGroup = arg.symbolGroup,
    flattenRange = arg.flattenRange;

  let duration = 600;
  let centerX = softmaxLeftMid - moveX * 4 / 5;
  d3.event.stopPropagation();

  // Clean up the logit elemends before moving anything
  if (isInSoftmax) {
    allowsSoftmaxAnimationStore.set(false);
    removeLogitLayer();
  } else {
    allowsSoftmaxAnimationStore.set(true);
  }

  // Move the overlay gradient
  svg.select('.intermediate-layer-overlay')
    .select('rect.overlay')
    .transition('softmax')
    .ease(d3.easeCubicInOut)
    .duration(duration)
    .attr('transform', `translate(${isInSoftmax ? 0 : -moveX}, ${0})`);

  // Move the legends
  svg.selectAll(`.intermediate-legend-${curLayerIndex - 1}`)
    .each((d, i, g) => moveLegend(d, i, g, moveX, duration, isInSoftmax));

  svg.select('.intermediate-layer')
    .select(`.layer-label`)
    .each((d, i, g) => moveLegend(d, i, g, moveX, duration, isInSoftmax));

  svg.select('.intermediate-layer')
    .select(`.layer-detailed-label`)
    .each((d, i, g) => moveLegend(d, i, g, moveX, duration, isInSoftmax));

  // Also move all layers on the left
  for (let i = curLayerIndex - 1; i >= 0; i--) {
    let curLayer = svg.select(`g#cnn-layer-group-${i}`);
    let previousX = +curLayer.select('image').attr('x');
    let newX = isInSoftmax ? previousX + moveX : previousX - moveX;
    moveLayerX({
      layerIndex: i,
      targetX: newX,
      disable: true,
      delay: 0,
      transitionName: 'softmax',
      duration: duration
    });
  }

  // Hide the sum up annotation
  svg.select('.plus-annotation')
    .transition('softmax')
    .duration(duration)
    .style('opacity', isInSoftmax ? 1 : 0)
    .style('pointer-events', isInSoftmax ? 'all' : 'none');

  // Hide the softmax annotation
  let softmaxAnnotation = svg.select('.softmax-annotation')
    .style('pointer-events', isInSoftmax ? 'all' : 'none');
  
  let softmaxDetailAnnotation = softmaxAnnotation.selectAll('.softmax-detail-annoataion')
    .data([0])
    .enter()
    .append('g')
    .attr('class', 'softmax-detail-annoataion');

  // Remove the detailed annoatioan when quitting the detail view
  if (isInSoftmax) {
    softmaxAnnotation.selectAll('.softmax-detail-annoataion').remove();
  }

  softmaxAnnotation.select('.arrow-group')
    .transition('softmax')
    .duration(duration)
    .style('opacity', isInSoftmax ? 1 : 0);

  softmaxAnnotation.select('.annotation-text')
    .style('cursor', 'help')
    .style('pointer-events', 'all')
    .on('click', () => {
      d3.event.stopPropagation();
      // Scroll to the article element
      document.querySelector(`#article-softmax`).scrollIntoView({ 
        behavior: 'smooth' 
      });
    })
    .transition('softmax')
    .duration(duration)
    .style('opacity', isInSoftmax ? 1 : 0)
    .on('end', () => {
      if (!isInSoftmax) {
        // Add new annotation for the softmax button
        let textX = softmaxX + softmaxWidth / 2;
        let textY = softmaxTextY - 10;

        if (selectedI === 0) {
          textY = softmaxTextY + 70;
        }

        let text = softmaxDetailAnnotation.append('text')
          .attr('x', textX)
          .attr('y', textY)
          .attr('class', 'annotation-text softmax-detail-text')
          .style('dominant-baseline', 'baseline')
          .style('text-anchor', 'middle')
          .text('Normalize ');
        
        text.append('tspan') 
          .attr('dx', 1)
          .style('fill', '#E56014')
          .text('logits');
        
        text.append('tspan')
          .attr('dx', 1)
          .text(' into');

        text.append('tspan')
          .attr('x', textX)
          .attr('dy', '1.1em')
          .text('class probabilities');

        if (selectedI === 0) {
          drawArrow({
            group: softmaxDetailAnnotation,
            sx: softmaxX + softmaxWidth / 2 - 5,
            sy: softmaxTextY + 44,
            tx: softmaxX + softmaxWidth / 2,
            ty: textY - 12,
            dr: 50,
            hFlip: true,
            marker: 'marker-alt'
          });
        } else {
          drawArrow({
            group: softmaxDetailAnnotation,
            sx: softmaxX + softmaxWidth / 2 - 5,
            sy: softmaxTextY + 4,
            tx: softmaxX + softmaxWidth / 2,
            ty: symbolY - plusSymbolRadius - 4,
            dr: 50,
            hFlip: true,
            marker: 'marker-alt'
          });
        }

        // Add annotation for the logit layer label
        textX = centerX + 45;
        textY = (svgPaddings.top + vSpaceAroundGap) / 2 + 5;
        let arrowTX = centerX + 20;
        let arrowTY = (svgPaddings.top + vSpaceAroundGap) / 2 + 5;

        softmaxDetailAnnotation.append('g')
          .attr('class', 'layer-detailed-label')
          .attr('transform', () => {
            let x = centerX;
            let y = (svgPaddings.top + vSpaceAroundGap) / 2 - 5;
            return `translate(${x}, ${y})`;
          })
          .classed('hidden', !detailedMode)
          .append('text')
          // .attr('x', centerX)
          // .attr('y',  (svgPaddings.top + vSpaceAroundGap) / 2 - 6)
          .style('opacity', 0.7)
          .style('dominant-baseline', 'middle')
          .style('font-size', '12px')
          .style('font-weight', '800')
          .append('tspan')
          .attr('x', 0)
          .text('logit')
          .append('tspan')
          .attr('x', 0)
          .style('font-size', '8px')
          .style('font-weight', 'normal')
          .attr('dy', '1.5em')
          .text('(10)');

        softmaxDetailAnnotation.append('text')
          .attr('class', 'annotation-text')
          .attr('x', textX)
          .attr('y', (svgPaddings.top + vSpaceAroundGap) / 2 + 3)
          .style('text-anchor', 'start')
          .text('Before')
          .append('tspan')
          .attr('x', textX)
          .attr('dy', '1em')
          .text('normalization')


        drawArrow({
          group: softmaxDetailAnnotation,
          tx: arrowTX,
          ty: arrowTY,
          sx: textX - 6,
          sy: textY + 2,
          dr: 60,
          hFlip: false,
          marker: 'marker-alt'
        });

        softmaxDetailAnnotation.append('text')
          .attr('class', 'annotation-text')
          .attr('x', nodeCoordinate[layerIndexDict['output']][0].x - 35)
          .attr('y', (svgPaddings.top + vSpaceAroundGap) / 2 + 3)
          .style('text-anchor', 'end')
          .text('After')
          .append('tspan')
          .attr('x', nodeCoordinate[layerIndexDict['output']][0].x - 35)
          .attr('dy', '1em')
          .text('normalization')

        drawArrow({
          group: softmaxDetailAnnotation,
          tx: nodeCoordinate[layerIndexDict['output']][0].x - 8,
          ty: arrowTY,
          sx: nodeCoordinate[layerIndexDict['output']][0].x - 27,
          sy: textY + 2,
          dr: 60,
          hFlip: true,
          marker: 'marker-alt'
        });

        // Add annotation for the logit circle
        for (let i = 0; i < 10; i++) {
          softmaxDetailAnnotation.append('text')
            .attr('x', centerX)
            .attr('y', nodeCoordinate[curLayerIndex - 1][i].y + nodeLength / 2 + 8)
            .attr('class', 'annotation-text softmax-detail-text')
            .attr('id', `logit-text-${i}`)
            .style('text-anchor', 'middle')
            .style('dominant-baseline', 'hanging')
            .style('opacity', 0)
            .text(`${classList[i]}`);
        }

        let hoverTextGroup = softmaxDetailAnnotation.append('g')
          .attr('class', 'softmax-detail-hover-annotation')
          .style('opacity', 0);

        textX = centerX + 50;
        textY = nodeCoordinate[curLayerIndex - 1][0].y + nodeLength / 2;

        if (selectedI < 3) {
          textY = nodeCoordinate[curLayerIndex - 1][9].y + nodeLength / 2;
        }

        // Add annotation to prompt user to check the logit value
        let hoverText = hoverTextGroup.append('text')
          .attr('x', textX)
          .attr('y', textY)
          .attr('class', 'annotation-text softmax-detail-text softmax-hover-text')
          .style('text-anchor', 'start')
          .style('dominant-baseline', 'baseline')
          .append('tspan')
          .style('font-weight', 700)
          .style('dominant-baseline', 'baseline')
          .text(`Hover over `)
          .append('tspan')
          .style('font-weight', 400)
          .style('dominant-baseline', 'baseline')
          .text('to see');
        
        hoverText.append('tspan')
          .style('dominant-baseline', 'baseline')
          .attr('x', textX)
          .attr('dy', '1em')
          .text('its ');

        hoverText.append('tspan')
          .style('dominant-baseline', 'baseline')
          .attr('dx', 1)
          .style('fill', '#E56014')
          .text('logit');
        
        hoverText.append('tspan')
          .style('dominant-baseline', 'baseline')
          .attr('dx', 1)
          .text(' value');
        
        drawArrow({
          group: hoverTextGroup,
          tx: centerX + 15,
          ty: textY,
          sx: textX - 8,
          sy: textY + 2,
          dr: 60,
          hFlip: false
        });
      }
    })

  // Hide the annotation
  svg.select('.flatten-annotation')
    .transition('softmax')
    .duration(duration)
    .style('opacity', isInSoftmax ? 1 : 0)
    .style('pointer-events', isInSoftmax ? 'all' : 'none');

  // Move the left part of faltten layer elements
  let flattenLeftPart = svg.select('.flatten-layer-left');
  flattenLeftPart.transition('softmax')
    .duration(duration)
    .ease(d3.easeCubicInOut)
    .attr('transform', `translate(${isInSoftmax ? 0 : -moveX}, ${0})`)
    .on('end', () => {
      // Add the logit layer
      if (!isInSoftmax) {
        let logitArg = {
          curLayerIndex: curLayerIndex,
          moveX: moveX,
          softmaxLeftMid: softmaxLeftMid,
          selectedI: selectedI,
          intermediateX1: intermediateX1,
          intermediateX2: intermediateX2,
          pixelWidth: pixelWidth,
          pixelHeight: pixelHeight,
          topY: topY,
          bottomY: bottomY,
          middleGap: middleGap,
          middleRectHeight: middleRectHeight,
          softmaxX: softmaxX,
          symbolGroup: symbolGroup,
          symbolX: symbolX,
          flattenRange: flattenRange
        };
        drawLogitLayer(logitArg);
      }

      // Redraw the line from the plus symbol to the output node
      if (!isInSoftmax) {
        let newLine = flattenLeftPart.select('.edge-group')
          .append('line')
          .attr('class', 'symbol-output-line')
          .attr('x1', symbolX)
          .attr('y1', symbolY)
          .attr('x2', outputX + moveX)
          .attr('y2', outputY)
          .style('stroke-width', 1.2)
          .style('stroke', '#E5E5E5')
          .style('opacity', 0);
        
        newLine.transition('softmax')
          .delay(duration / 3)
          .duration(duration * 2 / 3)
          .style('opacity', 1);
      } else {
        flattenLeftPart.select('.symbol-output-line').remove();
      }
      
      isInSoftmax = !isInSoftmax;
      isInSoftmaxStore.set(isInSoftmax);
    })
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
  svg.selectAll('.output-legend')
    .classed('hidden', false);

  let pixelWidth = nodeLength / 2;
  let pixelHeight = 1.1;
  let totalLength = (2 * nodeLength +
    5.5 * hSpaceAroundGap * gapRatio + pixelWidth);
  let leftX = nodeCoordinate[curLayerIndex][0].x - totalLength;
  let intermediateGap = (hSpaceAroundGap * gapRatio * 4) / 2;
  const minimumGap = 20;
  let linkGen = d3.linkHorizontal()
    .x(d => d.x)
    .y(d => d.y);

  // Hide the edges
  svg.select('g.edge-group')
    .style('visibility', 'hidden');

  // Move the previous layer
  moveLayerX({layerIndex: curLayerIndex - 1, targetX: leftX,
    disable: true, delay: 0});

  // Disable the current layer (output layer)
  moveLayerX({layerIndex: curLayerIndex,
    targetX: nodeCoordinate[curLayerIndex][0].x, disable: true,
    delay: 0, opacity: 0.15, specialIndex: i});
  
  // Compute the gap in the left shrink region
  let leftEnd = leftX - hSpaceAroundGap;
  let leftGap = (leftEnd - nodeCoordinate[0][0].x - 10 * nodeLength) / 10;

  // Different from other intermediate view, we push the left part dynamically
  // 1. If there is enough space, we fix the first layer position and move all
  // other layers;
  // 2. If there is not enough space, we maintain the minimum gap and push all
  // left layers to the left (could be out-of-screen)
  if (leftGap > minimumGap) {
    // Move the left layers
    for (let i = 0; i < curLayerIndex - 1; i++) {
      let curX = nodeCoordinate[0][0].x + i * (nodeLength + leftGap);
      moveLayerX({layerIndex: i, targetX: curX, disable: true, delay: 0});
    }
  } else {
    leftGap = minimumGap;
    let curLeftBound = leftX - leftGap * 2 - nodeLength;
    // Move the left layers
    for (let i = curLayerIndex - 2; i >= 0; i--) {
      moveLayerX({layerIndex: i, targetX: curLeftBound, disable: true, delay: 0});
      curLeftBound = curLeftBound - leftGap - nodeLength;
    }
  }

  // Add an overlay
  let stops = [{offset: '0%', color: 'rgb(250, 250, 250)', opacity: 1},
    {offset: '50%', color: 'rgb(250, 250, 250)', opacity: 0.95},
    {offset: '100%', color: 'rgb(250, 250, 250)', opacity: 0.85}];
  addOverlayGradient('overlay-gradient-left', stops);

  let intermediateLayerOverlay = svg.append('g')
    .attr('class', 'intermediate-layer-overlay');

  intermediateLayerOverlay.append('rect')
    .attr('class', 'overlay')
    .style('fill', 'url(#overlay-gradient-left)')
    .style('stroke', 'none')
    .attr('width', leftX + svgPaddings.left - (leftGap * 2) + 3)
    .attr('height', height + svgPaddings.top + svgPaddings.bottom)
    .attr('x', -svgPaddings.left)
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
  
  let flattenLayerLeftPart = flattenLayer.append('g')
    .attr('class', 'flatten-layer-left');
  
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
    // Screenshot
    // console.log(index);

    // Update the hover info UI
    if (d.weight === undefined) {
      hoverInfo = {
        show: true,
        text: `Pixel value: ${formater(flattenFactoredFDict[index])}`
      };
    } else {
      hoverInfo = {
        show: true,
        text: `Weight: ${formater(d.weight)}`
      };
    }
    hoverInfoStore.set(hoverInfo);

    flattenLayerLeftPart.select(`#edge-flatten-${index}`)
      .raise()
      .style('stroke', intermediateColor)
      .style('stroke-width', 1);

    flattenLayerLeftPart.select(`#edge-flatten-${index}-output`)
      .raise()
      .style('stroke-width', 1)
      .style('stroke', da => gappedColorScale(layerColorScales.weight,
        flattenRange, da.weight, 0.1));

    flattenLayerLeftPart.select(`#bounding-${index}`)
      .raise()
      .style('opacity', 1);
  }

  let flattenMouseLeaveHandler = (d) => {
    let index = d.index;

    // screenshot
    // if (index === 32) {return;}

    // Update the hover info UI
    if (d.weight === undefined) {
      hoverInfo = {
        show: false,
        text: `Pixel value: ${formater(flattenFactoredFDict[index])}`
      };
    } else {
      hoverInfo = {
        show: false,
        text: `Weight: ${formater(d.weight)}`
      };
    }
    hoverInfoStore.set(hoverInfo);

    flattenLayerLeftPart.select(`#edge-flatten-${index}`)
      .style('stroke-width', 0.6)
      .style('stroke', '#E5E5E5')

    flattenLayerLeftPart.select(`#edge-flatten-${index}-output`)
      .style('stroke-width', 0.6)
      .style('stroke', da => gappedColorScale(layerColorScales.weight,
        flattenRange, da.weight, 0.35));

    flattenLayerLeftPart.select(`#bounding-${index}`)
      .raise()
      .style('opacity', 0);
  }

  flattenFactoredFDict = {};
  for (let f = 0; f < flattenLength; f++) {
    let loopFactors = [0, 9];
    loopFactors.forEach(l => {
      let factoredF = f + l * flattenLength;
      flattenFactoredFDict[factoredF] = cnn.flatten[factoredF].output;
      flattenLayerLeftPart.append('rect')
        .attr('x', intermediateX1)
        .attr('y', l === 0 ? topY + f * pixelHeight : bottomY + f * pixelHeight)
        .attr('width', pixelWidth)
        .attr('height', pixelHeight)
        .style('cursor', 'crosshair')
        .style('fill', colorScale((cnn.flatten[factoredF].output + range / 2) / range))
        .on('mouseover', () => flattenMouseOverHandler({index: factoredF}))
        .on('mouseleave', () => flattenMouseLeaveHandler({index: factoredF}))
        .on('click', () => { d3.event.stopPropagation() });

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
      flattenLayerLeftPart.append('rect')
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
        .style('cursor', 'crosshair')
        .style('opacity', 0)
        .on('mouseover', () => flattenMouseOverHandler({index: factoredF}))
        .on('mouseleave', () => flattenMouseLeaveHandler({index: factoredF}))
        .on('click', () => {d3.event.stopPropagation()});
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
    flattenLayerLeftPart.append('rect')
      .attr('x', intermediateX1 + pixelWidth / 4)
      .attr('y', topY + flattenLength * pixelHeight + middleGap * (vi + 1) +
        middleRectHeight * vi)
      .attr('width', pixelWidth / 2)
      .attr('height', middleRectHeight)
      // .style('fill', colorScale((v.output + range / 2) / range));
      .style('fill', '#E5E5E5');
    
    // Add a triangle next to the input node
    flattenLayerLeftPart.append('polyline')
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
  let symbolX = intermediateX2 + plusSymbolRadius;
  let symbolY = nodeCoordinate[curLayerIndex][i].y + nodeLength / 2;
  let symbolRectHeight = 1;
  let symbolGroup = flattenLayerLeftPart.append('g')
    .attr('class', 'plus-symbol')
    .attr('transform', `translate(${symbolX}, ${symbolY})`);
  
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

  // Place the bias rectangle below the plus sign if user clicks the first
  // conv node (no need now, since we added annotaiton for softmax to make it
  // look better aligned)
  // Add bias symbol to the plus symbol
  symbolGroup.append('circle')
    .attr('cx', 0)
    .attr('cy', -nodeLength / 2 - 0.5 * kernelRectLength)
    .attr('r', kernelRectLength * 1.5)
    .style('stroke', intermediateColor)
    .style('cursor', 'crosshair')
    .style('fill', gappedColorScale(layerColorScales.weight,
        flattenRange, d.bias, 0.35))
    .on('mouseover', () => {
      hoverInfoStore.set( {show: true, text: `Bias: ${formater(d.bias)}`} );
    })
    .on('mouseleave', () => {
      hoverInfoStore.set( {show: false, text: `Bias: ${formater(d.bias)}`} );
    })
    .on('click', () => { d3.event.stopPropagation(); });
  
  // Link from bias to the plus symbol
  symbolGroup.append('path')
    .attr('d', linkGen({
      source: { x: 0, y: 0 },
      target: { x: 0, y: -nodeLength / 2 - 0.5 * kernelRectLength }
    }))
    .attr('id', 'bias-plus')
    .attr('stroke-width', 1.2)
    .attr('stroke', '#E5E5E5')
    .lower();

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
  let emptySpace = ((totalLength - 2 * nodeLength - 2 * intermediateGap)
    - softmaxWidth) / 2;
  let symbolEndX = intermediateX2 + plusSymbolRadius * 2;
  let softmaxX = emptySpace + symbolEndX;
  let softmaxLeftMid = emptySpace / 2 + symbolEndX;
  let softmaxTextY = nodeCoordinate[curLayerIndex][i].y - 2 * kernelRectLength - 6;
  let moveX = (intermediateX2 - (intermediateX1 + pixelWidth + 3)) * 2 / 3;

  let softmaxArg = {
    curLayerIndex: curLayerIndex,
    moveX: moveX,
    symbolX: symbolX,
    symbolY: symbolY,
    outputX: nodeCoordinate[curLayerIndex][i].x,
    outputY: symbolY,
    softmaxLeftMid: softmaxLeftMid,
    selectedI: i,
    intermediateX1: intermediateX1,
    intermediateX2: intermediateX2,
    pixelWidth: pixelWidth,
    pixelHeight: pixelHeight,
    topY: topY,
    bottomY: bottomY,
    middleGap: middleGap,
    middleRectHeight: middleRectHeight,
    softmaxX: softmaxX,
    softmaxWidth: softmaxWidth,
    softmaxTextY: softmaxTextY,
    symbolGroup: symbolGroup,
    flattenRange: flattenRange
  };

  let softmaxSymbol = intermediateLayer.append('g')
    .attr('class', 'softmax-symbol')
    .attr('transform', `translate(${softmaxX}, ${symbolY})`)
    .style('pointer-event', 'all')
    .style('cursor', 'pointer')
    .on('click', () => softmaxClicked(softmaxArg));
  
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
  let layerLabel = intermediateLayer.append('g')
    .attr('class', 'layer-label')
    .classed('hidden', detailedMode)
    .attr('transform', () => {
      let x = leftX + nodeLength + (4 * hSpaceAroundGap * gapRatio +
        pixelWidth) / 2;
      let y = (svgPaddings.top + vSpaceAroundGap) / 2 + 5;
      return `translate(${x}, ${y})`;
    })
    .style('cursor', 'help')
    .on('click', () => {
      d3.event.stopPropagation();
      // Scroll to the article element
      document.querySelector(`#article-flatten`).scrollIntoView({ 
        behavior: 'smooth' 
      });
    });
  
  layerLabel.append('text')
    .style('dominant-baseline', 'middle')
    .style('opacity', 0.8)
    .style('font-weight', 800)
    .text('flatten');

  let svgHeight = Number(d3.select('#cnn-svg').style('height').replace('px', '')) + 150;
  let scroll = new SmoothScroll('a[href*="#"]', {offset: -svgHeight});
    
  let detailedLabelGroup = intermediateLayer.append('g')
    .attr('transform', () => {
      let x = leftX + nodeLength + (4 * hSpaceAroundGap * gapRatio + pixelWidth) / 2;
      let y = (svgPaddings.top + vSpaceAroundGap) / 2 - 5;
      return `translate(${x}, ${y})`;
    })
    .attr('class', 'layer-detailed-label')
    .classed('hidden', !detailedMode)
    .style('cursor', 'help')
    .on('click', () => {
      d3.event.stopPropagation();
      // Scroll to the article element
      let anchor = document.querySelector(`#article-flatten`);
      scroll.animateScroll(anchor);
    });
  
  detailedLabelGroup.append('title')
    .text('Move to article section');

  let detailedLabelText = detailedLabelGroup.append('text')
    .style('text-anchor', 'middle')
    .style('dominant-baseline', 'middle')
    .style('opacity', '0.7')
    .style('font-weight', 800)
    .append('tspan')
    .text('flatten');
  
  let dimension = cnn[layerIndexDict['max_pool_2']].length * 
    cnn[layerIndexDict['max_pool_2']][0].output.length *
    cnn[layerIndexDict['max_pool_2']][0].output[0].length;

  detailedLabelText.append('tspan')
    .attr('x', 0)
    .attr('dy', '1.5em')
    .style('font-size', '8px')
    .style('font-weight', 'normal')
    .text(`(${dimension})`);

  // Add edges between nodes
  let edgeGroup = flattenLayerLeftPart.append('g')
    .attr('class', 'edge-group')
    .lower();
  
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
  
  edgeGroup.selectAll('path.flatten-abstract-output')
    .lower();

  edgeGroup.selectAll('path.flatten,path.flatten-output')
    .style('cursor', 'crosshair')
    .style('pointer-events', 'all')
    .on('mouseover', flattenMouseOverHandler)
    .on('mouseleave', flattenMouseLeaveHandler)
    .on('click', () => { d3.event.stopPropagation() });
  
  // Add legend
  drawIntermediateLayerLegend({
    legendHeight: 5,
    curLayerIndex: curLayerIndex,
    range: range,
    minMax: cnnLayerMinMax[10],
    group: intermediateLayer,
    width: intermediateGap + nodeLength - 3,
    x: leftX,
    y: svgPaddings.top + vSpaceAroundGap * (10) + vSpaceAroundGap + 
      nodeLength * 10
  });

  drawIntermediateLayerLegend({
    legendHeight: 5,
    curLayerIndex: curLayerIndex,
    range: flattenRange,
    minMax: {min: flattenExtent[0], max: flattenExtent[1]},
    group: intermediateLayer,
    width: intermediateGap - 3 - 5,
    gradientAppendingName: 'flatten-weight-gradient',
    gradientGap: 0.1,
    colorScale: layerColorScales.weight,
    x: leftX + intermediateGap + nodeLength + pixelWidth + 3,
    y: svgPaddings.top + vSpaceAroundGap * (10) + vSpaceAroundGap + 
      nodeLength * 10
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

  if (i == 9) {
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
    .style('dominant-baseline', 'hanging')
    .text('Add up all products');
  
  plusText.append('tspan')
    .attr('x', textX)
    .attr('dy', '1em')
    .style('dominant-baseline', 'hanging')
    .text('(');

  plusText.append('tspan')
    .style('fill', '#66a3c8')
    .style('dominant-baseline', 'hanging')
    .text('element');

  plusText.append('tspan')
    .style('dominant-baseline', 'hanging')
    .text(' × ');

  plusText.append('tspan')
    .style('dominant-baseline', 'hanging')
    .style('fill', '#b58946')
    .text('weight');

  plusText.append('tspan')
    .style('dominant-baseline', 'hanging')
    .text(')');

  plusText.append('tspan')
    .attr('x', textX)
    .attr('dy', '1em')
    .style('dominant-baseline', 'hanging')
    .text('and then ');

  plusText.append('tspan')
    .style('dominant-baseline', 'hanging')
    .style('fill', '#479d94')
    .text('bias');
  
  drawArrow({
    group: plusAnnotation,
    sx: intermediateX2 - 2 * plusSymbolRadius - 3,
    sy: arrowSY,
    tx: intermediateX2 - 5,
    ty: arrowTY,
    dr: 30,
    hFlip: i === 9,
    marker: 'marker-alt'
  });

  // Add annotation for the bias
  let biasTextY = nodeCoordinate[curLayerIndex][i].y;
  biasTextY -= 2 * kernelRectLength + 4;
  
  flattenLayerLeftPart.append('text')
    .attr('class', 'annotation-text')
    .attr('x', intermediateX2 + plusSymbolRadius)
    .attr('y', biasTextY)
    .style('text-anchor', 'middle')
    .style('dominant-baseline', 'baseline')
    .text('Bias');
  
  // Add annotation for the softmax symbol
  let softmaxAnnotation = intermediateLayerAnnotation.append('g')
    .attr('class', 'softmax-annotation');
  
  softmaxAnnotation.append('text')
    .attr('x', softmaxX + softmaxWidth / 2)
    .attr('y', softmaxTextY)
    .attr('class', 'annotation-text')
    .style('dominant-baseline', 'baseline')
    .style('text-anchor', 'middle')
    .style('font-weight', 700)
    .text('Click ')
    .append('tspan')
    .attr('dx', 1)
    .style('font-weight', 400)
    .text('to learn more');

  drawArrow({
    group: softmaxAnnotation,
    sx: softmaxX + softmaxWidth / 2 - 5,
    sy: softmaxTextY + 4,
    tx: softmaxX + softmaxWidth / 2,
    ty: symbolY - plusSymbolRadius - 4,
    dr: 50,
    hFlip: true
  });

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

  let tempTspan = flattenText.append('tspan')
    .style('dominant-baseline', 'hanging')
    .style('font-weight', 700)
    .text('Hover over ');
  
  tempTspan.append('tspan')
    .attr('dx', 1)
    .style('font-weight', 400)
    .style('dominant-baseline', 'hanging')
    .text('matrix to');
  
  flattenText.append('tspan')
    .style('dominant-baseline', 'hanging')
    .attr('x', textX)
    .attr('dy', '1em')
    .text('see how it is flattened');
  
  flattenText.append('tspan')
    .style('dominant-baseline', 'hanging')
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

  // Add annotation to explain the middle images
  textY = nodeCoordinate[curLayerIndex - 1][1].y;

  let middleText = flattenAnnotation.append('text')
    .attr('x', textX)
    .attr('y', textY)
    .attr('class', 'annotation-text')
    .style('dominant-baseline', 'hanging')
    .style('text-anchor', 'middle');

  middleText.append('tspan')
    .style('dominant-baseline', 'hanging')
    .text('Same flattening');
  
  middleText.append('tspan')
    .style('dominant-baseline', 'hanging')
    .attr('x', textX)
    .attr('dy', '1em')
    .text('operation for');

  middleText.append('tspan')
    .style('dominant-baseline', 'hanging')
    .attr('x', textX)
    .attr('dy', '1em')
    .text('each neuron');

  drawArrow({
    group: flattenAnnotation,
    sx: textX + 39,
    sy: textY + 25,
    tx: leftX - 10,
    ty: textY + nodeLength / 2 - 2,
    dr: 80,
    hFlip: true,
    marker: 'marker-alt'
  });


  // Add annotation for the output neuron
  let outputAnnotation = intermediateLayerAnnotation.append('g')
    .attr('class', 'output-annotation');
  
  outputAnnotation.append('text')
    .attr('x', nodeCoordinate[layerIndexDict['output']][i].x)
    .attr('y', nodeCoordinate[layerIndexDict['output']][i].y + 10)
    .attr('class', 'annotation-text')
    .text(`(${d3.format('.4f')(cnn[layerIndexDict['output']][i].output)})`);


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