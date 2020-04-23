<script>
  export let data;
  export let highlights;
  export let outputLength;
  export let stride;
  export let padding;
  export let isOutput = false;
  export let isStrideValid;

  import { onMount } from 'svelte';
  import { afterUpdate } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  let grid_final;
  const standardCellColor = "#ddd";
  const paddingCellColor = "#aaa";
  const dispatch = createEventDispatcher();

  let oldHighlight = highlights;
  let oldData = data;

  const redraw = () => {
    d3.select(grid_final).selectAll("#grid > *").remove();
    var grid = d3.select(grid_final).select("#grid")
      .attr("width", 200)
      .attr("height", 200)
      .append("svg")
      .attr("width", 200)
      .attr("height", 200)
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
      .style("stroke", "black")
      .style("fill", function(d) {
        // Colors cells appropriately that represent padding.
        if (!isOutput && (d.row < padding || d.row > data.length - padding - 1
          || d.col < padding || d.col > data.length - padding - 1)) {
          return paddingCellColor;
        } 
        return standardCellColor;
      })
      .on('mouseover', function(d) {
        if (!isStrideValid) return;
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
  }

  afterUpdate(() => {
    if (data != oldData) {
      redraw();
      oldData = data;
    }    

    if (highlights != oldHighlight) {
      var grid = d3.select(grid_final).select('#grid').select("svg")
      grid.selectAll(".square")
        .style("fill", function(d) {
          if (highlights.length && highlights[d.row * data.length + d.col]) {
            return "#FF2738";
          } else {
            // Colors cells appropriately that represent padding.
            if (!isOutput && (d.row < padding || d.row > data.length - padding - 1
              || d.col < padding || d.col > data.length - padding - 1)) {
              return paddingCellColor;
            } 
          return standardCellColor;
          }
      })
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