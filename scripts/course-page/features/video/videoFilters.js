export function setupVideoFilters(video) {
	const toggleBtn = document.getElementById('udemyplus-filters-toggle');
	const filterPanelBox = document.getElementById('udemyplus-filter-panel');

	toggleBtn.addEventListener('click', () => {
		const isVisible = filterPanelBox.style.display !== 'none';

		if (isVisible) {
			filterPanelBox.style.display = 'none';
			toggleBtn.classList.remove('text-success');
		} else {
			filterPanelBox.style.display = 'block';
			toggleBtn.classList.add('text-success');
		}
	});

	const filterInputs = filterPanelBox.querySelectorAll('input[type="range"]');
	const valueDisplays = {};
	filterInputs.forEach(input => {
		const id = input.id.replace('filter-', '');
		valueDisplays[id] = document.getElementById(`value-${id}`);
	});

	const updateFilters = () => {
		const values = {};
		filterInputs.forEach(input => {
			const id = input.id.replace('filter-', '');
			const value = input.value;
			valueDisplays[id].textContent = value;
			values[id] = id === 'hue-rotate' ? `${value}deg` : `${value}${id === 'blur' ? 'px' : '%'}`;
		});

		const filterString = Object.entries(values)
			.map(([key, val]) => `${key}(${val})`)
			.join(' ');

		video.style.filter = filterString;
	};

	filterInputs.forEach(input => input.addEventListener('input', updateFilters));
	updateFilters();

	document.getElementById('filter-reset').addEventListener('click', () => {
		filterInputs.forEach(input => {
			const id = input.id.replace('filter-', '');
			input.value = ['brightness', 'contrast', 'saturate'].includes(id) ? 100 : 0;
			valueDisplays[id].textContent = input.value;
		});
		updateFilters();
	});

	if (typeof interact !== 'undefined') {
		interact('#udemyplus-filter-panel').draggable({
			allowFrom: '.card-header',
			listeners: {
				move(event) {
					const target = event.target;
					const dx = event.dx;
					const dy = event.dy;

					const style = window.getComputedStyle(target);
					const matrix = new DOMMatrixReadOnly(style.transform);
					let x = matrix.m41 + dx;
					let y = matrix.m42 + dy;

					target.style.transform = `translate(${x}px, ${y}px)`;
				}
			}
		});

		document.getElementById('udemyplus-filter-panel').style.transform = `translate(0px, 0px)`;
	}
}
