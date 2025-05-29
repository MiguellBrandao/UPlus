export function setupSpeedControl(video) {
	const speedWrapper = document.getElementById('udemyplus-speed-wrapper');
	const speedTooltip = speedWrapper.querySelector('.udemyplus-tooltip');

	speedWrapper.addEventListener('wheel', e => {
		e.preventDefault();
		const increment = 0.1;
		const newRate = Math.min(
			4.0,
			Math.max(0.1, video.playbackRate + (e.deltaY < 0 ? increment : -increment))
		);
		video.playbackRate = parseFloat(newRate.toFixed(2));
		speedTooltip.textContent = `Speed (${video.playbackRate.toFixed(2)}x)`;
	});

	speedWrapper.addEventListener('click', () => {
		video.playbackRate = 1.0;
		speedTooltip.textContent = `Speed (1.00x)`;
	});
}
