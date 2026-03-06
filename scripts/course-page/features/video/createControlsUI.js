export function createControlsUI(nativeControlsBar, { beforeNode = null, afterNode = null } = {}) {
  if (!nativeControlsBar) return;

  const wrapper = document.createElement('div');
  wrapper.id = 'udemyplus-video-controls';
  wrapper.className = 'udemyplus-video-controls';

  wrapper.innerHTML = `
    <div class="udemyplus-icon popper-module--popper--mM5Ie" id="udemyplus-speed-wrapper">
      <div class="udemyplus-speed-control" aria-label="UdemyPlus speed control">
        <button type="button" id="udemyplus-speed-decrease" class="udemyplus-speed-btn" aria-label="Decrease speed">-</button>
        <button type="button" id="udemyplus-speed" class="udemyplus-speed-value" aria-label="Reset speed to 1.0x">1.00x</button>
        <button type="button" id="udemyplus-speed-increase" class="udemyplus-speed-btn" aria-label="Increase speed">+</button>
      </div>
    </div>
    <div class="udemyplus-icon popper-module--popper--mM5Ie" id="udemyplus-pip-wrapper">
      <button
        type="button"
        id="udemyplus-pip"
        class="ud-btn ud-btn-small ud-btn-ghost ud-btn-text-sm control-bar-dropdown--trigger--FnmP- control-bar-dropdown--trigger-dark--ZK26r control-bar-dropdown--trigger-small--ogRJ4"
        aria-label="UdemyPlus picture in picture"
      >
        <i class="fas fa-clone"></i>
      </button>
      <div class="udemyplus-tooltip">Picture in Picture</div>
    </div>
    <div class="udemyplus-icon popper-module--popper--mM5Ie" id="udemyplus-volume-wrapper">
      <button
        type="button"
        id="udemyplus-volume"
        class="ud-btn ud-btn-small ud-btn-ghost ud-btn-text-sm control-bar-dropdown--trigger--FnmP- control-bar-dropdown--trigger-dark--ZK26r control-bar-dropdown--trigger-small--ogRJ4"
        aria-label="UdemyPlus volume boost"
      >
        <i class="fas fa-bullhorn"></i>
      </button>
      <div class="udemyplus-tooltip">Boost Volume (OFF)</div>
    </div>
    <div class="udemyplus-icon popper-module--popper--mM5Ie" id="udemyplus-disable-next-wrapper">
      <button
        type="button"
        id="udemyplus-disable-next"
        class="ud-btn ud-btn-small ud-btn-ghost ud-btn-text-sm control-bar-dropdown--trigger--FnmP- control-bar-dropdown--trigger-dark--ZK26r control-bar-dropdown--trigger-small--ogRJ4"
        aria-label="UdemyPlus auto skip delay"
      >
        <i class="fas fa-step-forward"></i>
      </button>
      <div class="udemyplus-tooltip">Auto Skip Delay (OFF)</div>
    </div>
    <div class="udemyplus-icon popper-module--popper--mM5Ie" id="udemyplus-focus-wrapper">
      <button
        type="button"
        id="udemyplus-focus"
        class="ud-btn ud-btn-small ud-btn-ghost ud-btn-text-sm control-bar-dropdown--trigger--FnmP- control-bar-dropdown--trigger-dark--ZK26r control-bar-dropdown--trigger-small--ogRJ4"
        aria-label="UdemyPlus focus mode"
      >
        <i class="fas fa-eye"></i>
      </button>
      <div class="udemyplus-tooltip">Focus Mode (OFF)</div>
    </div>
    <div class="udemyplus-icon popper-module--popper--mM5Ie" id="udemyplus-loop-wrapper">
      <button
        type="button"
        id="udemyplus-loop"
        class="ud-btn ud-btn-small ud-btn-ghost ud-btn-text-sm control-bar-dropdown--trigger--FnmP- control-bar-dropdown--trigger-dark--ZK26r control-bar-dropdown--trigger-small--ogRJ4"
        aria-label="UdemyPlus loop mode"
      >
        <i class="fas fa-rotate-right"></i>
      </button>
      <div class="udemyplus-tooltip">Loop Video (OFF)</div>
    </div>
  `;

  if (beforeNode && beforeNode.parentElement === nativeControlsBar) {
    nativeControlsBar.insertBefore(wrapper, beforeNode);
    return;
  }

  if (afterNode && afterNode.parentElement === nativeControlsBar) {
    nativeControlsBar.insertBefore(wrapper, afterNode.nextSibling);
    return;
  }

  nativeControlsBar.appendChild(wrapper);
}
