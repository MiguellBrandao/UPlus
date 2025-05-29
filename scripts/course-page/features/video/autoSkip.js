export function setupAutoSkip(video) {
	const autoSkipBtn = document.getElementById('udemyplus-disable-next');
	let autoSkipEnabled = false;
	let skipObserver = null;

	autoSkipBtn.addEventListener('click', () => {
		autoSkipEnabled = !autoSkipEnabled;
		autoSkipBtn.classList.toggle('text-success', autoSkipEnabled);
		const tooltip = autoSkipBtn.nextElementSibling;
		tooltip.textContent = `Auto Skip Delay (${autoSkipEnabled ? 'ON' : 'OFF'})`;

		if (autoSkipEnabled && loopEnabled) {
			loopEnabled = false;
			loopIcon.classList.remove('text-success');
			loopTooltip.textContent = `Loop Video (OFF)`;
		}

		if (autoSkipEnabled) {
			if (skipObserver) skipObserver.disconnect();

			skipObserver = new MutationObserver(() => {
				const popup = document.querySelector('.interstitial--container--4wumM');
				if (popup && autoSkipEnabled) {
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
