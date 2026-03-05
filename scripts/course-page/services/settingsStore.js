export const SETTINGS_KEY = 'uplus_settings';

export const DEFAULT_SETTINGS = {
  showCourseImage: true,
  autoRefreshStats: true,
  showPercentCompleted: true,
  showRemainingTime: true,
  showStatsMeta: false,
  statsCacheTtlHours: 1,
  highlightSectionProgress: true,
  persistVideoControllerState: true
};

let settingsCache = { ...DEFAULT_SETTINGS };
let initialized = false;
let storageListenerBound = false;
const subscribers = new Set();

function notifySubscribers() {
  subscribers.forEach(handler => {
    try {
      handler({ ...settingsCache });
    } catch (error) {
      console.warn('Settings subscriber failed:', error);
    }
  });
}

export async function initSettingsStore() {
  if (initialized) return { ...settingsCache };

  try {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    settingsCache = { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] || {}) };
  } catch (error) {
    console.warn('Failed to load settings from storage:', error);
    settingsCache = { ...DEFAULT_SETTINGS };
  }

  if (!storageListenerBound) {
    chrome.storage.onChanged.addListener(changes => {
      const entry = changes[SETTINGS_KEY];
      if (!entry) return;
      settingsCache = { ...DEFAULT_SETTINGS, ...(entry.newValue || {}) };
      notifySubscribers();
    });
    storageListenerBound = true;
  }

  initialized = true;
  return { ...settingsCache };
}

export function getSettingsSync() {
  return { ...settingsCache };
}

export async function getSettings() {
  if (!initialized) {
    await initSettingsStore();
  }
  return { ...settingsCache };
}

export async function saveSettings(partial) {
  if (!initialized) {
    await initSettingsStore();
  }

  settingsCache = { ...settingsCache, ...partial };
  await chrome.storage.local.set({ [SETTINGS_KEY]: settingsCache });
  notifySubscribers();
  return { ...settingsCache };
}

export function subscribeToSettings(handler) {
  subscribers.add(handler);
  return () => subscribers.delete(handler);
}
