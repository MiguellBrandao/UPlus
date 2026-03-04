import { initStatsPanel } from './initStatsPanel.js';
import { observeVideoContainer } from './initVideoControls.js';
import { initSettingsStore } from './services/settingsStore.js';
import { initKeyboardShortcuts } from './keyboardShortcuts.js';

const faCSS = document.createElement('link');
faCSS.rel = 'stylesheet';
faCSS.href = chrome.runtime.getURL('libs/css/fontawesome.min.css');
document.head.appendChild(faCSS);

async function boot() {
  await initSettingsStore();
  initStatsPanel();
  observeVideoContainer();
  initKeyboardShortcuts();
}

boot();
