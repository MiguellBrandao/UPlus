import { videoStateService } from '../../services/videoState.js';

export function setupSpeedControl(video) {
  const speedWrapper = document.getElementById('udemyplus-speed-wrapper');
  if (!speedWrapper) return;
  const speedTooltip = speedWrapper.querySelector('.udemyplus-tooltip');

  const getCurrentVideo = () => document.querySelector('video') || video;

  const applySpeed = rate => {
    const currentVideo = getCurrentVideo();
    if (!currentVideo) return;

    currentVideo.playbackRate = rate;
    if (speedTooltip) speedTooltip.textContent = `Speed (${currentVideo.playbackRate.toFixed(2)}x)`;
  };

  applySpeed(videoStateService.getPreferredPlaybackRate());

  // Udemy may swap media source on lecture change while keeping the same player shell.
  video.addEventListener('loadedmetadata', () => {
    applySpeed(videoStateService.getPreferredPlaybackRate());
  });

  speedWrapper.addEventListener('wheel', e => {
    e.preventDefault();
    const currentVideo = getCurrentVideo();
    if (!currentVideo) return;

    const increment = 0.1;
    const nextRate = currentVideo.playbackRate + (e.deltaY < 0 ? increment : -increment);
    videoStateService.setPreferredPlaybackRate(nextRate);
    applySpeed(videoStateService.getPreferredPlaybackRate());
  });

  speedWrapper.addEventListener('click', () => {
    videoStateService.setPreferredPlaybackRate(1);
    applySpeed(videoStateService.getPreferredPlaybackRate());
  });
}
