const SETTINGS_KEY = 'uplus_settings';
const CONFIRM_PREFS_KEY = 'uplus_confirm_dialogs';
const DEFAULT_CONFIRM_PREFS = {
  markAll: true,
  reset: true,
  refresh: true
};

const DEFAULT_SETTINGS = {
  showCourseImage: true,
  autoRefreshStats: true,
  showPercentCompleted: true,
  showRemainingTime: true,
  showStatsMeta: false,
  statsCacheTtlHours: 1,
  highlightSectionProgress: true,
  persistVideoControllerState: true
};

const fields = {
  showCourseImage: document.getElementById('setting-show-image'),
  showPercentCompleted: document.getElementById('setting-show-percent'),
  showRemainingTime: document.getElementById('setting-show-remaining'),
  showStatsMeta: document.getElementById('setting-show-meta'),
  sectionHighlights: document.getElementById('setting-section-highlights'),
  persistControllers: document.getElementById('setting-persist-controllers'),
  refreshMode: document.getElementById('setting-refresh-mode'),
  cacheTtlHours: document.getElementById('setting-cache-ttl'),
  confirmMarkAll: document.getElementById('confirm-markall'),
  confirmReset: document.getElementById('confirm-reset'),
  confirmRefresh: document.getElementById('confirm-refresh')
};

const saveBtn = document.getElementById('save-settings');
const toastStack = document.getElementById('toast-stack');

function showToast(message, variant = 'success') {
  if (!toastStack) return;

  const toast = document.createElement('div');
  toast.className = `toast-item ${variant}`;
  toast.textContent = message;
  toastStack.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  window.setTimeout(() => {
    toast.classList.remove('visible');
    window.setTimeout(() => toast.remove(), 260);
  }, 10000);
}

function fillForm(settings) {
  fields.showCourseImage.checked = Boolean(settings.showCourseImage);
  fields.showPercentCompleted.checked = Boolean(settings.showPercentCompleted);
  fields.showRemainingTime.checked = Boolean(settings.showRemainingTime);
  fields.showStatsMeta.checked = Boolean(settings.showStatsMeta);
  fields.sectionHighlights.checked = Boolean(settings.highlightSectionProgress);
  fields.persistControllers.checked = Boolean(settings.persistVideoControllerState);
  fields.refreshMode.value = settings.autoRefreshStats ? 'auto' : 'manual';
  fields.cacheTtlHours.value = String(settings.statsCacheTtlHours || 1);
}

function fillConfirmPrefs(confirmPrefs) {
  fields.confirmMarkAll.value = confirmPrefs.markAll ? 'active' : 'ignored';
  fields.confirmReset.value = confirmPrefs.reset ? 'active' : 'ignored';
  fields.confirmRefresh.value = confirmPrefs.refresh ? 'active' : 'ignored';
}

function readForm() {
  return {
    showCourseImage: fields.showCourseImage.checked,
    showPercentCompleted: fields.showPercentCompleted.checked,
    showRemainingTime: fields.showRemainingTime.checked,
    showStatsMeta: fields.showStatsMeta.checked,
    highlightSectionProgress: fields.sectionHighlights.checked,
    persistVideoControllerState: fields.persistControllers.checked,
    autoRefreshStats: fields.refreshMode.value === 'auto',
    statsCacheTtlHours: Number(fields.cacheTtlHours.value) || 1
  };
}

function readConfirmPrefs() {
  return {
    markAll: fields.confirmMarkAll.value === 'active',
    reset: fields.confirmReset.value === 'active',
    refresh: fields.confirmRefresh.value === 'active'
  };
}

async function loadSettings() {
  const result = await chrome.storage.local.get([SETTINGS_KEY, CONFIRM_PREFS_KEY]);
  fillForm({ ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] || {}) });
  fillConfirmPrefs({ ...DEFAULT_CONFIRM_PREFS, ...(result[CONFIRM_PREFS_KEY] || {}) });
}

saveBtn.addEventListener('click', async () => {
  const next = readForm();
  const confirmPrefs = readConfirmPrefs();
  await chrome.storage.local.set({
    [SETTINGS_KEY]: next,
    [CONFIRM_PREFS_KEY]: confirmPrefs
  });

  fillConfirmPrefs(confirmPrefs);
  showToast(`Settings saved!`);
});

loadSettings();
