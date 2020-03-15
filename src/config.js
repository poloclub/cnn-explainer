/* global d3 */

const layerColorScales = {
  input: [d3.interpolateGreys, d3.interpolateGreys, d3.interpolateGreys],
  conv: d3.interpolateRdBu,
  relu: d3.interpolateRdBu,
  pool: d3.interpolateRdBu,
  fc: d3.interpolateGreys,
  weight: d3.interpolateBrBG,
  logit: d3.interpolateOranges
};

let nodeLength = 40;

export const overviewConfig = {
  nodeLength : nodeLength,
  plusSymbolRadius : nodeLength / 5,
  numLayers : 12,
  edgeOpacity : 0.8,
  edgeInitColor : 'rgb(230, 230, 230)',
  edgeHoverColor : 'rgb(130, 130, 130)',
  edgeHoverOuting : false,
  edgeStrokeWidth : 0.7,
  intermediateColor : 'gray',
  layerColorScales: layerColorScales,
  svgPaddings: {top: 25, bottom: 25, left: 50, right: 50},
  kernelRectLength: 8/3,
  gapRatio: 4,
  overlayRectOffset: 12,
  classLists: ['lifeboat', 'ladybug', 'pizza', 'bell pepper', 'school bus',
    'koala', 'espresso', 'red panda', 'orange', 'sport car']
};