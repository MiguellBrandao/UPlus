import { initVideoControls } from './ui/injectControlsUI.js';

export function observeVideoContainer() {
	const observer = new MutationObserver(() => {
		const bodyContainer = document.querySelector('.app--row--E-WFM.app--body-container--RJZF2');
		if (bodyContainer) {
			initVideoControls();
			observer.disconnect();
		}
	});

	observer.observe(document.body, { childList: true, subtree: true });
}
