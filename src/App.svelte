<script>
	import Explainer from './Explainer.svelte';
</script>

<style>
	@font-face {
		font-family: 'A Love of Thunder';
		src: URL('/assets/font/A Love of Thunder.ttf') format('truetype');
	}

	#header {
		height: 60px;
		background: rgb(40, 40, 40);
		display: flex;
		padding: 0 20px;
		align-items: center;
	}

	#logo-text {
		font-size: 25px;
		color: var(--light-gray);
		font-family: 'A Love of Thunder';
	}
</style>

<div id="app-page">
	<div id="header">
		<div id="logo-text">
			CNN Explainer
		</div>
	</div>
	<Explainer />
</div>
