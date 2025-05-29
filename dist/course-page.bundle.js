(() => {
  // scripts/course-page/services/statsService.js
  function extractCourseStats() {
    const sections = document.querySelectorAll('[data-purpose="section-duration"]');
    let totalLessons = 0;
    let completedLessons = 0;
    let totalMinutes = 0;
    let completedMinutes = 0;
    sections.forEach((section) => {
      const text = section.innerText.trim();
      const match = text.match(/(\d+)\s*\/\s*(\d+)\s*\|\s*(?:(\d+)h)?\s*(\d+)m/);
      if (match) {
        const completed = parseInt(match[1]);
        const total = parseInt(match[2]);
        const h = match[3] ? parseInt(match[3]) : 0;
        const m = parseInt(match[4]);
        const minutes = h * 60 + m;
        totalLessons += total;
        completedLessons += completed;
        totalMinutes += minutes;
        if (total > 0) {
          const avgLessonDuration = minutes / total;
          completedMinutes += avgLessonDuration * completed;
        }
      }
    });
    const progressPercent = totalLessons > 0 ? Math.round(completedLessons / totalLessons * 100) : 0;
    return {
      totalLessons,
      completedLessons,
      totalMinutes: Math.round(totalMinutes),
      completedMinutes: Math.round(completedMinutes),
      progressPercent
    };
  }
  function getCourseTitle() {
    const titleEl = document.querySelector("a.header--header-link--X0YLd");
    return titleEl ? titleEl.textContent.trim() : "Course Title";
  }

  // scripts/course-page/services/udemyApi.js
  function getCourseIdFromDOM() {
    const appEl = document.querySelector('[data-module-args*="courseId"]');
    if (!appEl) return null;
    try {
      const json = JSON.parse(appEl.getAttribute("data-module-args").replace(/&quot;/g, '"'));
      return json.courseId;
    } catch (e) {
      console.warn("\u274C Erro ao extrair courseId:", e);
      return null;
    }
  }
  async function fetchCourseImage(courseId) {
    try {
      const response = await fetch(`https://www.udemy.com/api-2.0/courses/${courseId}`);
      if (!response.ok) throw new Error("Falha na API");
      const data = await response.json();
      return data.image_240x135;
    } catch (e) {
      console.warn("\u274C Erro ao buscar imagem do curso:", e);
      return null;
    }
  }

  // scripts/course-page/utils/formatters.js
  function formatDuration(minutesTotal, short = false) {
    const h = Math.floor(minutesTotal / 60);
    const m = minutesTotal % 60;
    return short ? `${h}h` : `${h}h ${m}min`;
  }

  // scripts/course-page/ui/confirmModal.js
  function showConfirmModal({ title, message, onConfirm }) {
    let modal = document.getElementById("udemy-plus-confirm-modal");
    if (!modal) {
      insertConfirmModalHTML();
      modal = document.getElementById("udemy-plus-confirm-modal");
    }
    modal.style.display = "flex";
    modal.querySelector("#confirm-title").innerText = title;
    modal.querySelector("#confirm-message").innerText = message;
    const confirmBtn = modal.querySelector("#confirm-yes");
    const cancelBtn = modal.querySelector("#confirm-no");
    const closeModal = () => modal.style.display = "none";
    confirmBtn.onclick = () => {
      closeModal();
      if (typeof onConfirm === "function") onConfirm();
    };
    cancelBtn.onclick = closeModal;
    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };
  }
  function insertConfirmModalHTML() {
    const confirmModal = document.createElement("div");
    confirmModal.id = "udemy-plus-confirm-modal";
    confirmModal.className = "udemy-plus-confirm-modal modal fade show";
    confirmModal.tabIndex = -1;
    confirmModal.setAttribute("role", "dialog");
    confirmModal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered" style="z-index: 9999;">
      <div class="modal-content" style="font-family: 'Poppins', sans-serif;">
        <div class="modal-header bg-dark text-white">
          <h5 class="modal-title" id="confirm-title">Confirm Action</h5>
        </div>
        <div class="modal-body">
          <p id="confirm-message">Are you sure you want to proceed?</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-danger fs-5 px-4" id="confirm-no">Cancel</button>
          <button type="button" class="btn btn-success fs-5 px-4" id="confirm-yes">Yes</button>
        </div>
      </div>
    </div>
  `;
    document.body.appendChild(confirmModal);
  }

  // scripts/course-page/services/storageService.js
  function savePanelState({ x, y, width }) {
    localStorage.setItem("udemyPlusPanelPos", JSON.stringify({ x, y }));
    if (width) localStorage.setItem("udemyPlusPanelWidth", width);
  }
  function getPanelState() {
    const pos = JSON.parse(localStorage.getItem("udemyPlusPanelPos")) || { x: 20, y: 20 };
    const width = parseInt(localStorage.getItem("udemyPlusPanelWidth")) || 275;
    const minimized = localStorage.getItem("udemyPlusMinimized") === "true";
    return { ...pos, width, minimized };
  }
  function setMinimizedState(isMinimized) {
    localStorage.setItem("udemyPlusMinimized", isMinimized);
  }

  // scripts/course-page/utils/domHelpers.js
  function expandAllSections(callback) {
    const buttons = document.querySelectorAll("button.js-panel-toggler");
    let initiallyOpenIndex = null;
    buttons.forEach((btn, index) => {
      if (btn.getAttribute("aria-expanded") === "true" && initiallyOpenIndex === null) {
        initiallyOpenIndex = index;
      }
    });
    const collapsed = document.querySelectorAll('button.js-panel-toggler[aria-expanded="false"]');
    collapsed.forEach((btn) => {
      try {
        btn.click();
      } catch (e) {
        console.warn("\u274C Failed to expand section:", e);
      }
    });
    setTimeout(() => {
      if (typeof callback === "function") callback();
    }, 800);
  }
  function waitForVideoElement(callback, timeout = 1e4) {
    const start = Date.now();
    const interval = setInterval(() => {
      const video = document.querySelector("video");
      if (video) {
        clearInterval(interval);
        callback(video);
      } else if (Date.now() - start > timeout) {
        clearInterval(interval);
        console.warn("\u26A0\uFE0F Timeout esperando pelo elemento <video>");
      }
    }, 300);
  }
  function waitForElement(selector, timeout = 1e4) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const interval = setInterval(() => {
        const element = document.querySelector(selector);
        if (element) {
          clearInterval(interval);
          resolve(element);
        } else if (Date.now() - start > timeout) {
          clearInterval(interval);
          reject(new Error(`Element "${selector}" not found within ${timeout}ms`));
        }
      }, 100);
    });
  }

  // scripts/course-page/ui/loadingOverlay.js
  function showLoadingOverlay() {
    const base = document.querySelector(".ct-sidebar-course-content");
    const container = base?.parentElement?.parentElement;
    if (!container) return;
    const overlay = document.createElement("div");
    overlay.id = "udemy-plus-loading";
    overlay.className = "udemy-plus-loading";
    overlay.style.cssText = `height: ${container.scrollHeight}px;`;
    const spinner = document.createElement("div");
    spinner.className = "udemy-plus-spinner spinner-border text-light";
    spinner.role = "status";
    spinner.innerHTML = '<span class="visually-hidden">Loading...</span>';
    overlay.appendChild(spinner);
    container.style.position = "relative";
    container.appendChild(overlay);
  }
  function hideLoadingOverlay() {
    const overlay = document.getElementById("udemy-plus-loading");
    if (overlay) overlay.remove();
  }

  // scripts/course-page/services/courseActions.js
  function markAllLessons(completed) {
    expandAllSections(() => {
      showLoadingOverlay();
      setTimeout(() => {
        const checkboxes = document.querySelectorAll(
          'input[data-purpose="progress-toggle-button"]'
        );
        checkboxes.forEach((checkbox) => {
          if (checkbox.checked !== completed) checkbox.click();
        });
        hideLoadingOverlay();
        updatePanelStats();
      }, 800);
    });
  }

  // scripts/course-page/ui/panel.js
  function updatePanelStats() {
    const stats = extractCourseStats();
    const panel = document.querySelector("#udemy-plus-panel");
    if (!panel) return;
    const lessonsEl = panel.querySelector(".stats-lessons");
    const durationEl = panel.querySelector(".stats-duration");
    const percentEl = panel.querySelector(".stats-percent");
    const shortFormat = panel.offsetWidth < 340;
    if (lessonsEl) lessonsEl.innerText = `${stats.completedLessons}/${stats.totalLessons}`;
    if (durationEl)
      durationEl.innerText = `\u2248 ${formatDuration(stats.completedMinutes, shortFormat)} / ${formatDuration(stats.totalMinutes, shortFormat)}`;
    if (percentEl) percentEl.innerText = `${stats.progressPercent}%`;
  }
  function insertStatsPanel() {
    if (document.querySelector("#udemy-plus-panel")) return;
    const stats = extractCourseStats();
    const { x, y, width, minimized } = getPanelState();
    const courseTitle = getCourseTitle();
    const panel = document.createElement("div");
    panel.id = "udemy-plus-panel";
    panel.className = "udemyplus-stats-panel";
    panel.style.cssText = `
		width: ${width}px;
		transform: translate(${x}px, ${y}px);
	`;
    panel.innerHTML = `
    <div class="card shadow-lg border-0" style="font-family: 'Poppins', sans-serif;">
      <div class="card-header udemyplus-panel-header d-flex justify-content-between align-items-center bg-dark text-white p-4">
        <span><i class="fa-solid fa-bolt me-2"></i> UdemyPlus</span>
        <button id="minimize-btn" class="btn p-0 m-0 border-0 bg-transparent text-white" style="font-size: 1.4rem;">${minimized ? "+" : "&minus;"}</button>
      </div>
      <div class="card-body" id="panel-body" style="display: ${minimized ? "none" : "block"};">
        <div class="d-flex align-items-center mb-3">
          <h5 class="stats-title fw-bold m-0">${courseTitle}</h5>
        </div>
        <div class="course-image-wrapper text-center mb-3">
          <img id="course-image" class="udemyplus-course-image" src="" alt="Course Cover" />
        </div>
        <div class="d-flex mb-2" style="gap: 10px;">
          <div class="flex-fill text-center rounded p-2">
            <div class="stats-lessons fw-semibold">${stats.completedLessons}/${stats.totalLessons}</div>
            <div class="stats-description">lessons completed</div>
          </div>
          <div class="flex-fill text-center rounded p-2">
            <div class="stats-duration fw-semibold">
              \u2248 ${formatDuration(stats.completedMinutes, width < 340)} / ${formatDuration(stats.totalMinutes, width < 340)}
            </div>
            <div class="stats-description">watched / total</div>
          </div>
        </div>
        <div class="text-center mb-4">
          <div class="stats-percent fw-bold">${stats.progressPercent}%</div>
          <div class="stats-description">completed</div>
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
      fetchCourseImage(courseId).then((url) => {
        if (url) {
          const img = panel.querySelector("#course-image");
          if (img) img.src = url;
        }
      });
    }
    const btn = document.getElementById("minimize-btn");
    const body = document.getElementById("panel-body");
    const completeAllBtn = document.getElementById("complete-all");
    const resetAllBtn = document.getElementById("reset-all");
    if (btn && body) {
      btn.addEventListener("click", () => {
        const isNowMinimized = body.style.display !== "none";
        body.style.display = isNowMinimized ? "none" : "block";
        btn.innerHTML = isNowMinimized ? "+" : "&minus;";
        setMinimizedState(isNowMinimized);
      });
    }
    if (completeAllBtn) {
      completeAllBtn.addEventListener("click", () => {
        showConfirmModal({
          title: "Confirm Mark All",
          message: "Are you sure you want to mark all lessons as completed?",
          onConfirm: () => markAllLessons?.(true)
        });
      });
    }
    if (resetAllBtn) {
      resetAllBtn.addEventListener("click", () => {
        showConfirmModal({
          title: "Confirm Reset",
          message: "Are you sure you want to reset all lessons?",
          onConfirm: () => markAllLessons?.(false)
        });
      });
    }
    if (typeof interact !== "undefined") {
      interact("#udemy-plus-panel").draggable({
        allowFrom: ".card-header",
        listeners: {
          move(event) {
            const target = event.target;
            const dx = event.dx;
            const dy = event.dy;
            const match = target.style.transform.match(
              /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/
            );
            let x2 = match ? parseFloat(match[1]) + dx : dx;
            let y2 = match ? parseFloat(match[2]) + dy : dy;
            const panelRect = target.getBoundingClientRect();
            const padding = 5;
            if (x2 < padding) x2 = padding;
            if (x2 + panelRect.width > window.innerWidth - padding)
              x2 = window.innerWidth - panelRect.width - padding;
            if (y2 < padding) y2 = padding;
            if (y2 + panelRect.height > window.innerHeight - padding)
              y2 = window.innerHeight - panelRect.height - padding;
            target.style.transform = `translate(${x2}px, ${y2}px)`;
            savePanelState({ x: x2, y: y2 });
          }
        }
      });
    }
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = Math.round(entry.contentRect.width);
        savePanelState({ x, y, width: newWidth });
        updatePanelStats();
      }
    });
    resizeObserver.observe(panel);
  }

  // scripts/course-page/observers/statObservers.js
  function monitorCheckboxChanges() {
    document.body.addEventListener("change", (e) => {
      if (e.target && e.target.matches('input[type="checkbox"][data-purpose="progress-toggle-button"]')) {
        updatePanelStats();
      }
    });
  }
  function watchCurrentLessonChange() {
    let lastUrl = location.href;
    setInterval(() => {
      if (location.href !== lastUrl) {
        console.log("\u{1F3AC} Detetada mudan\xE7a de v\xEDdeo via URL");
        lastUrl = location.href;
        updatePanelStats();
      }
    }, 1e3);
  }

  // scripts/course-page/initStatsPanel.js
  function initStatsPanel() {
    let tries = 0;
    const interval = setInterval(() => {
      const statsReady = document.querySelectorAll('[data-purpose="section-duration"]').length > 0;
      const interactReady = typeof interact !== "undefined";
      if (statsReady && interactReady) {
        insertStatsPanel();
        monitorCheckboxChanges();
        watchCurrentLessonChange();
        clearInterval(interval);
      }
      if (++tries > 30) clearInterval(interval);
    }, 1e3);
  }

  // scripts/course-page/features/video/createControlsUI.js
  function createControlsUI(parent, bodyContainer) {
    const wrapper = document.createElement("div");
    wrapper.id = "udemyplus-video-controls";
    wrapper.className = "udemyplus-video-controls d-flex justify-content-start py-2";
    const inner = document.createElement("div");
    inner.className = "udemyplus-video-controls-inner d-flex align-items-center gap-4 px-3";
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
  function insertFilterPanel() {
    const filterPanel = document.createElement("div");
    filterPanel.id = "udemyplus-filter-panel";
    filterPanel.className = "udemyplus-filter-panel";
    filterPanel.innerHTML = `
        <div class="card shadow-sm border-0">
        <div class="card-header bg-dark text-white py-3">
            <h6 class="m-0" style="font-size: 1.2em;">Video Filters</h6>
        </div>
        <div class="card-body p-3">
            ${[
      { id: "blur", label: "Blur", max: 200 },
      { id: "brightness", label: "Brightness", max: 200 },
      { id: "contrast", label: "Contrast", max: 200 },
      { id: "grayscale", label: "Grayscale", max: 200 },
      { id: "hue-rotate", label: "Hue Rotate", max: 360 },
      { id: "invert", label: "Invert", max: 200 },
      { id: "saturate", label: "Saturate", max: 200 },
      { id: "sepia", label: "Sepia", max: 200 }
    ].map(
      ({ id, label, max }) => `
            <div class="mb-3">
                <label for="filter-${id}" class="form-label d-flex justify-content-between">
                <span>${label}</span>
                <span id="value-${id}">0</span>
                </label>
                <input type="range" class="form-range" id="filter-${id}" min="0" max="${max}" value="${["brightness", "contrast", "saturate"].includes(id) ? 100 : 0}">
            </div>
            `
    ).join("")}
            <button id="filter-reset" class="btn btn-outline-secondary w-100">Reset Filters</button>
        </div>
        </div>
    `;
    document.body.appendChild(filterPanel);
  }

  // scripts/course-page/features/video/speedControl.js
  function setupSpeedControl(video) {
    const speedWrapper = document.getElementById("udemyplus-speed-wrapper");
    const speedTooltip = speedWrapper.querySelector(".udemyplus-tooltip");
    speedWrapper.addEventListener("wheel", (e) => {
      e.preventDefault();
      const increment = 0.1;
      const newRate = Math.min(
        4,
        Math.max(0.1, video.playbackRate + (e.deltaY < 0 ? increment : -increment))
      );
      video.playbackRate = parseFloat(newRate.toFixed(2));
      speedTooltip.textContent = `Speed (${video.playbackRate.toFixed(2)}x)`;
    });
    speedWrapper.addEventListener("click", () => {
      video.playbackRate = 1;
      speedTooltip.textContent = `Speed (1.00x)`;
    });
  }

  // scripts/course-page/features/video/pipControl.js
  function setupPipControl(video) {
    document.getElementById("udemyplus-pip").addEventListener("click", () => {
      if (document.pictureInPictureElement) document.exitPictureInPicture();
      else video.requestPictureInPicture().catch(console.error);
    });
  }

  // scripts/course-page/features/video/volumeBoost.js
  function setupVolumeBoost(video) {
    const volumeIcon = document.getElementById("udemyplus-volume");
    const volumeTooltip = document.querySelector("#udemyplus-volume-wrapper .udemyplus-tooltip");
    let boosted = false;
    let audioContext = null;
    let gainNode = null;
    let source = null;
    volumeIcon.addEventListener("click", () => {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        source = audioContext.createMediaElementSource(video);
        gainNode = audioContext.createGain();
        gainNode.gain.value = 1;
        source.connect(gainNode).connect(audioContext.destination);
      }
      boosted = !boosted;
      gainNode.gain.value = boosted ? 7 : 1;
      volumeTooltip.textContent = `Boost Volume (${boosted ? "ON" : "OFF"})`;
      volumeIcon.classList.toggle("text-success", boosted);
    });
  }

  // scripts/course-page/services/videoState.js
  var loopEnabled = false;
  var autoSkipEnabled = false;
  var videoStateService = {
    getLoopEnabled: () => loopEnabled,
    setLoopEnabled: (val) => loopEnabled = val,
    getAutoSkipEnabled: () => autoSkipEnabled,
    setAutoSkipEnabled: (val) => autoSkipEnabled = val,
    disableLoop: () => {
      loopEnabled = false;
      const loopIcon = document.getElementById("udemyplus-loop");
      const loopTooltip = document.querySelector("#udemyplus-loop-wrapper .udemyplus-tooltip");
      loopIcon?.classList.remove("text-success");
      if (loopTooltip) loopTooltip.textContent = "Loop Video (OFF)";
    },
    disableAutoSkip: () => {
      autoSkipEnabled = false;
      const skipBtn = document.getElementById("udemyplus-disable-next");
      const skipTooltip = skipBtn?.nextElementSibling;
      skipBtn?.classList.remove("text-success");
      if (skipTooltip) skipTooltip.textContent = "Auto Skip Delay (OFF)";
    }
  };

  // scripts/course-page/features/video/autoSkip.js
  function setupAutoSkip(video) {
    const autoSkipBtn = document.getElementById("udemyplus-disable-next");
    let skipObserver = null;
    autoSkipBtn.addEventListener("click", () => {
      const newState = !videoStateService.getAutoSkipEnabled();
      if (newState && videoStateService.getLoopEnabled()) {
        videoStateService.disableLoop();
      }
      videoStateService.setAutoSkipEnabled(newState);
      autoSkipBtn.classList.toggle("text-success", newState);
      const tooltip = autoSkipBtn.nextElementSibling;
      if (tooltip) tooltip.textContent = `Auto Skip Delay (${newState ? "ON" : "OFF"})`;
      if (newState) {
        if (skipObserver) skipObserver.disconnect();
        skipObserver = new MutationObserver(() => {
          const popup = document.querySelector(".interstitial--container--4wumM");
          if (popup && videoStateService.getAutoSkipEnabled()) {
            popup.style.display = "none";
            const current = document.querySelector("li.curriculum-item-link--is-current--2mKk4");
            if (!current) return;
            let next = current.nextElementSibling;
            while (next && !next.matches('li[aria-current="false"]')) {
              next = next.nextElementSibling;
            }
            if (next) {
              const playBtn = next.querySelector('button[aria-label^="Reproduzir"]');
              if (playBtn) playBtn.click();
            }
          }
        });
        skipObserver.observe(document.body, { childList: true, subtree: true });
      } else if (skipObserver) {
        skipObserver.disconnect();
      }
    });
  }

  // scripts/course-page/features/video/looping.js
  function setupLooping(video) {
    const loopIcon = document.getElementById("udemyplus-loop");
    const loopTooltip = document.querySelector("#udemyplus-loop-wrapper .udemyplus-tooltip");
    loopIcon.addEventListener("click", () => {
      const newState = !videoStateService.getLoopEnabled();
      if (newState && videoStateService.getAutoSkipEnabled()) {
        videoStateService.disableAutoSkip();
      }
      videoStateService.setLoopEnabled(newState);
      loopTooltip.textContent = `Loop Video (${newState ? "ON" : "OFF"})`;
      loopIcon.classList.toggle("text-success", newState);
    });
    const loopObserver = new MutationObserver(() => {
      const popup = document.querySelector(".interstitial--container--4wumM");
      if (popup && videoStateService.getLoopEnabled()) {
        const cancelBtn = popup.querySelector('button[data-purpose="cancel-button"]');
        if (cancelBtn) {
          cancelBtn.click();
          const video2 = document.querySelector("video");
          if (video2) {
            video2.currentTime = 0;
            waitForElement('button[data-purpose="play-button"]').then((playBtn) => {
              setTimeout(() => playBtn.click(), 500);
            }).catch((err) => console.warn(err));
          }
        }
      }
    });
    loopObserver.observe(document.body, { childList: true, subtree: true });
  }

  // scripts/course-page/features/video/focusMode.js
  function setupFocusMode(video) {
    let focusActive = false;
    let overlay = null;
    const focusIcon = document.getElementById("udemyplus-focus");
    const focusTooltip = document.querySelector("#udemyplus-focus-wrapper .udemyplus-tooltip");
    focusIcon.addEventListener("click", () => {
      const videoParent = video?.parentElement?.parentElement?.parentElement;
      const panel = document.getElementById("udemy-plus-panel");
      const videoControlsInner = document.querySelector("#udemyplus-video-controls > div");
      const markAllBtn = document.getElementById("complete-all");
      const resetAllBtn = document.getElementById("reset-all");
      if (!focusActive) {
        overlay = document.createElement("div");
        overlay.className = "udemyplus-focus-overlay";
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.style.opacity = "1");
        if (videoParent) videoParent.classList.add("udemyplus-focus-clear");
        if (panel) panel.classList.add("udemyplus-fade-out");
        if (videoControlsInner) videoControlsInner.classList.add("udemyplus-fade-out");
        if (markAllBtn) markAllBtn.style.display = "none";
        if (resetAllBtn) resetAllBtn.style.display = "none";
        focusTooltip.textContent = `Focus Mode (ON)`;
        focusIcon.classList.add("text-success");
        focusActive = true;
      } else {
        if (overlay) {
          overlay.style.opacity = "0";
          setTimeout(() => overlay.remove(), 400);
        }
        if (videoParent) videoParent.classList.remove("udemyplus-focus-clear");
        if (panel) panel.classList.remove("udemyplus-fade-out");
        if (videoControlsInner) videoControlsInner.classList.remove("udemyplus-fade-out");
        if (markAllBtn) markAllBtn.style.display = "";
        if (resetAllBtn) resetAllBtn.style.display = "";
        focusTooltip.textContent = `Focus Mode (OFF)`;
        focusIcon.classList.remove("text-success");
        focusActive = false;
      }
    });
  }

  // scripts/course-page/features/video/videoFilters.js
  function setupVideoFilters(video) {
    const toggleBtn = document.getElementById("udemyplus-filters-toggle");
    const filterPanelBox = document.getElementById("udemyplus-filter-panel");
    toggleBtn.addEventListener("click", () => {
      const isVisible = filterPanelBox.style.display !== "none";
      if (isVisible) {
        filterPanelBox.style.display = "none";
        toggleBtn.classList.remove("text-success");
      } else {
        filterPanelBox.style.display = "block";
        toggleBtn.classList.add("text-success");
      }
    });
    const filterInputs = filterPanelBox.querySelectorAll('input[type="range"]');
    const valueDisplays = {};
    filterInputs.forEach((input) => {
      const id = input.id.replace("filter-", "");
      valueDisplays[id] = document.getElementById(`value-${id}`);
    });
    const updateFilters = () => {
      const values = {};
      filterInputs.forEach((input) => {
        const id = input.id.replace("filter-", "");
        const value = input.value;
        valueDisplays[id].textContent = value;
        values[id] = id === "hue-rotate" ? `${value}deg` : `${value}${id === "blur" ? "px" : "%"}`;
      });
      const filterString = Object.entries(values).map(([key, val]) => `${key}(${val})`).join(" ");
      video.style.filter = filterString;
    };
    filterInputs.forEach((input) => input.addEventListener("input", updateFilters));
    updateFilters();
    document.getElementById("filter-reset").addEventListener("click", () => {
      filterInputs.forEach((input) => {
        const id = input.id.replace("filter-", "");
        input.value = ["brightness", "contrast", "saturate"].includes(id) ? 100 : 0;
        valueDisplays[id].textContent = input.value;
      });
      updateFilters();
    });
    if (typeof interact !== "undefined") {
      interact("#udemyplus-filter-panel").draggable({
        allowFrom: ".card-header",
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
      document.getElementById("udemyplus-filter-panel").style.transform = `translate(0px, 0px)`;
    }
  }

  // scripts/course-page/ui/injectControlsUI.js
  function initVideoControls() {
    const bodyContainer = document.querySelector(".app--row--E-WFM.app--body-container--RJZF2");
    const parent = bodyContainer?.parentElement;
    if (!bodyContainer || !parent || document.querySelector("#udemyplus-video-controls")) return;
    createControlsUI(parent, bodyContainer);
    insertFilterPanel();
    waitForVideoElement((video) => {
      setupSpeedControl(video);
      setupPipControl(video);
      setupVolumeBoost(video);
      setupAutoSkip(video);
      setupLooping(video);
      setupFocusMode(video);
      setupVideoFilters(video);
    });
  }

  // scripts/course-page/initVideoControls.js
  function observeVideoContainer() {
    const observer = new MutationObserver(() => {
      const bodyContainer = document.querySelector(".app--row--E-WFM.app--body-container--RJZF2");
      if (bodyContainer) {
        initVideoControls();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // scripts/course-page/main.js
  var faCSS = document.createElement("link");
  faCSS.rel = "stylesheet";
  faCSS.href = chrome.runtime.getURL("libs/css/fontawesome.min.css");
  document.head.appendChild(faCSS);
  initStatsPanel();
  observeVideoContainer();
})();
