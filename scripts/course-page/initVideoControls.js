import { initVideoControls } from './ui/injectControlsUI.js';
import { updatePanelStatsFromToggle } from './ui/panel.js';

function getLessonKey(checkbox, index) {
  const li = checkbox.closest('li');
  if (!li) return `idx:${index}`;

  const lectureAnchor = li.querySelector('a[href*="/learn/lecture/"]');
  const href = lectureAnchor?.getAttribute('href') || '';
  const match = href.match(/\/learn\/lecture\/(\d+)/);
  if (match?.[1]) return `lecture:${match[1]}`;

  const dataPurpose = li.getAttribute('data-purpose') || '';
  if (dataPurpose) return `purpose:${dataPurpose}:${index}`;

  return `idx:${index}`;
}

function snapshotCheckboxStates() {
  const checkboxes = Array.from(
    document.querySelectorAll('input[type="checkbox"][data-purpose="progress-toggle-button"]')
  );
  const map = new Map();

  checkboxes.forEach((checkbox, index) => {
    map.set(getLessonKey(checkbox, index), Boolean(checkbox.checked));
  });

  return map;
}

function syncIncrementalStatsFromChanges(previousMap) {
  if (!previousMap || previousMap.size === 0) return false;

  const checkboxes = Array.from(
    document.querySelectorAll('input[type="checkbox"][data-purpose="progress-toggle-button"]')
  );

  let hasChanges = false;
  checkboxes.forEach((checkbox, index) => {
    const key = getLessonKey(checkbox, index);
    if (!previousMap.has(key)) return;

    const previousChecked = previousMap.get(key);
    const currentChecked = Boolean(checkbox.checked);
    if (previousChecked === currentChecked) return;

    hasChanges = true;
    updatePanelStatsFromToggle(checkbox);
  });

  return hasChanges;
}

export function observeVideoContainer() {
  const getLectureId = () => {
    const match = location.pathname.match(/\/learn\/lecture\/(\d+)/);
    return match?.[1] || null;
  };

  let lastLectureId = getLectureId();
  let lastPathname = location.pathname;
  let lectureChangeTimer = null;
  let checkboxSnapshot = snapshotCheckboxStates();

  const handleLectureChange = () => {
    if (lectureChangeTimer) clearTimeout(lectureChangeTimer);

    lectureChangeTimer = window.setTimeout(() => {
      const previousSnapshot = checkboxSnapshot;
      initVideoControls({ forceRecreate: true });

      syncIncrementalStatsFromChanges(previousSnapshot);
      checkboxSnapshot = snapshotCheckboxStates();
    }, 350);
  };

  const observer = new MutationObserver(() => {
    initVideoControls();

    const currentLectureId = getLectureId();
    const currentPathname = location.pathname;
    const routeChanged = currentPathname !== lastPathname;
    const lectureChanged = routeChanged && currentLectureId && currentLectureId !== lastLectureId;

    if (lectureChanged) {
      lastPathname = currentPathname;
      lastLectureId = currentLectureId;
      handleLectureChange();
    } else {
      lastPathname = currentPathname;
      lastLectureId = currentLectureId || lastLectureId;
      checkboxSnapshot = snapshotCheckboxStates();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  window.setInterval(() => {
    const currentLectureId = getLectureId();
    const currentPathname = location.pathname;
    if (currentPathname === lastPathname) return;

    const lectureChanged = currentLectureId && currentLectureId !== lastLectureId;
    lastPathname = currentPathname;
    lastLectureId = currentLectureId || lastLectureId;

    if (lectureChanged) {
      handleLectureChange();
    }
  }, 500);
}
