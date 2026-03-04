function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getSectionButtons() {
  const primary = Array.from(
    document.querySelectorAll(
      'button.js-panel-toggler, .ud-accordion-panel-toggler button, [class*="accordion-panel-module--outer-panel-toggler--"] button'
    )
  );

  if (primary.length > 0) {
    return Array.from(new Set(primary));
  }

  const fallback = Array.from(
    document.querySelectorAll(
      '.ud-accordion-panel-toggler, [class*="accordion-panel-module--outer-panel-toggler--"], .js-panel-toggler'
    )
  ).map(node => (node.tagName === 'BUTTON' ? node : node.querySelector('button')));

  return Array.from(new Set(fallback.filter(Boolean)));
}

export async function expandAllSectionsWithState() {
  const buttons = getSectionButtons();
  const sectionState = buttons.map(button => ({
    button,
    wasExpanded: button.getAttribute('aria-expanded') === 'true'
  }));

  for (const entry of sectionState) {
    const expanded = entry.button.getAttribute('aria-expanded') === 'true';
    if (expanded) continue;

    try {
      entry.button.click();
      await sleep(100);
    } catch (e) {
      console.warn('Failed to expand section:', e);
    }
  }

  await sleep(900);
  return sectionState;
}

export async function restoreSectionState(sectionState = []) {
  for (const entry of sectionState) {
    if (entry.wasExpanded) continue;
    if (!entry.button?.isConnected) continue;

    const isExpandedNow = entry.button.getAttribute('aria-expanded') === 'true';
    if (!isExpandedNow) continue;

    try {
      entry.button.click();
      await sleep(80);
    } catch (e) {
      console.warn('Failed to restore section state:', e);
    }
  }
}

export function focusTopPreviouslyOpenSection(sectionState = []) {
  const topOpenEntry = sectionState.find(entry => entry.wasExpanded && entry.button?.isConnected);
  if (!topOpenEntry) return;

  try {
    topOpenEntry.button.focus({ preventScroll: true });
    topOpenEntry.button.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    console.warn('Failed to focus top open section:', e);
  }
}

export async function expandAllSections(callback) {
  await expandAllSectionsWithState();
  if (typeof callback === 'function') callback();
}

export function waitForVideoElement(callback, timeout = 10000) {
  const start = Date.now();
  const interval = setInterval(() => {
    const video = document.querySelector('video');
    if (video) {
      clearInterval(interval);
      callback(video);
    } else if (Date.now() - start > timeout) {
      clearInterval(interval);
      console.warn('Timeout waiting for <video> element');
    }
  }, 300);
}

export function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const interval = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(interval);
        resolve(element);
      } else if (Date.now() - start > timeout) {
        clearInterval(interval);
        reject(new Error(`Element "${selector}" not found within ${timeout}ms`));
      }
    }, 100);
  });
}
