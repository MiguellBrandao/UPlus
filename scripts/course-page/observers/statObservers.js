import { updatePanelStatsFromToggle } from '../ui/panel.js';
import { getSettingsSync } from '../services/settingsStore.js';

function getLessonKey(checkbox, index) {
  const li = checkbox.closest('li');
  if (!li) return `idx:${index}`;

  const lectureAnchor = li.querySelector('a[href*="/learn/lecture/"]');
  const href = lectureAnchor?.getAttribute('href') || '';
  const match = href.match(/\/learn\/lecture\/(\d+)/);
  if (match?.[1]) return `lecture:${match[1]}`;

  return `idx:${index}`;
}

function getProgressCheckboxes() {
  return Array.from(
    document.querySelectorAll('input[type="checkbox"][data-purpose="progress-toggle-button"]')
  );
}

function readCheckboxStateMap() {
  const map = new Map();
  getProgressCheckboxes().forEach((checkbox, index) => {
    map.set(getLessonKey(checkbox, index), Boolean(checkbox.checked));
  });
  return map;
}

function applyStateDiff(previousMap, nextMap) {
  if (window.__uplusBulkActionRunning) return;
  if (!getSettingsSync().autoRefreshStats) return;

  const checkboxes = getProgressCheckboxes();
  checkboxes.forEach((checkbox, index) => {
    const key = getLessonKey(checkbox, index);
    if (!previousMap.has(key) || !nextMap.has(key)) return;

    const previousChecked = previousMap.get(key);
    const nextChecked = nextMap.get(key);
    if (previousChecked === nextChecked) return;

    updatePanelStatsFromToggle(checkbox);
  });
}

export function monitorCheckboxChanges() {
  if (window.__uplusStatsObserverBound) return;
  window.__uplusStatsObserverBound = true;

  let lastState = readCheckboxStateMap();
  let scheduled = false;

  const scheduleDiff = () => {
    if (scheduled) return;
    scheduled = true;

    window.setTimeout(() => {
      const nextState = readCheckboxStateMap();
      applyStateDiff(lastState, nextState);
      lastState = nextState;
      scheduled = false;
    }, 120);
  };

  document.body.addEventListener('change', e => {
    if (
      e.target &&
      e.target.matches('input[type="checkbox"][data-purpose="progress-toggle-button"]')
    ) {
      if (window.__uplusBulkActionRunning) return;
      if (!getSettingsSync().autoRefreshStats) return;
      updatePanelStatsFromToggle(e.target);
      lastState = readCheckboxStateMap();
    }
  });

  const observer = new MutationObserver(() => {
    scheduleDiff();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['checked', 'aria-checked', 'class']
  });

  // Fallback for property-only changes that do not trigger change/mutation consistently.
  window.setInterval(() => {
    scheduleDiff();
  }, 800);
}
