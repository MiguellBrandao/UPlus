import { extractCourseStats, getCourseTitle } from './stats.js';
import { getCourseIdFromDOM, fetchCourseImage } from '../../services/udemyApi.js';
import { formatDuration } from '../../utils/formatters.js';
import { showConfirmModal } from '../../ui/confirmModal.js';
import { savePanelState, getPanelState, setMinimizedState } from '../../services/storageService.js';
import { markAllLessons } from '../../services/courseActions.js';

export function updatePanelStats() {
	const stats = extractCourseStats();
	const panel = document.querySelector('#udemy-plus-panel');
	if (!panel) return;

	const lessonsEl = panel.querySelector('.stats-lessons');
	const durationEl = panel.querySelector('.stats-duration');
	const percentEl = panel.querySelector('.stats-percent');
	const shortFormat = panel.offsetWidth < 340;

	if (lessonsEl) lessonsEl.innerText = `${stats.completedLessons}/${stats.totalLessons}`;
	if (durationEl)
		durationEl.innerText = `≈ ${formatDuration(stats.completedMinutes, shortFormat)} / ${formatDuration(stats.totalMinutes, shortFormat)}`;
	if (percentEl) percentEl.innerText = `${stats.progressPercent}%`;
}

export function insertStatsPanel() {
	if (document.querySelector('#udemy-plus-panel')) return;

	const stats = extractCourseStats();
	const { x, y, width, minimized } = getPanelState();
	const courseTitle = getCourseTitle();

	const panel = document.createElement('div');
	panel.id = 'udemy-plus-panel';
	panel.style.cssText = `
    position: fixed;
    z-index: 9997;
    width: ${width}px;
    font-family: 'Poppins', sans-serif;
    transform: translate(${x}px, ${y}px);
    resize: horizontal;
    overflow: auto;
    min-width: 250px;
    max-width: 500px;
  `;

	panel.innerHTML = `
    <div class="card shadow-lg border-0" style="font-family: 'Poppins', sans-serif;">
      <div class="card-header d-flex justify-content-between align-items-center bg-dark text-white p-4" style="cursor: move; font-size: 1.4rem;">
        <span><i class="fa-solid fa-bolt me-2"></i> UdemyPlus</span>
        <button id="minimize-btn" class="btn p-0 m-0 border-0 bg-transparent text-white" style="font-size: 1.4rem;">${minimized ? '+' : '&minus;'}</button>
      </div>
      <div class="card-body" id="panel-body" style="display: ${minimized ? 'none' : 'block'};">
        <div class="d-flex align-items-center mb-3">
          <h5 class="fw-bold m-0" style="font-size: 1.2rem;">${courseTitle}</h5>
        </div>
        <div class="course-image-wrapper text-center mb-3">
          <img id="course-image" src="" alt="Course Cover" style="max-width: 100%; border-radius: 6px;" />
        </div>
        <div class="d-flex mb-2" style="gap: 10px;">
          <div class="flex-fill text-center rounded p-2">
            <div style="font-size: 1.9rem;" class="stats-lessons fw-semibold">${stats.completedLessons}/${stats.totalLessons}</div>
            <div style="font-size: 0.95rem; color: #555;">lessons completed</div>
          </div>
          <div class="flex-fill text-center rounded p-2">
            <div style="font-size: 1.9rem;" class="stats-duration fw-semibold">
              ≈ ${formatDuration(stats.completedMinutes, width < 340)} / ${formatDuration(stats.totalMinutes, width < 340)}
            </div>
            <div style="font-size: 0.95rem; color: #555;">watched / total</div>
          </div>
        </div>
        <div class="text-center mb-4">
          <div class="stats-percent fw-bold" style="font-size: 2.75rem;">${stats.progressPercent}%</div>
          <div style="font-size: 0.95rem; color: #555;">completed</div>
        </div>
        <div class="text-center">
          <button class="btn btn-success px-4 py-2 me-2 fw-semibold" id="complete-all">Mark All</button>
          <button class="btn btn-danger px-4 py-2 fw-semibold" id="reset-all">Reset</button>
        </div>
      </div>
    </div>
  `;

	document.body.appendChild(panel);

	const courseId = getCourseIdFromDOM();
	if (courseId) {
		fetchCourseImage(courseId).then(url => {
			if (url) {
				const img = panel.querySelector('#course-image');
				if (img) img.src = url;
			}
		});
	}

	const btn = document.getElementById('minimize-btn');
	const body = document.getElementById('panel-body');
	const completeAllBtn = document.getElementById('complete-all');
	const resetAllBtn = document.getElementById('reset-all');

	if (btn && body) {
		btn.addEventListener('click', () => {
			const isNowMinimized = body.style.display !== 'none';
			body.style.display = isNowMinimized ? 'none' : 'block';
			btn.innerHTML = isNowMinimized ? '+' : '&minus;';
			setMinimizedState(isNowMinimized);
		});
	}

	if (completeAllBtn) {
		completeAllBtn.addEventListener('click', () => {
			showConfirmModal({
				title: 'Confirm Mark All',
				message: 'Are you sure you want to mark all lessons as completed?',
				onConfirm: () => markAllLessons?.(true)
			});
		});
	}

	if (resetAllBtn) {
		resetAllBtn.addEventListener('click', () => {
			showConfirmModal({
				title: 'Confirm Reset',
				message: 'Are you sure you want to reset all lessons?',
				onConfirm: () => markAllLessons?.(false)
			});
		});
	}

	if (typeof interact !== 'undefined') {
		interact('#udemy-plus-panel').draggable({
			allowFrom: '.card-header',
			listeners: {
				move(event) {
					const target = event.target;
					const dx = event.dx;
					const dy = event.dy;

					const match = target.style.transform.match(
						/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/
					);
					let x = match ? parseFloat(match[1]) + dx : dx;
					let y = match ? parseFloat(match[2]) + dy : dy;

					const panelRect = target.getBoundingClientRect();
					const padding = 5;

					if (x < padding) x = padding;
					if (x + panelRect.width > window.innerWidth - padding)
						x = window.innerWidth - panelRect.width - padding;
					if (y < padding) y = padding;
					if (y + panelRect.height > window.innerHeight - padding)
						y = window.innerHeight - panelRect.height - padding;

					target.style.transform = `translate(${x}px, ${y}px)`;
					savePanelState({ x, y });
				}
			}
		});
	}

	const resizeObserver = new ResizeObserver(entries => {
		for (const entry of entries) {
			const newWidth = Math.round(entry.contentRect.width);
			savePanelState({ x, y, width: newWidth });
			updatePanelStats();
		}
	});

	resizeObserver.observe(panel);
}
