import { videoStateService } from '../../services/videoState.js';

function getOverlay() {
  return document.querySelector('.udemyplus-focus-overlay');
}

function syncFocusUi(enabled) {
  const focusIcon = document.getElementById('udemyplus-focus');
  const focusTooltip = document.querySelector('#udemyplus-focus-wrapper .udemyplus-tooltip');

  if (focusTooltip) focusTooltip.textContent = `Focus Mode (${enabled ? 'ON' : 'OFF'})`;
  focusIcon?.classList.toggle('text-success', enabled);
}

function applyFocusState(video, enabled) {
  const currentVideo = document.querySelector('video') || video;
  const videoParent = currentVideo?.parentElement?.parentElement?.parentElement;
  const panel = document.getElementById('udemy-plus-panel');
  const videoControls = document.querySelector('#udemyplus-video-controls');
  const markAllBtn = document.getElementById('complete-all');
  const resetAllBtn = document.getElementById('reset-all');
  let overlay = getOverlay();

  if (enabled) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'udemyplus-focus-overlay';
      document.body.appendChild(overlay);
      requestAnimationFrame(() => (overlay.style.opacity = '1'));
    } else {
      overlay.style.opacity = '1';
    }

    if (videoParent) videoParent.classList.add('udemyplus-focus-clear');
    if (panel) panel.classList.add('udemyplus-fade-out');
    if (videoControls) videoControls.classList.add('udemyplus-fade-out');
    if (markAllBtn) markAllBtn.style.display = 'none';
    if (resetAllBtn) resetAllBtn.style.display = 'none';
  } else {
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        const currentOverlay = getOverlay();
        if (currentOverlay) currentOverlay.remove();
      }, 400);
    }

    if (videoParent) videoParent.classList.remove('udemyplus-focus-clear');
    if (panel) panel.classList.remove('udemyplus-fade-out');
    if (videoControls) videoControls.classList.remove('udemyplus-fade-out');
    if (markAllBtn) markAllBtn.style.display = '';
    if (resetAllBtn) resetAllBtn.style.display = '';
  }

  syncFocusUi(enabled);
}

export function setupFocusMode(video) {
  const focusIcon = document.getElementById('udemyplus-focus');
  if (!focusIcon) return;

  applyFocusState(video, videoStateService.getFocusModeEnabled());
  if (focusIcon.dataset.uplusBound === 'true') return;
  focusIcon.dataset.uplusBound = 'true';

  focusIcon.addEventListener('click', () => {
    const next = !videoStateService.getFocusModeEnabled();
    videoStateService.setFocusModeEnabled(next);
    applyFocusState(video, next);
  });
}
