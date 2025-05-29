import { injectTooltipStyles } from './tooltipStyles.js';
import { waitForVideoElement } from '../utils/domHelpers.js';

import { createControlsUI, insertFilterPanel } from '../features/video/createControlsUI.js';
import { setupSpeedControl } from '../features/video/speedControl.js';
import { setupPipControl } from '../features/video/pipControl.js';
import { setupVolumeBoost } from '../features/video/volumeBoost.js';
import { setupAutoSkip } from '../features/video/autoSkip.js';
import { setupLooping } from '../features/video/looping.js';
import { setupFocusMode } from '../features/video/focusMode.js';
import { setupVideoFilters } from '../features/video/videoFilters.js';

export function initVideoControls() {
	const bodyContainer = document.querySelector('.app--row--E-WFM.app--body-container--RJZF2');
	const parent = bodyContainer?.parentElement;

	if (!bodyContainer || !parent || document.querySelector('#udemyplus-video-controls')) return;

	createControlsUI(parent, bodyContainer);
	insertFilterPanel();
	injectTooltipStyles();

	waitForVideoElement(video => {
		setupSpeedControl(video);
		setupPipControl(video);
		setupVolumeBoost(video);
		setupAutoSkip(video);
		setupLooping(video);
		setupFocusMode(video);
		setupVideoFilters(video);
	});
}
