export function savePanelState({ x, y, width }) {
	localStorage.setItem('udemyPlusPanelPos', JSON.stringify({ x, y }));
	if (width) localStorage.setItem('udemyPlusPanelWidth', width);
}

export function getPanelState() {
	const pos = JSON.parse(localStorage.getItem('udemyPlusPanelPos')) || { x: 20, y: 20 };
	const width = parseInt(localStorage.getItem('udemyPlusPanelWidth')) || 275;
	const minimized = localStorage.getItem('udemyPlusMinimized') === 'true';
	return { ...pos, width, minimized };
}

export function setMinimizedState(isMinimized) {
	localStorage.setItem('udemyPlusMinimized', isMinimized);
}

export function getMinimizedState() {
	return localStorage.getItem('udemyPlusMinimized') === 'true';
}
