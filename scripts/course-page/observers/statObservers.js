import { updatePanelStats } from '../ui/panel.js';

export function monitorCheckboxChanges() {
	document.body.addEventListener('change', e => {
		if (
			e.target &&
			e.target.matches('input[type="checkbox"][data-purpose="progress-toggle-button"]')
		) {
			updatePanelStats();
		}
	});
}

export function watchCurrentLessonChange() {
	let lastUrl = location.href;

	setInterval(() => {
		if (location.href !== lastUrl) {
			console.log('🎬 Detetada mudança de vídeo via URL');
			lastUrl = location.href;
			updatePanelStats();
		}
	}, 1000);
}
