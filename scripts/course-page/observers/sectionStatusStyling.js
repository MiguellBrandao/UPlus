import { getSettingsSync, subscribeToSettings } from '../services/settingsStore.js';

const SECTION_BUTTON_SELECTOR = [
  'button.js-panel-toggler',
  '.ud-accordion-panel-toggler button',
  '[class*="accordion-panel-module--outer-panel-toggler--"] button'
].join(', ');

const SECTION_CONTAINER_SELECTOR = [
  '[class*="accordion-panel-module--panel--"]',
  '.ud-accordion-panel',
  'li[class*="section--section"]'
].join(', ');

function parseSectionProgressFromText(text) {
  if (!text) return null;
  const match = text.match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return null;

  const completed = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isFinite(completed) || !Number.isFinite(total) || total <= 0) return null;
  return { completed, total };
}

function getSectionProgress(button) {
  const container = button.closest(SECTION_CONTAINER_SELECTOR) || button.parentElement;
  if (!container) return null;

  const statusTextEl =
    container.querySelector('[data-purpose="section-duration"] span[aria-hidden="true"]') ||
    container.querySelector('[data-purpose="section-duration"]');

  return parseSectionProgressFromText(statusTextEl?.textContent || '');
}

function clearSectionStyles(button) {
  button.classList.remove(
    'uplus-section-complete',
    'uplus-section-progress',
    'uplus-section-not-started'
  );
}

function applySectionStyles() {
  const { highlightSectionProgress } = getSettingsSync();
  const sectionButtons = Array.from(document.querySelectorAll(SECTION_BUTTON_SELECTOR));

  sectionButtons.forEach(button => {
    clearSectionStyles(button);
    if (!highlightSectionProgress) return;

    const progress = getSectionProgress(button);
    if (!progress) return;

    if (progress.completed === 0) {
      button.classList.add('uplus-section-not-started');
      return;
    }

    if (progress.completed >= progress.total && progress.completed > 0) {
      button.classList.add('uplus-section-complete');
      return;
    }

    if (progress.completed > 0 && progress.completed < progress.total) {
      button.classList.add('uplus-section-progress');
    }
  });
}

export function initSectionStatusStyling() {
  if (window.__uplusSectionStylingBound) return;
  window.__uplusSectionStylingBound = true;

  let scheduled = false;
  const scheduleApply = () => {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(() => {
      applySectionStyles();
      scheduled = false;
    }, 150);
  };

  applySectionStyles();
  subscribeToSettings(() => applySectionStyles());

  const observer = new MutationObserver(() => {
    scheduleApply();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}
