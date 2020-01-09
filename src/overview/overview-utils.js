
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