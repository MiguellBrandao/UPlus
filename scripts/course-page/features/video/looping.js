export function setupLooping(video) {
	let loopEnabled = false;
	const loopIcon = document.getElementById('udemyplus-loop');
	const loopTooltip = document.querySelector('#udemyplus-loop-wrapper .udemyplus-tooltip');

	const playBtn = document.querySelector('button[data-purpose="play-button"]');

	loopIcon.addEventListener('click', () => {
		loopEnabled = !loopEnabled;
		loopTooltip.textContent = `Loop Video (${loopEnabled ? 'ON' : 'OFF'})`;
		loopIcon.classList.toggle('text-success', loopEnabled);
	});

	const loopObserver = new MutationObserver(() => {
		const popup = document.querySelector('.interstitial--container--4wumM');
		if (popup && loopEnabled) {
			const cancelBtn = popup.querySelector('button[data-purpose="cancel-button"]');
			if (cancelBtn) {
				cancelBtn.click();
				const video = document.querySelector('video');
				if (video) {
					video.currentTime = 0;
					if (playBtn) setTimeout(() => playBtn.click(), 500);
				}
			}
		}
	});

	loopObserver.observe(document.body, { childList: true, subtree: true });
}
