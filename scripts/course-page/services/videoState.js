let loopEnabled = false;
let autoSkipEnabled = false;

export const videoStateService = {
	getLoopEnabled: () => loopEnabled,
	setLoopEnabled: (val) => (loopEnabled = val),

	getAutoSkipEnabled: () => autoSkipEnabled,
	setAutoSkipEnabled: (val) => (autoSkipEnabled = val),

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
