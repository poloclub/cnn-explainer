<script>
  export let data;
  export let highlights;
  export let isKernelMath;
  export let constraint;
  import { onMount } from 'svelte';
  import { onDestroy } from 'svelte';
  import { beforeUpdate, afterUpdate } from 'svelte';

  let grid_final;
  const textConstraintDivisor = 2.6;
  const standardCellColor = "ddd";

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
      .style("opacity", 0.5)
      .style("fill", function(d) { return isKernelMath || (highlights.length && highlights[d.row * data.length + d.col]) ? d3.interpolateGnBu(d.text) : standardCellColor; })
      .style("stroke", "#222")
    var text = row.selectAll(".text")
      .data(function(d) { return d; })
      .enter().append("text")
      .attr("class","text")
      .style("font-size", Math.floor(constraint / textConstraintDivisor) + "px")
      .attr("x", function(d) { return d.x; })
      .attr("y", function(d) { return d.y + d.width; })
      .text(function(d) { return d.text; })
  }

  afterUpdate(() => {
    
    if (data != oldData) {
      redraw();
      oldData = data;
    }    

    if (highlights != oldHighlight) {
      var grid = d3.select(grid_final).select('#grid').select("svg")
      grid.selectAll(".square")
        .style("fill", (d) => isKernelMath || (highlights.length && highlights[d.row * data.length + d.col]) ? d3.interpolateGnBu(d.text) : standardCellColor )
      oldHighlight = highlights;
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