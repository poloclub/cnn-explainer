<script>
  export let data;
  export let highlights;
  export let isConvolve;
  import { onMount } from 'svelte';
  import { onDestroy } from 'svelte';
  import { beforeUpdate, afterUpdate } from 'svelte';
  let grid_final;
  beforeUpdate(() => {
    d3.selectAll("#grid > *").remove();
  });
  afterUpdate(() => {
    var grid = d3.select(grid_final).select("#grid")
      .attr("width", data.length * 50 + 2 + "px")
      .attr("height", data.length * 50 + 2 + "px")
      .append("svg")
      .attr("width", data.length * 50 + 2 + "px")
      .attr("height", data.length * 50 + 2 + "px");
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
      .style("fill", function(d) { return !isConvolve || (highlights.length && highlights[d.row * data.length + d.col]) ? 'ff0000' : "ddd"; })
      .style("stroke", "#222")
      .on('click', d3.select(this).style("fill", "#fff"));
    var text = row.selectAll(".text")
      .data(function(d) { return d; })
      .enter().append("text")
      .attr("class","text")
      .attr("x", function(d) { return d.x; })
      .attr("y", function(d) { return d.y + 50; })
      .text(function(d) { return d.text; })
  });
</script>

<div class="grid"
  bind:this={grid_final}>
  <svg id="grid" width=100% height=100%></svg>
</div>