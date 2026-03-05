import {
  getCourseStats,
  getCourseTitle,
  getCacheTtlHours,
  updateStatsFromLessonToggle
} from '../services/statsService.js';
import { getCourseIdFromDOM, fetchCourseImage } from '../services/udemyApi.js';
import { formatDuration } from '../utils/formatters.js';
import { showConfirmModal } from './confirmModal.js';
import { showLoadingOverlay, hideLoadingOverlay } from './loadingOverlay.js';
import { savePanelState, getPanelState, setMinimizedState } from '../services/storageService.js';
import { markAllLessons } from '../services/courseActions.js';
import {
  getSettingsSync,
  getSettings,
  subscribeToSettings
} from '../services/settingsStore.js';

const RISK_NOTE =
  'Warning: This action is not officially recommended by Udemy. There are no known reports of bans for using this feature, but use it at your own risk.';
const DEFAULT_CONFIRM_PREFS = {
  markAll: true,
  reset: true,
  refresh: true
};
const CONFIRM_PREFS_KEY = 'uplus_confirm_dialogs';

let currentSettings = getSettingsSync();
let unsubscribeSettings = null;
let currentConfirmPrefs = { ...DEFAULT_CONFIRM_PREFS };

async function loadConfirmPrefs() {
  try {
    const result = await chrome.storage.local.get(CONFIRM_PREFS_KEY);
    currentConfirmPrefs = { ...DEFAULT_CONFIRM_PREFS, ...(result[CONFIRM_PREFS_KEY] || {}) };
  } catch {
    currentConfirmPrefs = { ...DEFAULT_CONFIRM_PREFS };
  }

  return { ...currentConfirmPrefs };
}

async function setConfirmPreference(actionKey, shouldShow) {
  currentConfirmPrefs[actionKey] = shouldShow;
  try {
    await chrome.storage.local.set({ [CONFIRM_PREFS_KEY]: currentConfirmPrefs });
  } catch (error) {
    console.warn('Failed to persist confirm preference:', error);
  }
}

function applyPanelSettings(panel, settings) {
  currentSettings = { ...settings };

  const imageWrapper = panel.querySelector('.course-image-wrapper');
  if (imageWrapper) {
    imageWrapper.style.display = settings.showCourseImage ? 'block' : 'none';
  }

  const percentBlock = panel.querySelector('.stats-percent-block');
  if (percentBlock) {
    percentBlock.style.display = settings.showPercentCompleted ? 'block' : 'none';
  }

  const remainingBlock = panel.querySelector('.stats-remaining-block');
  if (remainingBlock) {
    remainingBlock.style.display = settings.showRemainingTime ? 'block' : 'none';
  }

  const cacheMeta = panel.querySelector('#stats-cache-meta');
  if (cacheMeta) {
    cacheMeta.style.display = settings.showStatsMeta ? 'block' : 'none';
  }
}

function applyStatsToPanel(panel, stats) {
  const lessonsEl = panel.querySelector('.stats-lessons');
  const durationEl = panel.querySelector('.stats-duration');
  const remainingEl = panel.querySelector('.stats-remaining-value');
  const percentEl = panel.querySelector('.stats-percent');
  const cacheMetaEl = panel.querySelector('#stats-cache-meta');
  const shortFormat = panel.offsetWidth < 340;

  const remainingMinutes = Math.max(0, stats.totalMinutes - stats.completedMinutes);

  if (lessonsEl) lessonsEl.innerText = `${stats.completedLessons}/${stats.totalLessons}`;
  if (durationEl) {
    durationEl.innerText = `${formatDuration(stats.completedMinutes, shortFormat)} / ${formatDuration(stats.totalMinutes, shortFormat)}`;
  }
  if (remainingEl) {
    remainingEl.innerText = formatDuration(remainingMinutes, false);
  }
  if (percentEl) percentEl.innerText = `${stats.progressPercent}%`;

  if (cacheMetaEl) {
    const source = stats.source || (stats.fromCache ? 'cache' : 'live scrape');
    const sourceLabel = source === 'incremental' ? 'instant update' : source;
    const updated = new Date(stats.timestamp).toLocaleString('en-US');
    cacheMetaEl.innerText = `Source: ${sourceLabel} | Updated: ${updated} | TTL: ${getCacheTtlHours()}h`;
  }
}

