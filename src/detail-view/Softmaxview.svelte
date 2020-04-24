<script>
  import { onMount, afterUpdate, createEventDispatcher } from 'svelte';
  export let logits;
  export let logitColors;
  export let selectedI;
  export let highlightI = -1;
  export let outputName;
  export let outputValue;
  export let startAnimation;

  let softmaxViewComponent;
  let svg = null;
  const dispatch = createEventDispatcher();
  const formater = (n, d) => {
    if (d === undefined) {
      return d3.format('.2f')(n);
    } else {
      return d3.format(`.${d}f`)(n);
    }
  }

  $: highlightI, (() => {
    if (svg !== null) {
      svg.selectAll(`.formula-term`)
        .style('text-decoration', 'none')
        .style('font-weight', 'normal');

      svg.selectAll(`.formula-term-${highlightI}`)
      .style('font-weight', 'bold')
      .style('text-decoration', 'underline');
    }
  })();

  $: startAnimation, (() => {
    if (svg !== null) {
      svg.select(`.formula-term-${startAnimation.i}`)
        .transition('softmax-edge')
        .duration(startAnimation.duration)
        .style('fill-opacity', 1);
    }
  })();

  const mouseOverHandler = (d, i, g, curI) => {
    highlightI = curI;
    dispatch('mouseOver', {curI: curI});
  }

  const mouseLeaveHandler = (d, i, g, curI) => {
    highlightI = -1;
    dispatch('mouseLeave', {curI: curI});
  }

  const handleClickX = () => {
    dispatch('xClicked', {});
  }

  function handleScroll() {
    let svgHeight = Number(d3.select('#cnn-svg').style('height').replace('px', '')) + 150;
    let scroll = new SmoothScroll('a[href*="#"]', {offset: -svgHeight});
    let anchor = document.querySelector(`#article-softmax`);
    scroll.animateScroll(anchor);
  }

  onMount(() => {
    svg = d3.select(softmaxViewComponent)
      .select('#softmax-svg');

    let formulaRightGroup = svg.append('g')
      .attr('class', 'formula-right')
      .attr('transform', `translate(${10}, ${0})`)
      .style('font-size', '15px');

    // Denominator
    let denominatorGroup = formulaRightGroup.append('g')
      .attr('class', 'denominator')
      .attr('transform', `translate(${0}, ${58})`);
      
    // Add the left (
    denominatorGroup.append('text')
      .attr('x', 0)
      .attr('y', 0)
      .style('fill', 'gray')
      .text('(');

    // Need to loop through the logits array instead of data-binding because
    // we want dynamic positioning based on prior '-' occurance
    let curX = 8;
    let numOfRows = 4;

    logits.forEach((d, i) => {
      if (i / numOfRows >= 1 && i % numOfRows === 0) {
          curX = 8;
      }

      let curText = denominatorGroup.append('text')
        .attr('x', curX)
        .attr('y', Math.floor(i / numOfRows) * 20)
        .style('cursor', 'crosshair')
        .style('pointer-events', 'all')
        .on('mouseover', (d, n, g) => mouseOverHandler(d, n, g, i))
        .on('mouseleave', (d, n, g) => mouseLeaveHandler(d, n, g, i))
        .text(`exp(`);
      
      curText.append('tspan')
        .attr('class', `formula-term-${i} formula-term`)
        .attr('dx', '1')
        .style('fill', logitColors[i])
        .style('fill-opacity', (i === selectedI) || startAnimation.hasInitialized ? 1 : 0)
        .text(formater(d));
      
      curText.append('tspan')
        .attr('dx', '1')
        .text(')');
      
      let curBBox = curText.node().getBBox();
      curX += curBBox.width + 4;

      if (i !== logits.length - 1) {
        denominatorGroup.append('text')
          .attr('x', curX)
          .attr('y', Math.floor(i / numOfRows) * 20)
          .text('+');
        curX += 14;
      } else {
        denominatorGroup.append('text')
          .attr('x', curX-2)
          .attr('y', Math.floor(i / numOfRows) * 20)
          .style('fill', 'gray')
          .text(')');
      }
    })

    denominatorGroup.selectAll('text')
      .data(logits)
      .enter()
      .append('text')
      .attr('x', (d, i) => 40 * i)
      .attr('y', 0)
      .text(d => formater(d));
    
    // Calculate the dynamic denominator group width
    let denominatorGroupBBox = denominatorGroup.node().getBBox();

    // Draw the fraction line
    formulaRightGroup.append('line')
      .attr('class', 'separation-line')
      .attr('x1', -5)
      .attr('x2', denominatorGroupBBox.width + 5)
      .attr('y1', 32)
      .attr('y2', 32)
      .style('stroke-width', 1.2)
      .style('stroke', 'gray');
    
    // Draw the numerator
    let numeratorGroup = formulaRightGroup.append('g')
      .attr('class', 'numerator-group')
      .attr('transform', `translate(${0}, ${20})`);
    
    let numeratorText = numeratorGroup.append('text')
      .attr('x', denominatorGroupBBox.x + denominatorGroupBBox.width / 2)
      .attr('y', 0)
      .on('mouseover', (d, n, g) => mouseOverHandler(d, n, g, selectedI))
      .on('mouseleave', (d, n, g) => mouseLeaveHandler(d, n, g, selectedI))
      .style('pointer-events', 'all')
      .style('cursor', 'crosshair')
      .style('text-anchor', 'middle')
      .text('exp(');

    numeratorText.append('tspan')
      .attr('class', `formula-term-${selectedI} formula-term`)
      .attr('dx', 1)
      .style('fill', logitColors[selectedI])
      .text(`${formater(logits[selectedI])}`);

    numeratorText.append('tspan')
       .attr('dx', 1)
      .text(')');
    
    // Draw the left part of the formula
    let formulaLeftGroup = svg.append('g')
      .attr('class', 'formula-left')
      .attr('transform', `translate(${395}, ${32})`);
    
    let softmaxText = formulaLeftGroup.append('text')
      .attr('x', 20)
      .attr('dominant-baseline', 'middle')
      .text(`${formater(outputValue, 4)}`);
    
    let softmaxTextBBox = softmaxText.node().getBBox();
    
    formulaLeftGroup.append('text')
      .attr('dominant-baseline', 'middle')
      .attr('x', 0)
      .attr('y', 0)
      .style('fill', 'gray')
      .style('font-weight', 'bold')
      .text('=');

  })

