<script>
import Dataview from './Dataview.svelte';
  // image: nxn array -- prepadded.
  // kernel: mxm array.
  // stride: int
  export let stride;
  export let dilation
  export let kernel;
  export let image;
  export let output;
  export let isPaused;
  const padding = 0;
  let padded_input_size = image.length + padding * 2;
  $: padded_input_size = image.length + padding * 2;
  function array1d(length, f) {
    return Array.from({length: length}, f ? ((v, i) => f(i)) : undefined);
  }
  function array2d(height, width, f) {
    return Array.from({length: height}, (v, i) => Array.from({length: width}, f ? ((w, j) => f(i, j)) : undefined));
  }
  function generateOutputMappings(stride) {
    const outputMapping = array2d(output.length, output.length, (i, j) => array2d(kernel.length, kernel.length));
    for (let h_out = 0; h_out < output.length; h_out++) {
      for (let w_out = 0; w_out < output.length; w_out++) {
        for (let h_kern = 0; h_kern < kernel.length; h_kern++) {
          for (let w_kern = 0; w_kern < kernel.length; w_kern++) {
            const h_im = h_out * stride + h_kern * dilation;
            const w_im = w_out * stride + w_kern * dilation;
            outputMapping[h_out][w_out][h_kern][w_kern] = h_im * padded_input_size + w_im;
          }
        }
      }
    }
    return outputMapping;
  }
  function compute_input_multiplies_with_weight(hoverH, hoverW, 
                                                padded_input_size, weight_dims, outputMappings) {
    
    const [h_weight, w_weight] = weight_dims;
    const input_multiplies_with_weight = array1d(padded_input_size * padded_input_size);
    for (let h_weight = 0; h_weight < kernel.length; h_weight++) {
      for (let w_weight = 0; w_weight < kernel.length; w_weight++) {
        const flat_input = outputMappings[hoverH][hoverW][h_weight][w_weight];
        if (typeof flat_input === "undefined") continue;
        input_multiplies_with_weight[flat_input] = [h_weight, w_weight];
      }
    }
    return input_multiplies_with_weight;
  }
  function gridData(image) {
    var data = new Array();
    var xpos = 1;
    var ypos = 1;
    var width = 50;
    var height = 50;
    for (var row = 0; row < image.length; row++) {
      data.push( new Array() );
      for (var column = 0; column < image[0].length; column++) {
        data[row].push({
          text: Math.round(image[row][column] * 100) / 100,
          row: row,
          col: column,
          x: xpos,
          y: ypos,
          width: width,
          height: height
        })
        xpos += width;
      }
      xpos = 1;
      ypos += height; 
    }
    return data;
  }
  let inputHighlights = [];
  let outputHighlights = array1d(output.length * output.length, (i) => true);
  var interval;
  $ : {
    let inputHighlights = [];
    let outputHighlights = array1d(output.length * output.length, (i) => true);
    var interval;
  }
  function startConvolution(stride) {
    var counter = 0;
    let outputMappings = generateOutputMappings(stride);
    if (stride <= 0) return;
    if (interval) clearInterval(interval);
    interval = setInterval(() => {
      if (isPaused) return;
      
      const flat_animated = counter % (output.length * output.length);
      outputHighlights = array1d(output.length * output.length, (i) => false);
      const animatedH = Math.floor(flat_animated / output.length);
      const animatedW = flat_animated % output.length;
      outputHighlights[animatedH * output.length + animatedW] = true;
      inputHighlights = compute_input_multiplies_with_weight(animatedH, animatedW, padded_input_size, kernel.length, outputMappings)
      counter++;
    
    }, 1000)
  }
  startConvolution(stride);
  var test_image = gridData(image)
  var test_output = gridData(output)
  var test_kernel = gridData(kernel)
  $ : {
    startConvolution(stride);
    test_image = gridData(image)
    test_output = gridData(output)
    test_kernel = gridData(kernel)
  }
</script>



<div class="column has-text-centered">
  <header>
    Input
  </header>
  <Dataview data={test_image} highlights={inputHighlights} isConvolve={true}/>  
</div>
<div class="column has-text-centered">
  <header>
    Kernel
  </header>
  <Dataview data={test_kernel} highlights={outputHighlights} isConvolve={false}/>  
</div>
<div class="column has-text-centered">
  <header>
    Output
  </header>
  <Dataview data={test_output} highlights={outputHighlights} isConvolve={true}/>
</div>