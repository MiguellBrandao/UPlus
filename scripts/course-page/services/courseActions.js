import { expandAllSections } from '../utils/domHelpers.js';
import { updatePanelStats } from '../ui/panel.js';
import { showLoadingOverlay, hideLoadingOverlay } from '../ui/loadingOverlay.js';

export function markAllLessons(completed) {
	expandAllSections(() => {
		showLoadingOverlay();
		setTimeout(() => {
			const checkboxes = document.querySelectorAll(
				'input[data-purpose="progress-toggle-button"]'
			);
			checkboxes.forEach(checkbox => {
				if (checkbox.checked !== completed) checkbox.click();
			});
			hideLoadingOverlay();
			updatePanelStats();
		}, 800);
	});
}
