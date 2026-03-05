import { updatePanelStatsFromToggle } from '../ui/panel.js';
import { getSettingsSync } from '../services/settingsStore.js';

export function monitorCheckboxChanges() {
  document.body.addEventListener('change', e => {
    if (
      e.target &&
      e.target.matches('input[type="checkbox"][data-purpose="progress-toggle-button"]')
    ) {
      if (window.__uplusBulkActionRunning) return;
      if (!getSettingsSync().autoRefreshStats) return;
      updatePanelStatsFromToggle(e.target);
    }
  });
}
