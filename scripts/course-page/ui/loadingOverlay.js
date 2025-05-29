export function showLoadingOverlay() {
	const base = document.querySelector('.ct-sidebar-course-content');
	const container = base?.parentElement?.parentElement;
	if (!container) return;

	const overlay = document.createElement('div');
	overlay.id = 'udemy-plus-loading';
	overlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: ${container.scrollHeight}px;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: start;
    z-index: 10000;
  `;

	const spinner = document.createElement('div');
	spinner.className = 'spinner-border text-light';
	spinner.style.cssText = 'margin-top: 40vh; width: 5rem; height: 5rem;';
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
