let loopEnabled = false;
let autoSkipEnabled = false;
let preferredPlaybackRate = 1;
let volumeBoostEnabled = false;
let focusModeEnabled = false;
let pipEnabled = false;

function clampPlaybackRate(val) {
	const num = Number(val);
	if (!Number.isFinite(num)) return 1;
	return Math.min(16, Math.max(0.1, Number(num.toFixed(2))));
}

export const videoStateService = {
	getLoopEnabled: () => loopEnabled,
	setLoopEnabled: (val) => (loopEnabled = val),

	getAutoSkipEnabled: () => autoSkipEnabled,
	setAutoSkipEnabled: (val) => (autoSkipEnabled = val),

	getPreferredPlaybackRate: () => preferredPlaybackRate,
	setPreferredPlaybackRate: (val) => (preferredPlaybackRate = clampPlaybackRate(val)),

	getVolumeBoostEnabled: () => volumeBoostEnabled,
	setVolumeBoostEnabled: (val) => (volumeBoostEnabled = Boolean(val)),

	getFocusModeEnabled: () => focusModeEnabled,
	setFocusModeEnabled: (val) => (focusModeEnabled = Boolean(val)),

	getPipEnabled: () => pipEnabled,
	setPipEnabled: (val) => (pipEnabled = Boolean(val)),

	disableLoop: () => {
		loopEnabled = false;
		const loopIcon = document.getElementById('udemyplus-loop');
		const loopTooltip = document.querySelector('#udemyplus-loop-wrapper .udemyplus-tooltip');
		loopIcon?.classList.remove('text-success');
		if (loopTooltip) loopTooltip.textContent = 'Loop Video (OFF)';
	},

	disableAutoSkip: () => {
		autoSkipEnabled = false;
		const skipBtn = document.getElementById('udemyplus-disable-next');
		const skipTooltip = skipBtn?.nextElementSibling;
		skipBtn?.classList.remove('text-success');
		if (skipTooltip) skipTooltip.textContent = 'Auto Skip Delay (OFF)';
	}
};
