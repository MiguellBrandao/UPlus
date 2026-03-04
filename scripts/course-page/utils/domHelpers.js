function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function expandAllSections(callback) {
  const togglers = Array.from(
    document.querySelectorAll(
      '.ud-accordion-panel-toggler, [class*="accordion-panel-module--outer-panel-toggler--"], .js-panel-toggler'
    )
  );

  for (const toggler of togglers) {
    const trigger = toggler.tagName === 'BUTTON' ? toggler : toggler.querySelector('button') || toggler;
    const expanded = trigger.getAttribute('aria-expanded') === 'true';
    if (expanded) continue;

    try {
      trigger.click();
      await sleep(100);
    } catch (e) {
      console.warn('Failed to expand section:', e);
    }
  }

  await sleep(900);
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