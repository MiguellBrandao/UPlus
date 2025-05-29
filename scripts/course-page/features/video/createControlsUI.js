export function createControlsUI(parent, bodyContainer) {
	const wrapper = document.createElement('div');
	wrapper.id = 'udemyplus-video-controls';
	wrapper.className = 'udemyplus-video-controls d-flex justify-content-start py-2';

	const inner = document.createElement('div');
	inner.className = 'udemyplus-video-controls-inner d-flex align-items-center gap-4 px-3';

	inner.innerHTML = `
    <div class="udemyplus-icon" id="udemyplus-speed-wrapper">
      <i class="fas fa-tachometer-alt cursor-pointer" id="udemyplus-speed"></i>
      <div class="udemyplus-tooltip">Speed (1.00x)</div>
    </div>
    <div class="udemyplus-icon" id="udemyplus-pip-wrapper">
      <i class="fas fa-clone cursor-pointer" id="udemyplus-pip"></i>
      <div class="udemyplus-tooltip">Picture in Picture</div>
    </div>
    <div class="udemyplus-icon" id="udemyplus-volume-wrapper">
      <i class="fas fa-bullhorn cursor-pointer" id="udemyplus-volume"></i>
      <div class="udemyplus-tooltip">Boost Volume (OFF)</div>
    </div>
    <div class="udemyplus-icon" id="udemyplus-disable-next-wrapper">
      <i class="fas fa-step-forward cursor-pointer" id="udemyplus-disable-next"></i>
      <div class="udemyplus-tooltip">Auto Skip Delay (OFF)</div>
    </div>
    <div class="udemyplus-icon" id="udemyplus-focus-wrapper">
      <i class="fas fa-eye cursor-pointer" id="udemyplus-focus"></i>
      <div class="udemyplus-tooltip">Focus Mode (OFF)</div>
    </div>
    <div class="udemyplus-icon" id="udemyplus-loop-wrapper">
      <i class="fas fa-redo cursor-pointer" id="udemyplus-loop"></i>
      <div class="udemyplus-tooltip">Loop Video (OFF)</div>
    </div>
    <div class="udemyplus-icon" id="udemyplus-filters-wrapper">
      <i class="fas fa-sliders-h cursor-pointer" id="udemyplus-filters-toggle"></i>
      <div class="udemyplus-tooltip">Video Filters</div>
    </div>
  `;

	wrapper.appendChild(inner);
	parent.insertBefore(wrapper, bodyContainer.nextSibling);
}

export function insertFilterPanel() {
	const filterPanel = document.createElement('div');
	filterPanel.id = 'udemyplus-filter-panel';
  filterPanel.className = 'udemyplus-filter-panel';

	filterPanel.innerHTML = `
        <div class="card shadow-sm border-0">
        <div class="card-header bg-dark text-white py-3">
            <h6 class="m-0" style="font-size: 1.2em;">Video Filters</h6>
        </div>
        <div class="card-body p-3">
            ${[
					{ id: 'blur', label: 'Blur', max: 200 },
					{ id: 'brightness', label: 'Brightness', max: 200 },
					{ id: 'contrast', label: 'Contrast', max: 200 },
					{ id: 'grayscale', label: 'Grayscale', max: 200 },
					{ id: 'hue-rotate', label: 'Hue Rotate', max: 360 },
					{ id: 'invert', label: 'Invert', max: 200 },
					{ id: 'saturate', label: 'Saturate', max: 200 },
					{ id: 'sepia', label: 'Sepia', max: 200 }
				]
					.map(
						({ id, label, max }) => `
            <div class="mb-3">
                <label for="filter-${id}" class="form-label d-flex justify-content-between">
                <span>${label}</span>
                <span id="value-${id}">0</span>
                </label>
                <input type="range" class="form-range" id="filter-${id}" min="0" max="${max}" value="${['brightness', 'contrast', 'saturate'].includes(id) ? 100 : 0}">
            </div>
            `
					)
					.join('')}
            <button id="filter-reset" class="btn btn-outline-secondary w-100">Reset Filters</button>
        </div>
        </div>
    `;

	document.body.appendChild(filterPanel);
}
