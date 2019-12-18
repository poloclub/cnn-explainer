<script>
</script>

<style>
	@font-face {
		font-family: 'A Love of Thunder';
		src: URL('/assets/font/A Love of Thunder.ttf') format('truetype');
	}

	@font-face {
		font-family: 'Coffee and Tea';
		src: URL('/assets/font/Coffee and Tea.ttf') format('truetype');
	}

	#header {
		height: 50px;
		display: flex;
		padding: 0 20px;
		align-items: center;
		background: rgb(30, 30, 30);
    justify-content: space-between;
		/*
		background-image: url('/assets/img/chalkboard.jpg');
		background-size: cover;
		background-repeat: no-repeat;
		*/
	}

	#logo {
		display: flex;
		align-items: baseline;
	}

	#logo-text {
		font-size: 30px;
		color: var(--light-gray);
		font-family: 'A Love of Thunder';
		margin-right: 10px;
	}

	#logo-tagline {
		font-size: 23px;
		color: rgb(170, 170, 170);
		font-family: 'Coffee and Tea';
	}
</style>

<div id="header">
  <div id="logo">
    <div id="logo-text">
      CNN 101
    </div>
    <div id="logo-tagline">
      Learn Convolutional Neural Network (CNN) in your browser!
    </div>
  </div>
</div>