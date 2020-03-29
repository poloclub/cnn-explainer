<script>
  /* global d3 */

  import { onMount, createEventDispatcher } from 'svelte';
  import { modalStore } from '../stores.js';

  let modalComponent;
  let valiImg;
  let inputValue;
  let showLoading = false;
  let errorInfo = {
    show: false,
    error: ''
  };
  const dispatch = createEventDispatcher();

  let modalInfo = {
    show: false
  };
  modalStore.set(modalInfo);
  modalStore.subscribe(value => {modalInfo = value});

  const errorCallback = () => {
    // The URL is invalid, show an error message on the UI
    showLoading = false;
    errorInfo.show = true;
    errorInfo.error = "We can't find the image at that URL.";
  }

  const loadCallback = () => {
    // The URL is valid, but we are not sure if loading it to canvas would be
    // blocked by crossOrigin setting. Try it here before dispatch to parent.

    // https://stackoverflow.com/questions/13674835/canvas-tainted-by-cross-origin-data
    let testImage = document.getElementById('vali-image');
    let canvas = document.createElement("canvas");
    let context = canvas.getContext("2d");

    canvas.width = testImage.width;
    canvas.height = testImage.height;

    context.drawImage(testImage, 0, 0);

    try {
      context.getImageData(0, 0, testImage.width, testImage.height);
      // If the foreign image does support CORS -> use this image
      // dispatch to parent component to use the input image
      showLoading = false;
      modalInfo.show = false;
      modalStore.set(modalInfo);
      dispatch('urlTyped', {url: inputValue});
      inputValue = null;
    } catch(err) {
      // If the foreign image does not support CORS -> use this image
      showLoading = false;
      errorInfo.show = true;
      errorInfo.error = "No permission to load this image."
    }
  }

  const crossClicked = () => {
    modalInfo.show = false;
    modalStore.set(modalInfo);
    // Dispatch the parent component
    dispatch('xClicked', {preImage: modalInfo.preImage});
  }

  const addClicked = () => {
    // Validate the input URL
    showLoading = true;
    errorInfo.show = false;
    valiImg.src = inputValue;
  }

  onMount(() => {
    let modal = d3.select(modalComponent)
      .select('#input-modal');
  })

</script>

<style>
  .modal-card {
    max-width: 500px;
  }

  .modal-card-title {
    font-size: 20px;
  }

  .modal-card-head {
    padding: 15px 20px;
  }

  .modal-card-foot {
    padding: 12px 20px;
    justify-content: space-between;
  }

  .is-smaller {
    font-size: 15px;
    padding: 0.5em 0.8em;
    max-height: 2.2em;
  }

  .small-font {
    font-size: 15px;
  }

  .error-message {
    font-size: 15px;
    padding: 0.5em 0;
    color: #F22B61;
  }

  .control {
    width: 100%;
  }

  .or-label {
    font-size: 15px;
    padding: 0.5em 0;
    color: #F22B61;
  }

</style>


<div class="modal-component"
  bind:this={modalComponent}>

  <div class="modal"
    id="input-modal"
    class:is-active={modalInfo.show}>

    <div class="modal-background"></div>

    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Add Input Image</p>
        <button class="delete" aria-label="close" on:click={crossClicked}></button>
      </header>

      <section class="modal-card-body">
        <div class="field">
          <div class="control has-icons-left"
            class:is-loading={showLoading}>

            <input class="input small-font" type="url"
              bind:value={inputValue}
              placeholder="Paste URL of image...">

            <span class="icon small-font is-left">
              <i class="fas fa-link"></i>
            </span>

          </div>

          <div class="or-label">or</div>

          <button class="button">
            <span class="icon">
              <i class="fab fa-github"></i>
            </span>
            <span>Upload</span>
          </button>
        </div>



      </section>

      <footer class="modal-card-foot">

        <div class="error-message"
          class:hidden={!errorInfo.show}>
          {errorInfo.error}
        </div>

        <div class="button-container">
          <button class="button is-smaller"
            on:click={crossClicked}>
            Cancel
          </button>

          <button class="button is-success is-smaller"
            on:click={addClicked}>
            Add
          </button>
        </div>


      </footer>
    </div>

  </div>

  <!-- An invisible image to check if the user input URL is valid -->
  <img style="display: none"
    id="vali-image"
    alt="hidden image"
    bind:this={valiImg}
    on:error={errorCallback}
    on:load={loadCallback} />

</div>
