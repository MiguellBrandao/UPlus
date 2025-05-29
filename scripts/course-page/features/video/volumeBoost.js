export function setupVolumeBoost(video) {
	const volumeIcon = document.getElementById('udemyplus-volume');
	const volumeTooltip = document.querySelector('#udemyplus-volume-wrapper .udemyplus-tooltip');

	let boosted = false;
	let audioContext = null;
	let gainNode = null;
	let source = null;

	volumeIcon.addEventListener('click', () => {
		if (!audioContext) {
			audioContext = new (window.AudioContext || window.webkitAudioContext)();
			source = audioContext.createMediaElementSource(video);
			gainNode = audioContext.createGain();
			gainNode.gain.value = 1;
			source.connect(gainNode).connect(audioContext.destination);
		}

		boosted = !boosted;
		gainNode.gain.value = boosted ? 7 : 1;

		volumeTooltip.textContent = `Boost Volume (${boosted ? 'ON' : 'OFF'})`;
		volumeIcon.classList.toggle('text-success', boosted);
	});
}
