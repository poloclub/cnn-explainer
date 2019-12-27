<script>
  export let data;
  export let kernel;
  export let constraint;
  export let dataRange;
  export let kernelRange;

  import { onMount } from 'svelte';
  import { afterUpdate } from 'svelte';

  let grid_final;
  const textConstraintDivisor = 2.6;
  const standardCellColor = "ddd";

  let oldData = data;

  function getHighlightWindowSize() {
    let count = highlights.reduce(function(n, val) {
      return n + (val != undefined);
    }, 0);
    return Math.sqrt(count);
  }

  const redraw = () => {
    d3.select(grid_final).selectAll("#grid > *").remove();
    const constrainedSvgSize = kernel ? 2 * (data.length * constraint) + 2 : data.length * constraint + 2;
    var grid = d3.select(grid_final).select("#grid")
      .attr("width", constrainedSvgSize + "px")
      .attr("height", constrainedSvgSize + "px")
      .append("svg")
      .attr("width", constrainedSvgSize + "px")
      .attr("height", constrainedSvgSize + "px")
    var row = grid.selectAll(".row")
      .data(data)
      .enter().append("g")
      .attr("class", "row");
    
    var columns = row.selectAll(".square")
      .data(function(d) { return d; })
      .enter();
    // Draw cells for slice from input matrix.
    columns.append("rect")
      .attr("class","square")
      .attr("x", function(d) { return d.x === 1 ? d.x : d.x * 2 })
      .attr("y", function(d) { return d.y === 1 ? d.y : d.y * 2 })
      .attr("width", function(d) { return d.width; })
      .attr("height", function(d) { return d.height; })
      .style("opacity", 0.5)
      .style("fill", function(d) { 
        let normalizedValue = (d.text + dataRange / 2) / dataRange;
        return d3.interpolateRdBu(normalizedValue); 
      })
      .style("stroke", "black");
    // Draw cells for the kernel.
    columns.append("rect")
      .attr("class","square")
      .attr("x", function(d) { return d.x === 1 ? d.x : d.x * 2 })
      .attr("y", function(d) { return d.y === 1 ? d.y + d.height : d.y * 2 + d.height })
      .attr("width", function(d) { return d.width; })
      .attr("height", function(d) { return d.height / 2; })
      .style("opacity", 0.5)
      // Same colorscale as is used for the flatten layers.
      .style("fill", function(d) { 
        let normalizedValue = (kernel[d.row][d.col].text + kernelRange / 2) / kernelRange;
        const gap = 0.35;
        let normalizedValueWithGap = normalizedValue * (1 - 2 * gap) + gap;
        return d3.interpolateBrBG(normalizedValueWithGap); 
      })

    var texts = row.selectAll(".text")
      .data(function(d) { return d; })
      .enter();
    // Draw numbers from input matrix slice.
    texts.append("text")
      .attr("class","text")
      .style("font-size", Math.floor(constraint / textConstraintDivisor) + "px")
      .attr("x", function(d) { return d.x === 1 ? d.x + d.width / 2 : d.x * 2 + d.width / 2 })
      .attr("y", function(d) { return d.y === 1 ? d.y + d.height / 2 : d.y * 2 + d.height / 2 })
      .style("fill", function(d) { 
        let normalizedValue = (d.text + dataRange / 2) / dataRange;
        if (normalizedValue < 0.3 || normalizedValue > 0.8) {
          return 'white';
        } else {
          return 'black';
        }
      })
      .style("text-anchor", "middle")
      .style("dominant-baseline", "middle")
      .text(function(d) { return d.text; })
    // Draw 'x' to signify multiplication along with the numbers from the kernel.
    texts.append("text")
      .attr("class","text")
      .style("font-size", Math.floor(constraint / (textConstraintDivisor + 1)) + "px")
      .attr("x", function(d) { return d.x === 1 ? d.x + d.width / 2 : d.x * 2 + d.width / 2 })
      .attr("y", function(d) { return d.y === 1 ? d.y + d.height + (d.height / 4) : d.y * 2 + d.height + (d.height / 4) })
      .style("fill", "black")
      .style("text-anchor", "middle")
      .style("dominant-baseline", "middle")
      .text(function(d) { return 'x ' + kernel[d.row][d.col].text; })
    // Draw '+' to signify the summing of products.
    texts.append("text")
      .attr("class","text")
      .style("font-size", Math.floor(constraint / (textConstraintDivisor - 1)) + "px")
      .attr("x", function(d) { return d.x === 1 ? d.x + d.width + d.width / 2 : d.x * 2 + d.width + d.width / 2 })
      .attr("y", function(d) { return d.y === 1 ? d.y + d.height : d.y * 2 + d.height })
      .style("text-anchor", "middle")
      .style("dominant-baseline", "middle")
      .text(function(d) { return d.row == kernel.length - 1 && d.col == kernel.length - 1 ? '=' : '+'; })
    }

  afterUpdate(() => {
    if (data != oldData) {
      redraw();
      oldData = data;
    }    
  });

  onMount(() => {
    redraw();
  });

</script>

<div class="grid"
  bind:this={grid_final}>
  <svg id="grid" width=100% height=100%></svg>
</div>