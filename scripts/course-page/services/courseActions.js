import { expandAllSections } from '../utils/domHelpers.js';
import { updatePanelStats } from '../ui/panel.js';
import { showLoadingOverlay, hideLoadingOverlay } from '../ui/loadingOverlay.js';

function getProgressCheckboxes() {
  return Array.from(document.querySelectorAll('input[data-purpose="progress-toggle-button"]'));
}

export async function markAllLessons(completed) {
  showLoadingOverlay();

  try {
    await expandAllSections();

    const checkboxes = getProgressCheckboxes();
    checkboxes.forEach(checkbox => {
      if (checkbox.checked !== completed) checkbox.click();
    });

    // Let Udemy update its own UI state after bulk click.
    setTimeout(() => {
      updatePanelStats();
      hideLoadingOverlay();
    }, 700);
  } catch (error) {
    console.warn('Failed to mark all lessons:', error);
    hideLoadingOverlay();
  }
}