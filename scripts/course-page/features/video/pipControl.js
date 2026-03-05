import { videoStateService } from '../../services/videoState.js';

function syncPipUi(enabled) {
  const pipBtn = document.getElementById('udemyplus-pip');
  const pipTooltip = document.querySelector('#udemyplus-pip-wrapper .udemyplus-tooltip');
  pipBtn?.classList.toggle('text-success', enabled);
  if (pipTooltip) pipTooltip.textContent = `Picture in Picture (${enabled ? 'ON' : 'OFF'})`;
}

async function applyPipState(video) {
  const currentVideo = document.querySelector('video') || video;
  if (!currentVideo) return;

  const enabled = videoStateService.getPipEnabled();
  syncPipUi(enabled);

  if (!document.pictureInPictureEnabled) return;

  try {
    if (!enabled && document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      return;
    }

    if (enabled) {
      if (
        document.pictureInPictureElement &&
        document.pictureInPictureElement !== currentVideo
      ) {
        await document.exitPictureInPicture();
      }

      if (document.pictureInPictureElement !== currentVideo) {
        await currentVideo.requestPictureInPicture();
      }
    }
  } catch {
    // Browsers may require explicit user gesture when auto-restoring PiP.
    // Keep desired state + UI; user can re-toggle if request is blocked.
  }
}

export function setupPipControl(video) {
  const pipBtn = document.getElementById('udemyplus-pip');
  if (!pipBtn) return;

  void applyPipState(video);

  if (video.dataset.uplusPipBound !== 'true') {
    video.dataset.uplusPipBound = 'true';
    video.addEventListener('enterpictureinpicture', () => {
      videoStateService.setPipEnabled(true);
      syncPipUi(true);
    });

    video.addEventListener('leavepictureinpicture', () => {
      videoStateService.setPipEnabled(false);
      syncPipUi(false);
    });
  }

  pipBtn.onclick = async () => {
    const next = !videoStateService.getPipEnabled();
    videoStateService.setPipEnabled(next);
    await applyPipState(video);
    syncPipUi(videoStateService.getPipEnabled());
  };
}
