export function expandAllSections(callback) {
	const buttons = document.querySelectorAll('button.js-panel-toggler');
	let initiallyOpenIndex = null;

	buttons.forEach((btn, index) => {
		if (btn.getAttribute('aria-expanded') === 'true' && initiallyOpenIndex === null) {
			initiallyOpenIndex = index;
		}
	});

	const collapsed = document.querySelectorAll('button.js-panel-toggler[aria-expanded="false"]');
	collapsed.forEach(btn => {
		try {
			btn.click();
		} catch (e) {
			console.warn('❌ Failed to expand section:', e);
		}
	});

	setTimeout(() => {
		if (typeof callback === 'function') callback();
	}, 800);
}

export function waitForVideoElement(callback, timeout = 10000) {
	const start = Date.now();
	const interval = setInterval(() => {
		const video = document.querySelector('video');
		if (video) {
			clearInterval(interval);
			callback(video);
		} else if (Date.now() - start > timeout) {
			clearInterval(interval);
			console.warn('⚠️ Timeout esperando pelo elemento <video>');
		}
	}, 300);
}
