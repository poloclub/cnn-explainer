/* global d3 */

import { svgStore, vSpaceAroundGapStore } from '../stores.js';
import { overviewConfig } from '../config.js';

// Configs
const layerColorScales = overviewConfig.layerColorScales;
const nodeLength = overviewConfig.nodeLength;
const intermediateColor = overviewConfig.intermediateColor;
const svgPaddings = overviewConfig.svgPaddings;

// Shared variables
let svg = undefined;
svgStore.subscribe( value => {svg = value;} )

let vSpaceAroundGap = undefined;
vSpaceAroundGapStore.subscribe( value => {vSpaceAroundGap = value;} )

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
  let transitionName = arg.transitionName === undefined ? 'move' : arg.transitionName;
  let duration = arg.duration === undefined ? 500 : arg.duration;

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
      .duration(duration)
      .attr('x', targetX);
    
    d3.select(g[i])
      .select('rect.bounding')
      .transition(transitionName)
      .ease(d3.easeCubicInOut)
      .delay(delay)
      .duration(duration)
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
    .duration(duration)
    .attr('transform', () => {
      let x = targetX + nodeLength / 2;
      let y = (svgPaddings.top + vSpaceAroundGap) / 2 + 5;
      return `translate(${x}, ${y})`;
    })
    .on('end', onEndFunc);

  svg.selectAll(`g#layer-detailed-label-${layerIndex}`)
    .transition(transitionName)
    .ease(d3.easeCubicInOut)
    .delay(delay)
    .duration(duration)
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
export const drawIntermediateLayerLegend = (arg) => {
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
    .attr('class', `intermediate-legend-${curLayerIndex - 1}`)
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
export const drawArrow = (arg) => {
  let group = arg.group,
    sx = arg.sx,
    sy = arg.sy,
    tx = arg.tx,
    ty = arg.ty,
    dr = arg.dr,
    hFlip = arg.hFlip,
    marker = arg.marker === undefined ? 'marker' : arg.marker;

  /* Cool graphics trick -> merge translate and scale together
  translateX = (1 - scaleX) * tx,
  translateY = (1 - scaleY) * ty;
  */
  
  let arrow = group.append('g')
    .attr('class', 'arrow-group');

  arrow.append('path')
    .attr("d", `M${sx},${sy}A${dr},${dr} 0 0,${hFlip ? 0 : 1} ${tx},${ty}`)
    .attr('marker-end', `url(#${marker})`)
    .style('stroke', 'gray')
    .style('fill', 'none');
}
