import { insertStatsPanel } from './ui/panel.js';
import { monitorCheckboxChanges, watchCurrentLessonChange } from './observers/statObservers.js';
import { expandAllSections } from './utils/domHelpers.js';

export function initStatsPanel() {
	let tries = 0;
	const interval = setInterval(() => {
    const hasCurriculum =
      document.querySelectorAll('li.curriculum-item-link--curriculum-item--OVP5S').length > 0;
    const interactReady = typeof interact !== 'undefined';

		if (hasCurriculum && interactReady) {
			clearInterval(interval);
			expandAllSections(() => {
				insertStatsPanel();
				monitorCheckboxChanges();
				watchCurrentLessonChange();
			});
		}

    if (++tries > 60) clearInterval(interval);
  }, 500);
}
