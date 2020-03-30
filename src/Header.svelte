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
		font-size: 25px;
		color: rgb(190, 190, 190);
		font-family: 'Coffee and Tea';
	}

	.icons {
		display: flex;
		justify-content: flex-start;
		align-items: center;
	}

	.icon {
		width: 30px;
		height: 30px;
		margin-left: 16px;
	}

	.icon a{
		width: 100%;
		height: 100%;
	}

	.icon img {
    width: 100%;
    height: 100%;
    object-fit: contain;
	}
</style>

<div id="header">

  <div id="logo">
    <div id="logo-text">
      CNN Explainer
    </div>
    <div id="logo-tagline">
      Learn Convolutional Neural Network (CNN) in your browser!
    </div>
  </div>

	<div class="icons">
	
		<div class="icon">
			<a target="_blank" href="https://www.google.com">
				<img src="/assets/img/pdf.png" alt="pdf icon"/>
			</a>
		</div>

		<div class="icon">
			<a target="_blank" href="https://www.google.com">
				<img src="/assets/img/youtube.png" alt="youtube icon"/>
			</a>
		</div>

		<div class="icon">
			<a target="_blank" href="https://www.google.com">
				<img src="/assets/img/github.png" alt="github icon"/>
			</a>
		</div>

	</div>
</div>