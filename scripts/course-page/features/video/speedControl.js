import { videoStateService } from '../../services/videoState.js';

export function setupSpeedControl(video) {
  const speedWrapper = document.getElementById('udemyplus-speed-wrapper');
  const decreaseBtn = document.getElementById('udemyplus-speed-decrease');
  const increaseBtn = document.getElementById('udemyplus-speed-increase');
  const speedValueBtn = document.getElementById('udemyplus-speed');
  if (!speedWrapper) return;
  if (!decreaseBtn || !increaseBtn || !speedValueBtn) return;
  let applyingSpeed = false;

  const getCurrentVideo = () => document.querySelector('video') || video;

  const applySpeed = rate => {
    const currentVideo = getCurrentVideo();
    if (!currentVideo) return;

    applyingSpeed = true;
    currentVideo.playbackRate = rate;
    applyingSpeed = false;
    speedValueBtn.textContent = `${currentVideo.playbackRate.toFixed(2)}x`;
  };

  applySpeed(videoStateService.getPreferredPlaybackRate());

  // Udemy may swap media source on lecture change while keeping the same player shell.
  const enforcePreferredSpeed = () => {
    applySpeed(videoStateService.getPreferredPlaybackRate());
  };

  video.addEventListener('loadedmetadata', enforcePreferredSpeed);
  video.addEventListener('play', () => {
    // Udemy may reset rate on resume; enforce right after playback starts.
    setTimeout(enforcePreferredSpeed, 40);
  });
  video.addEventListener('playing', () => {
    setTimeout(enforcePreferredSpeed, 40);
  });
  video.addEventListener('ratechange', () => {
    if (applyingSpeed) return;
    const currentVideo = getCurrentVideo();
    if (!currentVideo) return;

    const preferred = videoStateService.getPreferredPlaybackRate();
    if (Math.abs(currentVideo.playbackRate - preferred) < 0.01) return;
    setTimeout(enforcePreferredSpeed, 20);
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

  decreaseBtn.addEventListener('click', () => {
    const currentVideo = getCurrentVideo();
    if (!currentVideo) return;

    videoStateService.setPreferredPlaybackRate(currentVideo.playbackRate - 0.1);
    applySpeed(videoStateService.getPreferredPlaybackRate());
  });

  increaseBtn.addEventListener('click', () => {
    const currentVideo = getCurrentVideo();
    if (!currentVideo) return;

    videoStateService.setPreferredPlaybackRate(currentVideo.playbackRate + 0.1);
    applySpeed(videoStateService.getPreferredPlaybackRate());
  });

  speedValueBtn.addEventListener('click', () => {
    videoStateService.setPreferredPlaybackRate(1);
    applySpeed(videoStateService.getPreferredPlaybackRate());
  });
}
