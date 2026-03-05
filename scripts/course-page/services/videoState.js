import { getSettingsSync, subscribeToSettings } from './settingsStore.js';

let loopEnabled = false;
let autoSkipEnabled = false;
let preferredPlaybackRate = 1;
let volumeBoostEnabled = false;
let focusModeEnabled = false;
let pipEnabled = false;
let persistAcrossReloads = true;

const VIDEO_STATE_STORAGE_KEY = 'uplus_video_control_state_v1';

function clampPlaybackRate(val) {
	const num = Number(val);
	if (!Number.isFinite(num)) return 1;
	return Math.min(16, Math.max(0.1, Number(num.toFixed(2))));
}

function getStateSnapshot() {
	return {
		loopEnabled,
		autoSkipEnabled,
		preferredPlaybackRate: clampPlaybackRate(preferredPlaybackRate),
		volumeBoostEnabled,
		focusModeEnabled,
		pipEnabled
	};
}

function applyStateSnapshot(snapshot = {}) {
	loopEnabled = Boolean(snapshot.loopEnabled);
	autoSkipEnabled = Boolean(snapshot.autoSkipEnabled);
	preferredPlaybackRate = clampPlaybackRate(snapshot.preferredPlaybackRate);
	volumeBoostEnabled = Boolean(snapshot.volumeBoostEnabled);
	focusModeEnabled = Boolean(snapshot.focusModeEnabled);
	pipEnabled = Boolean(snapshot.pipEnabled);
}

function persistStateIfEnabled() {
	if (!persistAcrossReloads) return;
	try {
		localStorage.setItem(VIDEO_STATE_STORAGE_KEY, JSON.stringify(getStateSnapshot()));
	} catch {
		// Ignore persistence errors.
	}
}

function loadPersistedStateIfEnabled() {
	if (!persistAcrossReloads) return;
	try {
		const raw = localStorage.getItem(VIDEO_STATE_STORAGE_KEY);
		if (!raw) return;
		applyStateSnapshot(JSON.parse(raw));
	} catch {
		// Ignore broken payloads.
	}
}

export function initVideoStatePersistence() {
	const settings = getSettingsSync();
	persistAcrossReloads = settings.persistVideoControllerState !== false;

	loadPersistedStateIfEnabled();

	subscribeToSettings(nextSettings => {
		const nextPersist = nextSettings.persistVideoControllerState !== false;
		if (nextPersist === persistAcrossReloads) return;

		persistAcrossReloads = nextPersist;
		if (persistAcrossReloads) {
			persistStateIfEnabled();
			return;
		}

		try {
			localStorage.removeItem(VIDEO_STATE_STORAGE_KEY);
		} catch {
			// Ignore storage errors.
		}
	});
}

export const videoStateService = {
	getLoopEnabled: () => loopEnabled,
	setLoopEnabled: (val) => {
		loopEnabled = Boolean(val);
		persistStateIfEnabled();
	},

	getAutoSkipEnabled: () => autoSkipEnabled,
	setAutoSkipEnabled: (val) => {
		autoSkipEnabled = Boolean(val);
		persistStateIfEnabled();
	},

	getPreferredPlaybackRate: () => preferredPlaybackRate,
	setPreferredPlaybackRate: (val) => {
		preferredPlaybackRate = clampPlaybackRate(val);
		persistStateIfEnabled();
	},

	getVolumeBoostEnabled: () => volumeBoostEnabled,
	setVolumeBoostEnabled: (val) => {
		volumeBoostEnabled = Boolean(val);
		persistStateIfEnabled();
	},

	getFocusModeEnabled: () => focusModeEnabled,
	setFocusModeEnabled: (val) => {
		focusModeEnabled = Boolean(val);
		persistStateIfEnabled();
	},

	getPipEnabled: () => pipEnabled,
	setPipEnabled: (val) => {
		pipEnabled = Boolean(val);
		persistStateIfEnabled();
	},

	disableLoop: () => {
		loopEnabled = false;
		persistStateIfEnabled();
		const loopIcon = document.getElementById('udemyplus-loop');
		const loopTooltip = document.querySelector('#udemyplus-loop-wrapper .udemyplus-tooltip');
		loopIcon?.classList.remove('text-success');
		if (loopTooltip) loopTooltip.textContent = 'Loop Video (OFF)';
	},

	disableAutoSkip: () => {
		autoSkipEnabled = false;
		persistStateIfEnabled();
		const skipBtn = document.getElementById('udemyplus-disable-next');
		const skipTooltip = skipBtn?.nextElementSibling;
		skipBtn?.classList.remove('text-success');
		if (skipTooltip) skipTooltip.textContent = 'Auto Skip Delay (OFF)';
	}
};
