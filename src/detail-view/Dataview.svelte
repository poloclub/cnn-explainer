<script>
  export let data;
  export let highlights;
  export let isKernelMath;
  export let constraint;
  export let dataRange;
  export let outputLength = undefined;
  export let stride = undefined;
  export let colorScale = d3.interpolateRdBu;
  export let isInputLayer = false;

  import { onMount } from 'svelte';
  import { onDestroy } from 'svelte';
  import { beforeUpdate, afterUpdate } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  let grid_final;
  const textConstraintDivisor = 2.6;
  const standardCellColor = "ddd";
  const dispatch = createEventDispatcher();

  let oldHighlight = highlights;
  let oldData = data;

  const redraw = () => {
    d3.select(grid_final).selectAll("#grid > *").remove();
    const constrainedSvgSize = data.length * constraint + 2;
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
    var column = row.selectAll(".square")
      .data(function(d) { return d; })
      .enter().append("rect")
      .attr("class","square")
      .attr("x", function(d) { return d.x; })
      .attr("y", function(d) { return d.y; })
      .attr("width", function(d) { return d.width; })
      .attr("height", function(d) { return d.height; })
      .style("opacity", 0.8)
      .style("fill", function(d) {
        let normalizedValue = d.text;
        if (isInputLayer){
          normalizedValue = 1 - d.text;
        } else {
          normalizedValue = (d.text + dataRange / 2) / dataRange;
        }
        return colorScale(normalizedValue);
      })
      .on('mouseover', function(d) {
        if (data.length != outputLength) {
          dispatch('message', {
            hoverH: Math.min(Math.floor(d.row / stride), outputLength - 1),
            hoverW: Math.min(Math.floor(d.col / stride), outputLength - 1)
          });
        } else {
          dispatch('message', {
            hoverH: Math.min(Math.floor(d.row / 1), outputLength - 1),
            hoverW: Math.min(Math.floor(d.col / 1), outputLength - 1)
          });
        }
      });
    if (isKernelMath) {
      var text = row.selectAll(".text")
        .data(function(d) { return d; })
        .enter().append("text")
        .attr("class","text")
        .style("font-size", Math.floor(constraint / textConstraintDivisor) + "px")
        .attr("x", function(d) { return d.x + d.width / 2; })
        .attr("y", function(d) { return d.y + d.height / 2; })
        .style("fill", function(d) {
        let normalizedValue = d.text;
          if (isInputLayer){
            normalizedValue = 1 - d.text;
          } else {
            normalizedValue = (d.text + dataRange / 2) / dataRange;
          }
          if (normalizedValue < 0.2 || normalizedValue > 0.8) {
            return 'white';
          } else {
            return 'black';
          }
        })
        .style("text-anchor", "middle")
        .style("dominant-baseline", "middle")
        .text(function(d) {
          return d.text.toString().replace('-', '－');
        })
    }
  }

  afterUpdate(() => {
    if (data != oldData) {
      redraw();
      oldData = data;
    }

    if (highlights != oldHighlight) {
      var grid = d3.select(grid_final).select('#grid').select("svg")
      grid.selectAll(".square")
        .style("stroke", (d) => isKernelMath || (highlights.length && highlights[d.row * data.length + d.col]) ? "black" : null )
      oldHighlight = highlights;
    }

  });

  onMount(() => {
    redraw();
  });

</script>

<div style="display: inline-block; vertical-align: middle;" class="grid"
  bind:this={grid_final}>
  <svg id="grid" width=100% height=100%></svg>
</div>