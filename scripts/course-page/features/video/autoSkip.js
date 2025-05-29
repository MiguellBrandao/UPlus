import { videoStateService } from '../../services/videoState.js';

export function setupAutoSkip(video) {
	const autoSkipBtn = document.getElementById('udemyplus-disable-next');
	let skipObserver = null;

	autoSkipBtn.addEventListener('click', () => {
		const newState = !videoStateService.getAutoSkipEnabled();

		if (newState && videoStateService.getLoopEnabled()) {
			videoStateService.disableLoop();
		}

		videoStateService.setAutoSkipEnabled(newState);
		autoSkipBtn.classList.toggle('text-success', newState);
		const tooltip = autoSkipBtn.nextElementSibling;
		if (tooltip) tooltip.textContent = `Auto Skip Delay (${newState ? 'ON' : 'OFF'})`;

		if (newState) {
			if (skipObserver) skipObserver.disconnect();

			skipObserver = new MutationObserver(() => {
				const popup = document.querySelector('.interstitial--container--4wumM');
				if (popup && videoStateService.getAutoSkipEnabled()) {
					popup.style.display = 'none';

					const current = document.querySelector('li.curriculum-item-link--is-current--2mKk4');
					if (!current) return;

					let next = current.nextElementSibling;
					while (next && !next.matches('li[aria-current="false"]')) {
						next = next.nextElementSibling;
					}

					if (next) {
						const playBtn = next.querySelector('button[aria-label^="Reproduzir"]');
						if (playBtn) playBtn.click();
					}
				}
			});

			skipObserver.observe(document.body, { childList: true, subtree: true });
		} else if (skipObserver) {
			skipObserver.disconnect();
		}
	});
}
