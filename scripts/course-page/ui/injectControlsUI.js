import { waitForVideoElement } from '../utils/domHelpers.js';

import { createControlsUI } from '../features/video/createControlsUI.js';
import { setupSpeedControl } from '../features/video/speedControl.js';
import { setupPipControl } from '../features/video/pipControl.js';
import { setupVolumeBoost } from '../features/video/volumeBoost.js';
import { setupAutoSkip } from '../features/video/autoSkip.js';
import { setupLooping } from '../features/video/looping.js';
import { setupFocusMode } from '../features/video/focusMode.js';

function getDirectChild(container, node) {
  let current = node;
  while (current && current.parentElement !== container) {
    current = current.parentElement;
  }
  return current;
}

export function initVideoControls({ forceRecreate = false } = {}) {
  const nativeControlsBar = document.querySelector('[data-purpose="video-controls"]');
  const controls = document.querySelector('#udemyplus-video-controls');

  if (!nativeControlsBar) return;
  if (controls && forceRecreate) {
    controls.remove();
  } else if (controls) {
    return;
  }

  const volumeBtn = nativeControlsBar.querySelector('[data-purpose="volume-control-button"]');
  const volumeBlock = getDirectChild(nativeControlsBar, volumeBtn);
  createControlsUI(nativeControlsBar, { beforeNode: volumeBlock });

  waitForVideoElement(video => {
    setupSpeedControl(video);
    setupPipControl(video);
    setupVolumeBoost(video);
    setupAutoSkip(video);
    setupLooping(video);
    setupFocusMode(video);
  });
}
