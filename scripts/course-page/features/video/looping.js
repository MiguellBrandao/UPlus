import { videoStateService } from '../../services/videoState.js';
import { waitForElement } from '../../utils/domHelpers.js';

let loopObserverStarted = false;
let boundLoopIcon = null;

export function setupLooping(video) {
  void video;

  const loopIcon = document.getElementById('udemyplus-loop');
  const loopTooltip = document.querySelector('#udemyplus-loop-wrapper .udemyplus-tooltip');
  if (!loopIcon || !loopTooltip || loopIcon === boundLoopIcon) return;
  boundLoopIcon = loopIcon;

  loopIcon.addEventListener('click', () => {
    const newState = !videoStateService.getLoopEnabled();

    if (newState && videoStateService.getAutoSkipEnabled()) {
      videoStateService.disableAutoSkip();
    }

    videoStateService.setLoopEnabled(newState);
    loopTooltip.textContent = `Loop Video (${newState ? 'ON' : 'OFF'})`;
    loopIcon.classList.toggle('text-success', newState);
  });

  if (loopObserverStarted) return;
  loopObserverStarted = true;

  const loopObserver = new MutationObserver(() => {
    const popup = document.querySelector('.interstitial--container--4wumM');
    if (popup && videoStateService.getLoopEnabled()) {
      const cancelBtn = popup.querySelector('button[data-purpose="cancel-button"]');
      if (cancelBtn) {
        cancelBtn.click();
        const currentVideo = document.querySelector('video');
        if (currentVideo) {
          currentVideo.currentTime = 0;
          waitForElement('button[data-purpose="play-button"]')
            .then(playBtn => {
              setTimeout(() => playBtn.click(), 500);
            })
            .catch(err => console.warn(err));
        }
      }
    }
  });

  loopObserver.observe(document.body, { childList: true, subtree: true });
}
