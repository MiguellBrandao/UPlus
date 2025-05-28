(function () {
  console.log("🚀 UdemyPlus script started");

  let minimized = false;
  let initiallyOpenIndex = null;

  function formatDuration(minutesTotal, short = false) {
    const h = Math.floor(minutesTotal / 60);
    const m = minutesTotal % 60;
    return short ? `${h}h` : `${h}h ${m}min`;
  }

  function expandAllSections(callback) {
    const buttons = document.querySelectorAll('button.js-panel-toggler');
    initiallyOpenIndex = null;

    buttons.forEach((btn, index) => {
      if (btn.getAttribute('aria-expanded') === 'true' && initiallyOpenIndex === null) {
        initiallyOpenIndex = index;
      }
    });

    const collapsed = document.querySelectorAll('button.js-panel-toggler[aria-expanded="false"]');
    collapsed.forEach(btn => {
      try { btn.click(); } catch (e) { console.warn("❌ Failed to expand section:", e); }
    });

    setTimeout(() => {
      if (typeof callback === 'function') callback();
    }, 800);
  }

  function restoreInitiallyOpenSection() {
    const buttons = document.querySelectorAll('button.js-panel-toggler');
    buttons.forEach((btn) => {
      if (btn.getAttribute('aria-expanded') === 'true') {
        try { btn.click(); } catch (e) { console.warn("❌ Failed to collapse section:", e); }
      }
    });

    if (initiallyOpenIndex !== null && buttons[initiallyOpenIndex]) {
      const btn = buttons[initiallyOpenIndex];
      if (btn.getAttribute('aria-expanded') === 'false') {
        try {
          btn.click();
          btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (e) {
          console.warn("❌ Failed to reopen initial section:", e);
        }
      }
    }
  }

  function showLoadingOverlay() {
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
    spinner.style.cssText = `margin-top: 250px; width: 5rem; height: 5rem;`;
    spinner.role = 'status';
    spinner.innerHTML = `<span class="visually-hidden">Loading...</span>`;
    overlay.appendChild(spinner);
    container.style.position = 'relative';
    container.appendChild(overlay);
  }

  function hideLoadingOverlay() {
    const overlay = document.getElementById('udemy-plus-loading');
    if (overlay) overlay.remove();
  }

  function extractCourseStats() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"][data-purpose="progress-toggle-button"]');
    let totalLessons = 0, completedLessons = 0;
    let totalMinutes = 0, completedMinutes = 0;

    checkboxes.forEach(checkbox => {
      totalLessons++;
      const isChecked = checkbox.checked;
      if (isChecked) completedLessons++;

      const wrapper = checkbox.closest('li');
      if (!wrapper) return;

      const timeSpan = wrapper.querySelector('.curriculum-item-link--metadata--XK804 span');
      if (timeSpan) {
        const text = timeSpan.innerText.trim();
        const match = text.match(/(?:(\d+)h)?\s*(\d+)m/);
        if (match) {
          const h = match[1] ? parseInt(match[1]) : 0;
          const m = match[2] ? parseInt(match[2]) : 0;
          const minutes = h * 60 + m;
          totalMinutes += minutes;
          if (isChecked) completedMinutes += minutes;
        }
      }
    });

    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    return { totalLessons, completedLessons, totalMinutes, completedMinutes, progressPercent };
  }

  function getCourseTitle() {
    const titleEl = document.querySelector('a.header--header-link--X0YLd');
    return titleEl ? titleEl.textContent.trim() : 'Course Title';
  }

  function updatePanelStats(forceExpand = false) {
    const run = () => {
      const stats = extractCourseStats();
      const panel = document.querySelector('#udemy-plus-panel');
      if (!panel) return;
      const lessonsEl = panel.querySelector('.stats-lessons');
      const durationEl = panel.querySelector('.stats-duration');
      const percentEl = panel.querySelector('.stats-percent');

      const shortFormat = panel.offsetWidth < 290;

      if (lessonsEl) lessonsEl.innerText = `${stats.completedLessons}/${stats.totalLessons}`;
      if (durationEl) durationEl.innerText = `${formatDuration(stats.completedMinutes, shortFormat)} / ${formatDuration(stats.totalMinutes, shortFormat)}`;
      if (percentEl) percentEl.innerText = `${stats.progressPercent}%`;
    };

    if (forceExpand) {
      expandAllSections(() => setTimeout(run, 500));
    } else {
      run();
    }
  }

  function markAllLessons(completed) {
    expandAllSections(() => {
      showLoadingOverlay();
      setTimeout(() => {
        const checkboxes = document.querySelectorAll('input[data-purpose="progress-toggle-button"]');
        checkboxes.forEach(checkbox => {
          if (checkbox.checked !== completed) checkbox.click();
        });
        hideLoadingOverlay();
        updatePanelStats(true);
      }, 800);
    });
  }

   function monitorCheckboxChanges() {
    document.body.addEventListener('change', (e) => {
      if (e.target && e.target.matches('input[type="checkbox"][data-purpose="progress-toggle-button"]')) {
        const panel = document.querySelector('#udemy-plus-panel');
        if (!panel) return;

        const lessonsEl = panel.querySelector('.stats-lessons');
        const percentEl = panel.querySelector('.stats-percent');

        let [completed, total] = lessonsEl.innerText.match(/\d+/g).map(Number);
        if (e.target.checked) {
          completed++;
        } else {
          completed = Math.max(0, completed - 1);
        }

        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        lessonsEl.innerText = `${completed}/${total} lessons completed`;
        percentEl.innerText = `${percent}% completed`;
      }
    });
  }

  function watchCurrentLessonChange() {
    let lastUrl = location.href;

    setInterval(() => {
      if (location.href !== lastUrl) {
        console.log("🎬 Detetada mudança de vídeo via URL");
        lastUrl = location.href;

        expandAllSections(() => {
          setTimeout(() => {
            updatePanelStats();
            restoreInitiallyOpenSection();
          }, 500);
        });
      }
    }, 1000);
  }

  function getCourseIdFromDOM() {
    const appEl = document.querySelector('[data-module-args*="courseId"]');
    if (!appEl) return null;

    try {
      const json = JSON.parse(appEl.getAttribute('data-module-args').replace(/&quot;/g, '"'));
      return json.courseId;
    } catch (e) {
      console.warn("❌ Erro ao extrair courseId:", e);
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
      console.warn("❌ Erro ao buscar imagem do curso:", e);
      return null;
    }
  }

  function insertStatsPanel() {
    if (document.querySelector('#udemy-plus-panel')) return;

    const stats = extractCourseStats();
    const savedPosition = JSON.parse(localStorage.getItem('udemyPlusPanelPos')) || { x: 20, y: 20 };
    const savedWidth = parseInt(localStorage.getItem('udemyPlusPanelWidth')) || 250;
    const isMinimized = localStorage.getItem('udemyPlusMinimized') === 'true';
    const courseTitle = getCourseTitle();

    const panel = document.createElement('div');
    panel.id = 'udemy-plus-panel';
    panel.style.cssText = `
      position: fixed;
      z-index: 9997;
      width: ${savedWidth}px;
      font-family: 'Poppins', sans-serif;
      transform: translate(${savedPosition.x}px, ${savedPosition.y}px);
      resize: horizontal;
      overflow: auto;
      min-width: 250px;
      max-width: 500px;
    `;

    panel.innerHTML = `
      <div class="card shadow-lg border-0" style="font-family: 'Poppins', sans-serif;">
        <div class="card-header d-flex justify-content-between align-items-center bg-dark text-white p-4" style="cursor: move; font-size: 1.4rem;">
          <span><i class="fa-solid fa-bolt me-2"></i> UdemyPlus</span>
          <button id="minimize-btn" class="btn p-0 m-0 border-0 bg-transparent text-white" style="font-size: 1.4rem;">${isMinimized ? '+' : '&minus;'}</button>
        </div>
        <div class="card-body" id="panel-body" style="display: ${isMinimized ? 'none' : 'block'};">
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
                ${formatDuration(stats.completedMinutes, savedWidth < 290)} / ${formatDuration(stats.totalMinutes, savedWidth < 290)}
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
      fetchCourseImage(courseId).then((url) => {
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
        minimized = !minimized;
        body.style.display = minimized ? 'none' : 'block';
        btn.innerHTML = minimized ? '+' : '&minus;';
        localStorage.setItem('udemyPlusMinimized', minimized);
      });
    }

    if (completeAllBtn) {
      completeAllBtn.addEventListener('click', () => {
        showConfirmModal({
          title: "Confirm Mark All",
          message: "Are you sure you want to mark all lessons as completed?",
          onConfirm: () => markAllLessons(true)
        });
      });
    }

    if (resetAllBtn) {
      resetAllBtn.addEventListener('click', () => {
        showConfirmModal({
          title: "Confirm Reset",
          message: "Are you sure you want to reset all lessons?",
          onConfirm: () => markAllLessons(false)
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

            const match = target.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
            let x = match ? parseFloat(match[1]) + dx : dx;
            let y = match ? parseFloat(match[2]) + dy : dy;

            const panelRect = target.getBoundingClientRect();
            const padding = 5;

            if (x < padding) x = padding;
            if (x + panelRect.width > window.innerWidth - padding) {
              x = window.innerWidth - panelRect.width - padding;
            }

            if (y < padding) y = padding;
            if (y + panelRect.height > window.innerHeight - padding) {
              y = window.innerHeight - panelRect.height - padding;
            }

            target.style.transform = `translate(${x}px, ${y}px)`;
            localStorage.setItem('udemyPlusPanelPos', JSON.stringify({ x, y }));
          }
        }
      });
    }

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const width = Math.round(entry.contentRect.width);
        localStorage.setItem('udemyPlusPanelWidth', width);
        updatePanelStats();
      }
    });

    resizeObserver.observe(panel);

    const confirmModal = document.createElement('div');
    confirmModal.id = 'udemy-plus-confirm-modal';
    confirmModal.className = 'modal fade show';
    confirmModal.tabIndex = -1;
    confirmModal.setAttribute('role', 'dialog');
    confirmModal.style.cssText = `
      display: none;
      background-color: rgba(0,0,0,0.6);
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 9998;
      justify-content: center;
      align-items: center;
    `;

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

  function showConfirmModal({ title, message, onConfirm }) {
    const modal = document.getElementById('udemy-plus-confirm-modal');
    modal.style.display = 'flex';

    modal.querySelector('#confirm-title').innerText = title;
    modal.querySelector('#confirm-message').innerText = message;

    const confirmBtn = modal.querySelector('#confirm-yes');
    const cancelBtn = modal.querySelector('#confirm-no');

    const closeModal = () => (modal.style.display = 'none');

    confirmBtn.onclick = () => {
      closeModal();
      if (typeof onConfirm === 'function') onConfirm();
    };

    cancelBtn.onclick = closeModal;

    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };
  }

  function tryInsertWithRetries() {
    let tries = 0;
    const interval = setInterval(() => {
      expandAllSections();

      const lessonCount = document.querySelectorAll('div[data-purpose^="curriculum-item-"]').length;
      const interactReady = typeof interact !== 'undefined';

      if (lessonCount > 5 && interactReady) {
        insertStatsPanel();
        monitorCheckboxChanges();
        watchCurrentLessonChange();
        clearInterval(interval);
        setTimeout(() => restoreInitiallyOpenSection(), 1000);
      }

      if (++tries > 30) clearInterval(interval);
    }, 1000);
  }

  tryInsertWithRetries();
})();
