<script>
  import Explainer from './Explainer.svelte';
  import Header from './Header.svelte';
</script>

<style>
</style>

<div id="app-page">
  <recommender-overlay
    my-brand="CNN Explainer"
    brands-to-ignore="CNN 101"
    recommendation-count="10"
    similar-candidate-count="15"
    position-left="30"
    display-delay="30000"
    homepage-url="https://poloclub.github.io/"
  />
  <Header />
  <Explainer />
</div>
