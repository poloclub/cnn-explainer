<script>
</script>

<style>
  .overview {
    padding: 0;
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-end;
  }

  .overview-svg {
    width: 100%;
    height: 90%;
  }

  .control-wrapper {
    height: 10%;
    display: flex;
    justify-content: flex-end;
    align-items: center;
  }
</style>

<div class="overview">
  <svg class="overview-svg"></svg>
  <div class="control-wrapper">
    <button class="button">
      <span class="icon has-text-danger">
        <i class="fa fa-heart"></i>
      </span>
      <span>Button</span>
    </button>
  </div>
</div>