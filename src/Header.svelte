<script>
</script>

<style>
	#header {
		height: 50px;
		display: flex;
		padding: 0 20px;
		align-items: center;
		background: rgb(30, 30, 30);
    justify-content: space-between;
	}

	#logo {
		display: flex;
		align-items: center;
	}

	#logo-text {
		font-size: 30px;
		color: var(--light-gray);
		font-family: 'A Love of Thunder';
		margin-right: 10px;
	}

	#svg-logo-tagline {
		font-size: 23px;
		fill: rgb(255, 255, 255);
		dominant-baseline: baseline;
		font-family: 'Neucha';
	}

	.icons {
		display: flex;
		justify-content: flex-start;
		align-items: center;
	}

	.icon {
		width: 27px;
		height: 27px;
		margin-left: 15px;
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

		<svg width="510px" height="50px">
			<defs>
				<filter x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox" id="chalk-texture">
					<feTurbulence type="fractalNoise" baseFrequency="2" numOctaves="5" stitchTiles="stitch" result="f1">
					</feTurbulence>
					<feColorMatrix type="matrix" values="0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 -1.5 1.5" result="f2">
					</feColorMatrix>
					<feComposite operator="in" in2="f2" in="SourceGraphic" result="f3">
					</feComposite>
				</filter>
			</defs>

			<g filter="url(#chalk-texture)" transform="translate(0, 35)">
				<text id="svg-logo-tagline">
					Learn Convolutional Neural Network (CNN) in your browser! 
				</text>
			</g>
		</svg>
  </div>

	<div class="icons">
	
		<div class="icon" title="Research paper">
			<a target="_blank" href="https://arxiv.org/abs/2004.15004">
				<img src="PUBLIC_URL/assets/img/pdf.png" alt="pdf icon"/>
			</a>
		</div>

		<div class="icon" title="Demo video">
			<a target="_blank" href="https://youtu.be/HnWIHWFbuUQ">
				<img src="PUBLIC_URL/assets/img/youtube.png" alt="youtube icon"/>
			</a>
		</div>

		<div class="icon" title="Open-source code">
			<a target="_blank" href="https://github.com/poloclub/cnn-explainer">
				<img src="PUBLIC_URL/assets/img/github.png" alt="github icon"/>
			</a>
		</div>

	</div>
</div>