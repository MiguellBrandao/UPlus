import { initStatsPanel } from './initStatsPanel.js';
import { observeVideoContainer } from './initVideoControls.js';

const faCSS = document.createElement('link');
faCSS.rel = 'stylesheet';
faCSS.href = chrome.runtime.getURL('libs/css/fontawesome.min.css');
document.head.appendChild(faCSS);

initStatsPanel();
observeVideoContainer();
