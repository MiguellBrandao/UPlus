export function injectTooltipStyles() {
	const style = document.createElement('style');
	style.innerHTML = `
    .udemyplus-icon {
      position: relative;
    }

    .udemyplus-tooltip {
      position: absolute;
      bottom: 120%;
      left: 50%;
      transform: translateX(-50%);
      background-color: #444;
      color: #fff;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 1.05rem;
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.2s ease-in-out;
      pointer-events: none;
    }

    .udemyplus-icon:hover .udemyplus-tooltip {
      opacity: 1;
    }
  `;
	document.head.appendChild(style);
}
