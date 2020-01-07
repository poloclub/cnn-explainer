<script>
  export let data;
  export let kernel;
  export let constraint;
  export let dataRange;
  export let kernelRange;
  export let colorScale = d3.interpolateRdBu;
  export let kernelColorScale = d3.interpolateBrBG;
  export let isInputLayer = false;

  import { onMount } from 'svelte';
  import { afterUpdate } from 'svelte';

  let gridFinal;
  let legendFinal;
  const textConstraintDivisor = 2.6;
  const multiplicationSymbolPadding = Math.floor(constraint / 3);

  let oldData = data;
  let oldKernel = kernel;

  // Legend drawn similarly to legends in overview/intermediate-view.
  const addOverlayGradient = (gradientID, stops, group) => {
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

  // Draw the legend for intermediate layer
  const redrawDetailedConvViewLegend = (arg) => {
    let legendHeight = arg.legendHeight,
      range = arg.range,
      minMax = arg.minMax,
      width = arg.width,
      colorScale = arg.colorScale,
      gradientGap = arg.gradientGap;

    d3.select(legendFinal).selectAll("#legend > *").remove();
    let legend = d3.select(legendFinal).select("#legend")
      .attr("width", 150 + "px")
      .attr("height", 25 + "px")
      .attr("align","center")
      .style("dominant-baseline", "middle");
    let detailedViewKernel = legend.append('g')
      .attr('transform', `translate(10, 0)`);
    
    if (colorScale === undefined) { colorScale = layerColorScales.conv; }
    if (gradientGap === undefined) { gradientGap = 0; }
    
    // Add a legend color gradient
    let gradientName = `url(#detailed-kernel-gradient)`;
    let normalizedColor = v => colorScale(v * (1 - 2 * gradientGap) + gradientGap);

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

    addOverlayGradient(`detailed-kernel-gradient`, stops, detailedViewKernel);

    let legendScale = d3.scaleLinear()
      .range([0, width - 1.2])
      .domain([minMax.min, minMax.max]);

    let legendAxis = d3.axisBottom()
      .scale(legendScale)
      .tickFormat(d3.format('.2f'))
      .tickValues([minMax.min, 0, minMax.max]);
    
    let detailedLegend = detailedViewKernel.append('g')
      .attr('id', `detailed-legend-0`)
    
    let legendGroup = detailedLegend.append('g')
      .attr('transform', `translate(0, ${legendHeight - 3})`)
      .call(legendAxis);
    
    legendGroup.selectAll('text')
      .style('font-size', '9px')
      .style('fill', "black");
    
    legendGroup.selectAll('path, line')
      .style('stroke', "black");

    detailedLegend.append('rect')
      .attr('width', width)
      .attr('height', legendHeight)
      .style('fill', gradientName);
  }

  // Draw the elementwise dot-product math.
  const redraw = () => {
    d3.select(gridFinal).selectAll("#grid > *").remove();
    const constrainedSvgSize = kernel ? 2 * (data.length * constraint) + 2 : data.length * constraint + 2;
    var grid = d3.select(gridFinal).select("#grid")
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
      .attr("x", function(d) { return d.x === 1 ? d.x + multiplicationSymbolPadding : d.x * 2 + multiplicationSymbolPadding})
      .attr("y", function(d) { return d.y === 1 ? d.y : d.y * 2 })
      .attr("width", function(d) { return d.width; })
      .attr("height", function(d) { return d.height; })
      .style("opacity", 0.5)
      .style("fill", function(d) { 
        let normalizedValue = d.text;
        if (isInputLayer){
          normalizedValue = 1 - d.text;
        } else {
          normalizedValue = (d.text + dataRange / 2) / dataRange;
        }
        return colorScale(normalizedValue); 
      })
      .style("stroke", "black");
    // Draw cells for the kernel.
    columns.append("rect")
      .attr("class","square")
      .attr("x", function(d) { return d.x === 1 ? d.x + multiplicationSymbolPadding: d.x * 2 + multiplicationSymbolPadding})
      .attr("y", function(d) { return d.y === 1 ? d.y + d.height : d.y * 2 + d.height })
      .attr("width", function(d) { return d.width; })
      .attr("height", function(d) { return d.height / 2; })
      .style("opacity", 0.5)
      // Same colorscale as is used for the flatten layers.
      .style("fill", function(d) { 
        let normalizedValue = (kernel[d.row][d.col].text + kernelRange.range / 2) / kernelRange.range;
        const gap = 0.2;
        let normalizedValueWithGap = normalizedValue * (1 - 2 * gap) + gap;
        return kernelColorScale(normalizedValueWithGap); 
      })

    var texts = row.selectAll(".text")
      .data(function(d) { return d; })
      .enter();
    // Draw numbers from input matrix slice.
    texts.append("text")
      .attr("class","text")
      .style("font-size", Math.floor(constraint / textConstraintDivisor) + "px")
      .attr("x", function(d) { return d.x === 1 ? d.x + d.width / 2 + multiplicationSymbolPadding: d.x * 2 + d.width / 2 + multiplicationSymbolPadding})
      .attr("y", function(d) { return d.y === 1 ? d.y + d.height / 2 : d.y * 2 + d.height / 2 })
      .style("fill", function(d) { 
        let normalizedValue = d.text;
        if (isInputLayer){
          normalizedValue = 1 - d.text;
        } else {
          normalizedValue = (d.text + dataRange / 2) / dataRange;
        }
        if (normalizedValue < 0.2 || normalizedValue > 0.8) {
          if (isInputLayer && normalizedValue < 0.2) {
            return 'black';
          } 
          return 'white';
        } else {
          return 'black';
        }
      })
      .style("text-anchor", "middle")
      .style("dominant-baseline", "middle")
      .text(function(d) { return d.text; })
    // Attempted to use FontAwesome icons for the 'x', '+', and '=', but none of these strategies work: https://github.com/FortAwesome/Font-Awesome/issues/12268
    // Draw 'x' to signify multiplication.
    texts.append("text")
      .attr("class","text")
      .style("font-size", Math.floor(constraint / (textConstraintDivisor)) + "px")
      .attr('font-weight', 600)
      .attr("x", function(d) { return d.x === 1 ? d.x + multiplicationSymbolPadding / 2: d.x * 2 + multiplicationSymbolPadding / 2})
      .attr("y", function(d) { return d.y === 1 ? d.y + d.height + (d.height / 4) : d.y * 2 + d.height + (d.height / 4) })
      .style("fill", "black")
      .style("text-anchor", "middle")
      .style("dominant-baseline", "middle")
      .text(function(d) { return '×' })
    // Draw kernel values.
    texts.append("text")
      .attr("class","text")
      .style("font-size", Math.floor(constraint / textConstraintDivisor) + "px")
      .attr("x", function(d) { return d.x === 1 ? d.x + d.width / 2 + multiplicationSymbolPadding: d.x * 2 + d.width / 2 + multiplicationSymbolPadding})
      .attr("y", function(d) { return d.y === 1 ? d.y + d.height + (d.height / 4) : d.y * 2 + d.height + (d.height / 4) })
      .style("fill", function(d) { 
        let normalizedValue = (kernel[d.row][d.col].text + kernelRange.range / 2) / kernelRange.range;
        const gap = 0.2;
        let normalizedValueWithGap = normalizedValue * (1 - 2 * gap) + gap;
        if (normalizedValueWithGap < 0.2 || normalizedValueWithGap > 0.8) {
          return 'white';
        } else {
          return 'black';
        }
      })
      .style("text-anchor", "middle")
      .style("dominant-baseline", "middle")
      .text(function(d) { return kernel[d.row][d.col].text; })
    // Draw '+' to signify the summing of products except for the last kernel cell where '=' is drawn.
    texts.append("text")
      .attr("class","text")
      .style("font-size", Math.floor(constraint / (textConstraintDivisor - 1)) + "px")
      .attr("x", function(d) { return d.x === 1 ? d.x + d.width + d.width / 2 + multiplicationSymbolPadding: d.x * 2 + d.width + d.width / 2 + multiplicationSymbolPadding})
      .attr("y", function(d) { return d.y === 1 ? d.y + d.height / 2 : d.y * 2 + d.height / 2 })
      .style("text-anchor", "middle")
      .style("dominant-baseline", "middle")
      .text(function(d) { return d.row == kernel.length - 1 && d.col == kernel.length - 1 ? '=' : '+'; })
    }

  afterUpdate(() => {
    if (data != oldData) {
      redraw();
      oldData = data;
    }
    if (kernel != oldKernel) {
      /*
      redrawDetailedConvViewLegend({
          legendHeight: 5,
          range: kernelRange.range,
          minMax: {min: kernelRange.min, max: kernelRange.max},
          width: 130,
          colorScale: kernelColorScale,
          gradientGap: 0.35,
      });
      */
      oldKernel = kernel;
    }
  });

  onMount(() => {
    redraw();
    /*
    redrawDetailedConvViewLegend({
          legendHeight: 5,
          range: kernelRange.range,
          minMax: {min: kernelRange.min, max: kernelRange.max},
          width: 130,
          colorScale: kernelColorScale,
          gradientGap: 0.35,
    });
    */
  });

</script>

<div class="legend"
  bind:this={legendFinal}>
  <!-- <svg id="legend" width=100% height=100%></svg> -->
</div>

<div class="grid"
  bind:this={gridFinal}>
  <svg id="grid" width=100% height=100%></svg>
</div>