import { insertStatsPanel } from './features/progress/panel.js';
import { monitorCheckboxChanges, watchCurrentLessonChange } from './observers/statObservers.js';

export function initStatsPanel() {
	let tries = 0;
	const interval = setInterval(() => {
		const statsReady = document.querySelectorAll('[data-purpose="section-duration"]').length > 0;
		const interactReady = typeof interact !== 'undefined';

		if (statsReady && interactReady) {
			insertStatsPanel();
			monitorCheckboxChanges();
			watchCurrentLessonChange();
			clearInterval(interval);
		}

		if (++tries > 30) clearInterval(interval);
	}, 1000);
}
