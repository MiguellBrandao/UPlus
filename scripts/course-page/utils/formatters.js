export function formatDuration(minutesTotal, short = false) {
	const h = Math.floor(minutesTotal / 60);
	const m = minutesTotal % 60;
	return short ? `${h}h` : `${h}h ${m}min`;
}
