<script context="module">
	let iframeApiReady = false;

	import { setContext, onMount } from "svelte";
	var tag = document.createElement("script");
	tag.src = "https://www.youtube.com/iframe_api";
	var firstScriptTag = document.getElementsByTagName("script")[0];
	firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

	window.onYouTubeIframeAPIReady = () =>
	window.dispatchEvent(new Event("iframeApiReady"));
</script>

<script>
	import { createEventDispatcher } from "svelte";
	import { getContext } from "svelte";
	export let videoId;
	export let playerId = "player";

	let player;
	export function play(startSecond = 0){
		player.seekTo(startSecond);
		player.playVideo()
	}
	const dispatch = createEventDispatcher();
	window.addEventListener("iframeApiReady", function(e) {
		player = new YT.Player(playerId, {
			videoId,
			events: {
				onReady: onPlayerReady
			}
		});
	});
	function onPlayerReady(event) {
      player.mute()
    }
</script>

<div id={playerId} />