<script>
  import Overview from './Overview.svelte';
  import Layerview from './Layerview.svelte';
  import Detailview from './Detailview.svelte';

  // Enum to control the displaying view
  const View = {
    OVERVIEW: 'overview',
    LAYERVIEW: 'layerview',
    DETAILVIEW: 'detailview'
  };

  let mainView = View.OVERVIEW;
</script>

<style>
#explainer {
  width: 1140px;
  margin: 50px auto;
  padding: 20px;
  background: var(--g-light-gray);
  /* outline: 1px solid var(--g-dark-gray); */
}
</style>

<div id='explainer'>
  {#if mainView === View.OVERVIEW}
    <Overview />
  {:else if mainView === View.LAYERVIEW}
    <Layerview />
  {:else if mainView === View.DETAILVIEW}
    <Detailview />
  {/if}
</div>