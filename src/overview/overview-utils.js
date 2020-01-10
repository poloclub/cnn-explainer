/* global d3 */

import { get } from 'svelte/store';
import { overviewConfig } from '../config.js';

// Configs
const layerColorScales = overviewConfig.layerColorScales;
const nodeLength = overviewConfig.nodeLength;
const plusSymbolRadius = overviewConfig.plusSymbolRadius;
const numLayers = overviewConfig.numLayers;
const edgeOpacity = overviewConfig.edgeOpacity;
const edgeInitColor = overviewConfig.edgeInitColor;
const edgeHoverColor = overviewConfig.edgeHoverColor;
const edgeHoverOuting = overviewConfig.edgeHoverOuting;
const edgeStrokeWidth = overviewConfig.edgeStrokeWidth;
const intermediateColor = overviewConfig.intermediateColor;

/**
 * Compute the [minimum, maximum] of a 1D or 2D array.
 * @param {[number]} array 
 */
export  const getExtent = (array) => {
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

/**
 * Return the output knot (right boundary center)
 * @param {object} point {x: x, y:y}
 */
export const getOutputKnot = (point) => {
  return {
    x: point.x + nodeLength,
    y: point.y + nodeLength / 2
  };
}

/**
 * Return the output knot (left boundary center)
 * @param {object} point {x: x, y:y}
 */
export const getInputKnot = (point) => {
  return {
    x: point.x,
    y: point.y + nodeLength / 2
  }
}

/**
 * Compute edge data
 * @param {[[[number, number]]]} nodeCoordinate Constructed neuron svg locations
 * @param {[object]} cnn Constructed CNN model
 */
export const getLinkData = (nodeCoordinate, cnn) => {
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