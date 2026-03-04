import { updatePanelStats } from '../ui/panel.js';
import { getSettingsSync } from '../services/settingsStore.js';

export function monitorCheckboxChanges() {
  document.body.addEventListener('change', e => {
    if (
      e.target &&
      e.target.matches('input[type="checkbox"][data-purpose="progress-toggle-button"]')
    ) {
      if (!getSettingsSync().autoRefreshStats) return;
      updatePanelStats({ forceRefresh: true, expandBeforeScrape: false });
    }
  });
}

export function watchCurrentLessonChange() {
  let lastUrl = location.href;

  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      if (!getSettingsSync().autoRefreshStats) return;
      updatePanelStats({ forceRefresh: true, expandBeforeScrape: false });
    }
  }, 1000);
}
