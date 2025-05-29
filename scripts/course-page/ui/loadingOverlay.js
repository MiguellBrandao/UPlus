export function showLoadingOverlay() {
	const base = document.querySelector('.ct-sidebar-course-content');
	const container = base?.parentElement?.parentElement;
	if (!container) return;

	const overlay = document.createElement('div');
	overlay.id = 'udemy-plus-loading';
	overlay.className = 'udemy-plus-loading';

	overlay.style.cssText = `height: ${container.scrollHeight}px;`;

	const spinner = document.createElement('div');
	spinner.className = 'udemy-plus-spinner spinner-border text-light';
	spinner.role = 'status';
	spinner.innerHTML = '<span class="visually-hidden">Loading...</span>';

	overlay.appendChild(spinner);
	container.style.position = 'relative';
	container.appendChild(overlay);
}

export function hideLoadingOverlay() {
	const overlay = document.getElementById('udemy-plus-loading');
	if (overlay) overlay.remove();
}
