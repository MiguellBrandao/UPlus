import { videoStateService } from '../../services/videoState.js';

const speedBoundVideos = new WeakSet();

function updateSpeedLabel(rate) {
  const speedValueBtn = document.getElementById('udemyplus-speed');
  if (!speedValueBtn) return;
  speedValueBtn.textContent = `${rate.toFixed(2)}x`;
}

export function setupSpeedControl(video) {
  const speedWrapper = document.getElementById('udemyplus-speed-wrapper');
  const decreaseBtn = document.getElementById('udemyplus-speed-decrease');
  const increaseBtn = document.getElementById('udemyplus-speed-increase');
  const speedValueBtn = document.getElementById('udemyplus-speed');
  if (!speedWrapper) return;
  if (!decreaseBtn || !increaseBtn || !speedValueBtn) return;

  const getCurrentVideo = () => document.querySelector('video') || video;

  const applyPreferredSpeed = () => {
    const currentVideo = getCurrentVideo();
    if (!currentVideo) return;
    const preferred = videoStateService.getPreferredPlaybackRate();
    currentVideo.playbackRate = preferred;
    updateSpeedLabel(currentVideo.playbackRate);
  };

  const applyCurrentRate = rate => {
    const currentVideo = getCurrentVideo();
    if (!currentVideo) return;
    currentVideo.playbackRate = rate;
    updateSpeedLabel(currentVideo.playbackRate);
  };

  applyPreferredSpeed();

  if (!speedBoundVideos.has(video)) {
    speedBoundVideos.add(video);
    video.addEventListener('loadedmetadata', applyPreferredSpeed);
    video.addEventListener('play', () => setTimeout(applyPreferredSpeed, 60));
    video.addEventListener('playing', () => setTimeout(applyPreferredSpeed, 60));
  }

  speedWrapper.addEventListener('wheel', e => {
    e.preventDefault();
    const currentVideo = getCurrentVideo();
    if (!currentVideo) return;

    const increment = 0.1;
    const nextRate = currentVideo.playbackRate + (e.deltaY < 0 ? increment : -increment);
    videoStateService.setPreferredPlaybackRate(nextRate);
    applyCurrentRate(videoStateService.getPreferredPlaybackRate());
  });

  decreaseBtn.addEventListener('click', () => {
    const currentVideo = getCurrentVideo();
    if (!currentVideo) return;

    videoStateService.setPreferredPlaybackRate(currentVideo.playbackRate - 0.1);
    applyCurrentRate(videoStateService.getPreferredPlaybackRate());
  });

  increaseBtn.addEventListener('click', () => {
    const currentVideo = getCurrentVideo();
    if (!currentVideo) return;

    videoStateService.setPreferredPlaybackRate(currentVideo.playbackRate + 0.1);
    applyCurrentRate(videoStateService.getPreferredPlaybackRate());
  });

  speedValueBtn.addEventListener('click', () => {
    videoStateService.setPreferredPlaybackRate(1);
    applyCurrentRate(videoStateService.getPreferredPlaybackRate());
  });
}
