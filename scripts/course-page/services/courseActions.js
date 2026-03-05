import {
  expandAllSectionsWithState,
  restoreSectionState,
  focusTopPreviouslyOpenSection
} from '../utils/domHelpers.js';
import { updatePanelStats } from '../ui/panel.js';
import { showLoadingOverlay, hideLoadingOverlay } from '../ui/loadingOverlay.js';

function getProgressCheckboxes() {
  return Array.from(document.querySelectorAll('input[data-purpose="progress-toggle-button"]'));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function markAllLessons(completed) {
  showLoadingOverlay();
  window.__uplusBulkActionRunning = true;

  let sectionState = [];
  try {
    sectionState = await expandAllSectionsWithState();

    const checkboxes = getProgressCheckboxes();
    checkboxes.forEach(checkbox => {
      if (checkbox.checked !== completed) checkbox.click();
    });

    // Let Udemy update its own UI state after bulk click.
    await sleep(700);
    await updatePanelStats({ forceRefresh: true, expandBeforeScrape: false });
  } catch (error) {
    console.warn('Failed to mark all lessons:', error);
  } finally {
    await restoreSectionState(sectionState);
    focusTopPreviouslyOpenSection(sectionState);
    hideLoadingOverlay();
    window.__uplusBulkActionRunning = false;
  }
}
