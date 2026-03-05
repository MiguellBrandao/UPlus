import { videoStateService } from '../../services/videoState.js';

let skipObserver = null;
let boundButton = null;

function findNextLessonButton() {
  const currentItem =
    document.querySelector('li.curriculum-item-link--is-current--2mKk4') ||
    document.querySelector('li[aria-current="true"]');
  if (!currentItem) return null;

  let next = currentItem.nextElementSibling;
  while (next) {
    const clickable =
      next.querySelector('a[href*="/learn/lecture/"]') ||
      next.querySelector('button[data-purpose="lecture-item-link"]') ||
      next.querySelector('button');
    if (clickable) return clickable;
    next = next.nextElementSibling;
  }

  return null;
}

function ensureSkipObserver() {
  if (skipObserver) return;

  skipObserver = new MutationObserver(() => {
    const popup = document.querySelector('.interstitial--container--4wumM');
    if (!popup || !videoStateService.getAutoSkipEnabled()) return;

    popup.style.display = 'none';

    const nextLesson = findNextLessonButton();
    if (nextLesson) {
      nextLesson.click();
    }
  });
}

export function setupAutoSkip(video) {
  void video;

  const autoSkipBtn = document.getElementById('udemyplus-disable-next');
  if (!autoSkipBtn || autoSkipBtn === boundButton) return;
  boundButton = autoSkipBtn;

  const syncUiAndObserver = () => {
    const enabled = videoStateService.getAutoSkipEnabled();
    autoSkipBtn.classList.toggle('text-success', enabled);
    const tooltip = autoSkipBtn.nextElementSibling;
    if (tooltip) tooltip.textContent = `Auto Skip Delay (${enabled ? 'ON' : 'OFF'})`;

    if (enabled) {
      ensureSkipObserver();
      skipObserver.observe(document.body, { childList: true, subtree: true });
    } else if (skipObserver) {
      skipObserver.disconnect();
    }
  };

  autoSkipBtn.addEventListener('click', () => {
    const newState = !videoStateService.getAutoSkipEnabled();

    if (newState && videoStateService.getLoopEnabled()) {
      videoStateService.disableLoop();
    }

    videoStateService.setAutoSkipEnabled(newState);
    syncUiAndObserver();
  });

  syncUiAndObserver();
}