export async function updatePanelStats({
  forceRefresh = false,
  expandBeforeScrape = true,
  showLoading = false
} = {}) {
  const panel = document.querySelector('#udemy-plus-panel');
  if (!panel) return;

  const refreshBtn = panel.querySelector('#refresh-stats-btn');
  if (refreshBtn) refreshBtn.disabled = true;
  if (showLoading) showLoadingOverlay();

  try {
    const stats = await getCourseStats({ forceRefresh, expandBeforeScrape });
    applyStatsToPanel(panel, stats);
  } catch (error) {
    console.warn('Failed to update panel stats:', error);
  } finally {
    if (showLoading) hideLoadingOverlay();
    if (refreshBtn) refreshBtn.disabled = false;
  }
}

export function updatePanelStatsFromToggle(checkboxEl) {
  const panel = document.querySelector('#udemy-plus-panel');
  if (!panel) return;

  const deltaStats = updateStatsFromLessonToggle(checkboxEl);
  if (deltaStats) {
    applyStatsToPanel(panel, deltaStats);
    return;
  }

  void updatePanelStats({ forceRefresh: true, expandBeforeScrape: true });
}

function runBulkAction(completed) {
  const actionKey = completed ? 'markAll' : 'reset';
  if (!currentConfirmPrefs[actionKey]) {
    markAllLessons?.(completed);
    return;
  }

  showConfirmModal({
    title: completed ? 'Confirm Mark All' : 'Confirm Reset',
    message: completed
      ? 'Are you sure you want to mark all lessons as completed?'
      : 'Are you sure you want to reset all lessons?',
    riskNote: RISK_NOTE,
    suppressLabel: "Don't show this warning again for this action",
    onConfirm: ({ dontShowAgain }) => {
      if (dontShowAgain) {
        void setConfirmPreference(actionKey, false);
      }
      markAllLessons?.(completed);
    }
  });
}

