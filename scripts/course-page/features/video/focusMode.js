export function setupFocusMode(video) {
	let focusActive = false;
	let overlay = null;
	const focusIcon = document.getElementById('udemyplus-focus');
	const focusTooltip = document.querySelector('#udemyplus-focus-wrapper .udemyplus-tooltip');

	focusIcon.addEventListener('click', () => {
		const videoParent = video?.parentElement?.parentElement?.parentElement;
		const panel = document.getElementById('udemy-plus-panel');
		const videoControlsInner = document.querySelector('#udemyplus-video-controls > div');
		const markAllBtn = document.getElementById('complete-all');
		const resetAllBtn = document.getElementById('reset-all');

		if (!focusActive) {
			overlay = document.createElement('div');
			overlay.className = 'udemyplus-focus-overlay';
			document.body.appendChild(overlay);
			requestAnimationFrame(() => (overlay.style.opacity = '1'));

			if (videoParent) videoParent.classList.add('udemyplus-focus-clear');

			if (panel) panel.classList.add('udemyplus-fade-out');
			if (videoControlsInner) videoControlsInner.classList.add('udemyplus-fade-out');

			if (markAllBtn) markAllBtn.style.display = 'none';
			if (resetAllBtn) resetAllBtn.style.display = 'none';

			focusTooltip.textContent = `Focus Mode (ON)`;
			focusIcon.classList.add('text-success');
			focusActive = true;
		} else {
			if (overlay) {
				overlay.style.opacity = '0';
				setTimeout(() => overlay.remove(), 400);
			}
			if (videoParent) videoParent.classList.remove('udemyplus-focus-clear');

			if (panel) panel.classList.remove('udemyplus-fade-out');
			if (videoControlsInner) videoControlsInner.classList.remove('udemyplus-fade-out');

			if (markAllBtn) markAllBtn.style.display = '';
			if (resetAllBtn) resetAllBtn.style.display = '';

			focusTooltip.textContent = `Focus Mode (OFF)`;
			focusIcon.classList.remove('text-success');
			focusActive = false;
		}
	});
}
