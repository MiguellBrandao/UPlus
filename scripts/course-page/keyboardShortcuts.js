function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || target.isContentEditable;
}

function clickById(id) {
  const element = document.getElementById(id);
  if (!element) return false;
  element.click();
  return true;
}

function adjustVideoSpeed(step) {
  const video = document.querySelector('video');
  if (!video) return false;

  const nextRate = Math.min(16, Math.max(0.1, video.playbackRate + step));
  video.playbackRate = Number(nextRate.toFixed(2));

  const tooltip = document.querySelector('#udemyplus-speed-wrapper .udemyplus-tooltip');
  if (tooltip) {
    tooltip.textContent = `Speed (${video.playbackRate.toFixed(2)}x)`;
  }

  return true;
}

export function initKeyboardShortcuts() {
  if (window.__uplusShortcutsBound) return;
  window.__uplusShortcutsBound = true;

  document.addEventListener('keydown', event => {
    if (isTypingTarget(event.target)) return;

    const key = event.key.toLowerCase();
    let handled = false;

    // Direct keys for playback speed control.
    if (!event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
      if (key === 's') handled = adjustVideoSpeed(-0.1);
      if (key === 'd') handled = adjustVideoSpeed(0.1);
    }

    // Alt+Shift shortcuts for panel/video tools.
    if (!handled && event.altKey && event.shiftKey) {
      if (key === 'r') handled = clickById('refresh-stats-btn');
      if (key === 'm') handled = clickById('minimize-btn');
      if (key === 'f') handled = clickById('udemyplus-focus');
      if (key === 'l') handled = clickById('udemyplus-loop');
      if (key === 's') handled = clickById('udemyplus-disable-next');
      if (key === 'p') handled = clickById('udemyplus-pip');
      if (key === 'v') handled = clickById('udemyplus-volume');
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}