</script>

<style>
  .buttons {
    cursor: pointer;
    position: absolute;
    top: 6px;
    right: 10px;
  }

  .control-button {
    color: gray;
    font-size: 15px;
    opacity: 0.4;
  }

  .control-button:hover {
    opacity: 0.8;
  }

  .control-button:not(:first-child) {
    margin-left: 5px;
  }

  .title-text {
    font-size: 1.2em;
    font-weight: 500;
    color: #4a4a4a;
  }

  .annotation {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-left : 10px;
    font-size: 12px;
  }

  .annotation > img {
    width: 17px;
    margin-right: 5px;
  }

  .box {
    padding: 5px 10px 15px 10px;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  svg {
    margin: 10px 0 12px 0;
  }
</style>

<div class="container" bind:this={softmaxViewComponent}>
  <div class="box">

    <div class="buttons">
      <div class="control-button" on:click={handleScroll} title="Jump to article section">
        <i class="fas fa-info-circle"></i>
      </div>

      <div class="delete-button control-button" on:click={handleClickX} title="Close">
        <i class="fas control-icon fa-times-circle"></i>
      </div>
    </div>

    <div class="title-text">
      Softmax Score for <i>"{outputName}"</i>
    </div>

    <svg id="softmax-svg" width="470" height="105"/>

    <div class="annotation">
      <img src='PUBLIC_URL/assets/img/pointer.svg' alt='pointer icon'>
      <div class="annotation-text">
        <span style="font-weight:600">Hover over</span> the numbers to highlight logit circles.
      </div>
    </div>

  </div>
</div>