export function insertStatsPanel() {
  if (document.querySelector('#udemy-plus-panel')) return;

  const { x, y, width, minimized } = getPanelState();
  const courseTitle = getCourseTitle();

  const panel = document.createElement('div');
  panel.id = 'udemy-plus-panel';
  panel.className = 'udemyplus-stats-panel';
  panel.style.cssText = `
    width: ${width}px;
    transform: translate(${x}px, ${y}px);
  `;

  panel.innerHTML = `
    <div class="card shadow-lg border-0 uplus-theme-default" style="font-family: 'Poppins', sans-serif;">
      <div class="card-header udemyplus-panel-header d-flex justify-content-between align-items-center bg-dark text-white p-4">
        <span class="uplus-brand-label"><img src="${chrome.runtime.getURL('assets/icon-32.png')}" alt="UdemyPlus" class="uplus-brand-icon" />UdemyPlus</span>
        <div class="d-flex align-items-center" style="gap: 8px;">
          <button id="refresh-stats-btn" class="btn p-0 m-0 border-0 bg-transparent text-white" title="Refresh stats now" style="font-size: 1.2rem;">
            <i class="fa-solid fa-rotate-right"></i>
          </button>
          <button id="minimize-btn" class="btn p-0 m-0 border-0 bg-transparent text-white" style="font-size: 1.4rem;">${minimized ? '+' : '&minus;'}</button>
        </div>
      </div>
      <div class="card-body" id="panel-body" style="display: ${minimized ? 'none' : 'block'};">
        <div class="d-flex align-items-center mb-3">
          <h5 class="stats-title fw-bold m-0">${courseTitle}</h5>
        </div>
        <div class="course-image-wrapper text-center mb-3">
          <img id="course-image" class="udemyplus-course-image" src="" alt="Course Cover" />
        </div>
        <div class="d-flex mb-2" style="gap: 10px;">
          <div class="flex-fill text-center rounded p-2">
            <div class="stats-lessons fw-semibold">-/-</div>
            <div class="stats-description">lessons completed</div>
          </div>
          <div class="flex-fill text-center rounded p-2">
            <div class="stats-duration fw-semibold">loading...</div>
            <div class="stats-description">watched / total</div>
          </div>
        </div>
        <div class="stats-secondary-row mb-2">
          <div class="text-center rounded p-2 flex-fill stats-percent-block">
            <div class="stats-percent fw-bold">0%</div>
            <div class="stats-description">completed</div>
          </div>
          <div class="text-center rounded p-2 flex-fill stats-remaining-block">
            <div class="stats-percent stats-remaining-value fw-bold">0h 0min</div>
            <div class="stats-description">remaining</div>
          </div>
        </div>
        <div class="text-center mb-3">
          <button class="btn btn-success px-4 py-2 me-2 fw-semibold" id="complete-all" title="Use at your own risk. Not officially recommended by Udemy.">Mark All</button>
          <button class="btn btn-danger px-4 py-2 fw-semibold" id="reset-all" title="Use at your own risk. Not officially recommended by Udemy.">Reset</button>
        </div>
        <p id="stats-cache-meta" class="udemyplus-cache-meta">Source: loading...</p>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  void loadConfirmPrefs();
  chrome.storage.onChanged.addListener(changes => {
    const confirmEntry = changes[CONFIRM_PREFS_KEY];
    if (confirmEntry) {
      currentConfirmPrefs = { ...DEFAULT_CONFIRM_PREFS, ...(confirmEntry.newValue || {}) };
    }
  });

  getSettings().then(settings => applyPanelSettings(panel, settings));

  if (unsubscribeSettings) unsubscribeSettings();
  unsubscribeSettings = subscribeToSettings(nextSettings => applyPanelSettings(panel, nextSettings));

  const courseId = getCourseIdFromDOM();
  fetchCourseImage(courseId).then(url => {
    if (url) {
      const img = panel.querySelector('#course-image');
      if (img) img.src = url;
    }
  });

  const btn = document.getElementById('minimize-btn');
  const refreshBtn = document.getElementById('refresh-stats-btn');
  const body = document.getElementById('panel-body');
  const completeAllBtn = document.getElementById('complete-all');
  const resetAllBtn = document.getElementById('reset-all');

  if (btn && body) {
    btn.addEventListener('click', () => {
      const isNowMinimized = body.style.display !== 'none';
      body.style.display = isNowMinimized ? 'none' : 'block';
      btn.innerHTML = isNowMinimized ? '+' : '&minus;';
      setMinimizedState(isNowMinimized);
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      if (!currentConfirmPrefs.refresh) {
        updatePanelStats({ forceRefresh: true, expandBeforeScrape: true, showLoading: true });
        return;
      }

      showConfirmModal({
        title: 'Confirm Refresh',
        message:
          'This will run a full stats refresh and temporarily expand all sections. Continue?',
        riskNote:
          '',
        suppressLabel: "Don't show this warning again for refresh",
        onConfirm: ({ dontShowAgain }) => {
          if (dontShowAgain) {
            void setConfirmPreference('refresh', false);
          }
          updatePanelStats({ forceRefresh: true, expandBeforeScrape: true, showLoading: true });
        }
      });
    });
  }

  if (completeAllBtn) {
    completeAllBtn.addEventListener('click', () => runBulkAction(true));
  }

  if (resetAllBtn) {
    resetAllBtn.addEventListener('click', () => runBulkAction(false));
  }

  if (typeof interact !== 'undefined') {
    interact('#udemy-plus-panel').draggable({
      allowFrom: '.card-header',
      listeners: {
        move(event) {
          const target = event.target;
          const dx = event.dx;
          const dy = event.dy;

          const match = target.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
          let nextX = match ? parseFloat(match[1]) + dx : dx;
          let nextY = match ? parseFloat(match[2]) + dy : dy;

          const panelRect = target.getBoundingClientRect();
          const padding = 5;

          if (nextX < padding) nextX = padding;
          if (nextX + panelRect.width > window.innerWidth - padding)
            nextX = window.innerWidth - panelRect.width - padding;
          if (nextY < padding) nextY = padding;
          if (nextY + panelRect.height > window.innerHeight - padding)
            nextY = window.innerHeight - panelRect.height - padding;

          target.style.transform = `translate(${nextX}px, ${nextY}px)`;
          savePanelState({ x: nextX, y: nextY });
        }
      }
    });
  }

  const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const newWidth = Math.round(entry.contentRect.width);
      const transformMatch = panel.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
      const currentX = transformMatch ? parseFloat(transformMatch[1]) : x;
      const currentY = transformMatch ? parseFloat(transformMatch[2]) : y;
      savePanelState({ x: currentX, y: currentY, width: newWidth });
      updatePanelStats({ forceRefresh: false, expandBeforeScrape: false });
    }
  });

  resizeObserver.observe(panel);

  updatePanelStats({ forceRefresh: false, expandBeforeScrape: true });
}
