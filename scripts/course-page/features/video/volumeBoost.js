import { videoStateService } from '../../services/videoState.js';

let audioContext = null;
const gainByVideo = new WeakMap();

function ensureGainNode(video) {
	if (!audioContext) {
		audioContext = new (window.AudioContext || window.webkitAudioContext)();
	}

	if (gainByVideo.has(video)) return gainByVideo.get(video);

	const source = audioContext.createMediaElementSource(video);
	const gainNode = audioContext.createGain();
	source.connect(gainNode).connect(audioContext.destination);
	gainByVideo.set(video, gainNode);
	return gainNode;
}

function syncVolumeUi(enabled) {
	const volumeIcon = document.getElementById('udemyplus-volume');
	const volumeTooltip = document.querySelector('#udemyplus-volume-wrapper .udemyplus-tooltip');
	if (volumeTooltip) volumeTooltip.textContent = `Boost Volume (${enabled ? 'ON' : 'OFF'})`;
	volumeIcon?.classList.toggle('text-success', enabled);
}

function applyBoostState(video) {
	const currentVideo = document.querySelector('video') || video;
	if (!currentVideo) return;

	const enabled = videoStateService.getVolumeBoostEnabled();
	syncVolumeUi(enabled);

	// Avoid touching the media graph unless boost is actually enabled
	// or this video already has a gain node from a previous toggle.
	if (!enabled && !gainByVideo.has(currentVideo)) return;

	try {
		const gainNode = ensureGainNode(currentVideo);
		gainNode.gain.value = enabled ? 7 : 1;
	} catch (error) {
		console.warn('Could not apply volume boost state:', error);
	}
}

export function setupVolumeBoost(video) {
	const volumeIcon = document.getElementById('udemyplus-volume');
	if (!volumeIcon) return;

	applyBoostState(video);

	volumeIcon.addEventListener('click', () => {
		const next = !videoStateService.getVolumeBoostEnabled();
		videoStateService.setVolumeBoostEnabled(next);
		applyBoostState(video);
	});
}
