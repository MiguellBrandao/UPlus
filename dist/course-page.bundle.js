(() => {
  // scripts/course-page/utils/domHelpers.js
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  function getSectionButtons() {
    const primary = Array.from(
      document.querySelectorAll(
        'button.js-panel-toggler, .ud-accordion-panel-toggler button, [class*="accordion-panel-module--outer-panel-toggler--"] button'
      )
    );
    if (primary.length > 0) {
      return Array.from(new Set(primary));
    }
    const fallback = Array.from(
      document.querySelectorAll(
        '.ud-accordion-panel-toggler, [class*="accordion-panel-module--outer-panel-toggler--"], .js-panel-toggler'
      )
    ).map((node) => node.tagName === "BUTTON" ? node : node.querySelector("button"));
    return Array.from(new Set(fallback.filter(Boolean)));
  }
  async function expandAllSectionsWithState() {
    const buttons = getSectionButtons();
    const sectionState = buttons.map((button) => ({
      button,
      wasExpanded: button.getAttribute("aria-expanded") === "true"
    }));
    for (const entry of sectionState) {
      const expanded = entry.button.getAttribute("aria-expanded") === "true";
      if (expanded) continue;
      try {
        entry.button.click();
        await sleep(100);
      } catch (e) {
        console.warn("Failed to expand section:", e);
      }
    }
    await sleep(900);
    return sectionState;
  }
  async function restoreSectionState(sectionState = []) {
    for (const entry of sectionState) {
      if (entry.wasExpanded) continue;
      if (!entry.button?.isConnected) continue;
      const isExpandedNow = entry.button.getAttribute("aria-expanded") === "true";
      if (!isExpandedNow) continue;
      try {
        entry.button.click();
        await sleep(80);
      } catch (e) {
        console.warn("Failed to restore section state:", e);
      }
    }
  }
  function focusTopPreviouslyOpenSection(sectionState = []) {
    const topOpenEntry = sectionState.find((entry) => entry.wasExpanded && entry.button?.isConnected);
    if (!topOpenEntry) return;
    try {
      topOpenEntry.button.focus({ preventScroll: true });
      topOpenEntry.button.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      console.warn("Failed to focus top open section:", e);
    }
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
        console.warn("Timeout waiting for <video> element");
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

  // scripts/course-page/services/statsService.js
  var STATS_CACHE_TTL_MS = 24 * 60 * 60 * 1e3;
  var CACHE_PREFIX = "udemyPlusCourseStats::";
  function parseDurationToMinutes(text) {
    if (!text) return null;
    const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
    const hasTimeToken = /(hr|hrs|hour|hours|min|mins|minute|minutes|sec|secs|second|seconds)/.test(
      normalized
    );
    if (!hasTimeToken) return null;
    let minutes = 0;
    const hoursMatch = normalized.match(/(\d+)\s*(hr|hrs|hour|hours)/);
    const minutesMatch = normalized.match(/(\d+)\s*(min|mins|minute|minutes)/);
    const secondsMatch = normalized.match(/(\d+)\s*(sec|secs|second|seconds)/);
    if (hoursMatch) minutes += Number(hoursMatch[1]) * 60;
    if (minutesMatch) minutes += Number(minutesMatch[1]);
    if (secondsMatch && !hoursMatch && !minutesMatch) {
      minutes += Math.max(1, Math.round(Number(secondsMatch[1]) / 60));
    }
    return minutes > 0 ? minutes : null;
  }
  function getLessonMinutes(li) {
    const spans = li.querySelectorAll("span");
    for (const span of spans) {
      const minutes = parseDurationToMinutes(span.textContent);
      if (minutes !== null) return minutes;
    }
    return null;
  }
  function isCompleted(li) {
    const checkbox = li.querySelector('input[data-purpose="progress-toggle-button"]');
    return Boolean(checkbox?.checked);
  }
  function extractCourseStatsFromDom() {
    const lessons = Array.from(
      document.querySelectorAll("li.curriculum-item-link--curriculum-item--OVP5S")
    );
    let totalLessons = 0;
    let completedLessons = 0;
    let totalMinutes = 0;
    let completedMinutes = 0;
    lessons.forEach((li) => {
      const minutes = getLessonMinutes(li);
      if (minutes === null) return;
      totalLessons += 1;
      totalMinutes += minutes;
      if (isCompleted(li)) {
        completedLessons += 1;
        completedMinutes += minutes;
      }
    });
    const progressPercent = totalLessons > 0 ? Math.round(completedLessons / totalLessons * 100) : 0;
    return {
      totalLessons,
      completedLessons,
      totalMinutes,
      completedMinutes,
      progressPercent
    };
  }
  function getCourseSlug() {
    const match = location.pathname.match(/^\/course\/([^/]+)\//);
    return match?.[1] || "unknown-course";
  }
  function getCourseCacheKey() {
    return `${CACHE_PREFIX}${getCourseSlug()}`;
  }
  function getCachedStats() {
    try {
      const raw = localStorage.getItem(getCourseCacheKey());
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  function setCachedStats(payload) {
    try {
      localStorage.setItem(getCourseCacheKey(), JSON.stringify(payload));
    } catch {
    }
  }
  function isCacheFresh(timestamp) {
    if (!timestamp) return false;
    return Date.now() - timestamp < STATS_CACHE_TTL_MS;
  }
  async function getCourseStats({ forceRefresh = false, expandBeforeScrape = true } = {}) {
    const cached = getCachedStats();
    if (!forceRefresh && cached && isCacheFresh(cached.timestamp)) {
      return { ...cached, fromCache: true };
    }
    let sectionState = [];
    if (expandBeforeScrape) {
      sectionState = await expandAllSectionsWithState();
    }
    let liveStats;
    try {
      liveStats = extractCourseStatsFromDom();
    } finally {
      if (expandBeforeScrape) {
        await restoreSectionState(sectionState);
        focusTopPreviouslyOpenSection(sectionState);
      }
    }
    const payload = {
      ...liveStats,
      timestamp: Date.now()
    };
    setCachedStats(payload);
    return { ...payload, fromCache: false };
  }
  function getCourseTitle() {
    const titleEl = document.querySelector("a.header--header-link--X0YLd") || document.querySelector('[data-purpose="course-header-title"]') || document.querySelector('h1[data-purpose="course-header-title"]');
    return titleEl ? titleEl.textContent.trim() : "Course Title";
  }
  function getCacheTtlHours() {
    return STATS_CACHE_TTL_MS / (60 * 60 * 1e3);
  }

  // scripts/course-page/services/udemyApi.js
  function getImageFromMetaTags() {
    const selectors = [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'meta[property="twitter:image"]'
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      const content = el?.getAttribute("content");
      if (content) return content;
    }
    return null;
  }
  function getCourseIdFromDOM() {
    const appEl = document.querySelector('[data-module-args*="courseId"]');
    if (!appEl) return null;
    try {
      const json = JSON.parse(appEl.getAttribute("data-module-args").replace(/&quot;/g, '"'));
      return json.courseId;
    } catch (e) {
      console.warn("Could not extract courseId from DOM:", e);
      return null;
    }
  }
  async function fetchCourseImage(courseId) {
    const metaImage = getImageFromMetaTags();
    if (!courseId) {
      return metaImage;
    }
    try {
      const response = await fetch(
        `https://www.udemy.com/api-2.0/courses/${courseId}/?fields[course]=image_240x135,image_480x270`,
        {
          credentials: "include",
          headers: {
            accept: "application/json, text/plain, */*"
          }
        }
      );
      if (!response.ok) {
        return metaImage;
      }
      const data = await response.json();
      return data.image_240x135 || data.image_480x270 || metaImage;
    } catch {
      return metaImage;
    }
  }

  // scripts/course-page/utils/formatters.js
  function formatDuration(minutesTotal, short = false) {
    const h = Math.floor(minutesTotal / 60);
    const m = minutesTotal % 60;
    return short ? `${h}h` : `${h}h ${m}m`;
  }

  // scripts/course-page/ui/confirmModal.js
  function showConfirmModal({ title, message, riskNote, suppressLabel, onConfirm }) {
    let modal = document.getElementById("udemy-plus-confirm-modal");
    if (!modal) {
      insertConfirmModalHTML();
      modal = document.getElementById("udemy-plus-confirm-modal");
    }
    modal.style.display = "flex";
    modal.querySelector("#confirm-title").innerText = title;
    modal.querySelector("#confirm-message").innerText = message;
    const riskEl = modal.querySelector("#confirm-risk-note");
    if (riskEl) {
      if (riskNote === void 0) {
        riskEl.style.display = "block";
        riskEl.innerText = "Warning: This action is not officially recommended by Udemy. There are no known reports of bans for using this feature, but use it at your own risk.";
      } else if (riskNote) {
        riskEl.style.display = "block";
        riskEl.innerText = riskNote;
      } else {
        riskEl.style.display = "none";
        riskEl.innerText = "";
      }
    }
    const suppressWrap = modal.querySelector("#confirm-suppress-wrap");
    const suppressCheckbox = modal.querySelector("#confirm-suppress");
    const suppressLabelEl = modal.querySelector("#confirm-suppress-label");
    if (suppressWrap && suppressCheckbox && suppressLabelEl) {
      if (suppressLabel) {
        suppressWrap.style.display = "block";
        suppressCheckbox.checked = false;
        suppressLabelEl.innerText = suppressLabel;
      } else {
        suppressWrap.style.display = "none";
        suppressCheckbox.checked = false;
      }
    }
    const confirmBtn = modal.querySelector("#confirm-yes");
    const cancelBtn = modal.querySelector("#confirm-no");
    const closeModal = () => modal.style.display = "none";
    confirmBtn.onclick = () => {
      closeModal();
      if (typeof onConfirm === "function") {
        onConfirm({ dontShowAgain: Boolean(suppressCheckbox?.checked) });
      }
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
          <div id="confirm-risk-note" class="alert alert-warning small mb-0"></div>
          <div id="confirm-suppress-wrap" class="form-check mt-3" style="display:none;">
            <input class="form-check-input" type="checkbox" id="confirm-suppress" />
            <label class="form-check-label small" for="confirm-suppress" id="confirm-suppress-label">Don't show again</label>
          </div>
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
  function getProgressCheckboxes() {
    return Array.from(document.querySelectorAll('input[data-purpose="progress-toggle-button"]'));
  }
  function sleep2(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  async function markAllLessons(completed) {
    showLoadingOverlay();
    let sectionState = [];
    try {
      sectionState = await expandAllSectionsWithState();
      const checkboxes = getProgressCheckboxes();
      checkboxes.forEach((checkbox) => {
        if (checkbox.checked !== completed) checkbox.click();
      });
      await sleep2(700);
      await updatePanelStats({ forceRefresh: true, expandBeforeScrape: false });
      await restoreSectionState(sectionState);
      focusTopPreviouslyOpenSection(sectionState);
      hideLoadingOverlay();
    } catch (error) {
      console.warn("Failed to mark all lessons:", error);
      await restoreSectionState(sectionState);
      focusTopPreviouslyOpenSection(sectionState);
      hideLoadingOverlay();
    }
  }

  // scripts/course-page/services/settingsStore.js
  var SETTINGS_KEY = "uplus_settings";
  var DEFAULT_SETTINGS = {
    showCourseImage: true,
    autoRefreshStats: true,
    showPercentCompleted: true,
    showRemainingTime: true
  };
  var settingsCache = { ...DEFAULT_SETTINGS };
  var initialized = false;
  var storageListenerBound = false;
  var subscribers = /* @__PURE__ */ new Set();
  function notifySubscribers() {
    subscribers.forEach((handler) => {
      try {
        handler({ ...settingsCache });
      } catch (error) {
        console.warn("Settings subscriber failed:", error);
      }
    });
  }
  async function initSettingsStore() {
    if (initialized) return { ...settingsCache };
    try {
      const result = await chrome.storage.local.get(SETTINGS_KEY);
      settingsCache = { ...DEFAULT_SETTINGS, ...result[SETTINGS_KEY] || {} };
    } catch (error) {
      console.warn("Failed to load settings from storage:", error);
      settingsCache = { ...DEFAULT_SETTINGS };
    }
    if (!storageListenerBound) {
      chrome.storage.onChanged.addListener((changes) => {
        const entry = changes[SETTINGS_KEY];
        if (!entry) return;
        settingsCache = { ...DEFAULT_SETTINGS, ...entry.newValue || {} };
        notifySubscribers();
      });
      storageListenerBound = true;
    }
    initialized = true;
    return { ...settingsCache };
  }
  function getSettingsSync() {
    return { ...settingsCache };
  }
  async function getSettings() {
    if (!initialized) {
      await initSettingsStore();
    }
    return { ...settingsCache };
  }
  function subscribeToSettings(handler) {
    subscribers.add(handler);
    return () => subscribers.delete(handler);
  }

  // scripts/course-page/ui/panel.js
  var RISK_NOTE = "Warning: This action is not officially recommended by Udemy. There are no known reports of bans for using this feature, but use it at your own risk.";
  var DEFAULT_CONFIRM_PREFS = {
    markAll: true,
    reset: true,
    refresh: true
  };
  var CONFIRM_PREFS_KEY = "uplus_confirm_dialogs";
  var currentSettings = getSettingsSync();
  var unsubscribeSettings = null;
  var currentConfirmPrefs = { ...DEFAULT_CONFIRM_PREFS };
  async function loadConfirmPrefs() {
    try {
      const result = await chrome.storage.local.get(CONFIRM_PREFS_KEY);
      currentConfirmPrefs = { ...DEFAULT_CONFIRM_PREFS, ...result[CONFIRM_PREFS_KEY] || {} };
    } catch {
      currentConfirmPrefs = { ...DEFAULT_CONFIRM_PREFS };
    }
    return { ...currentConfirmPrefs };
  }
  async function setConfirmPreference(actionKey, shouldShow) {
    currentConfirmPrefs[actionKey] = shouldShow;
    try {
      await chrome.storage.local.set({ [CONFIRM_PREFS_KEY]: currentConfirmPrefs });
    } catch (error) {
      console.warn("Failed to persist confirm preference:", error);
    }
  }
  function applyPanelSettings(panel, settings) {
    currentSettings = { ...settings };
    const imageWrapper = panel.querySelector(".course-image-wrapper");
    if (imageWrapper) {
      imageWrapper.style.display = settings.showCourseImage ? "block" : "none";
    }
    const percentBlock = panel.querySelector(".stats-percent-block");
    if (percentBlock) {
      percentBlock.style.display = settings.showPercentCompleted ? "block" : "none";
    }
    const remainingBlock = panel.querySelector(".stats-remaining-block");
    if (remainingBlock) {
      remainingBlock.style.display = settings.showRemainingTime ? "block" : "none";
    }
  }
  function applyStatsToPanel(panel, stats) {
    const lessonsEl = panel.querySelector(".stats-lessons");
    const durationEl = panel.querySelector(".stats-duration");
    const remainingEl = panel.querySelector(".stats-remaining-value");
    const percentEl = panel.querySelector(".stats-percent");
    const cacheMetaEl = panel.querySelector("#stats-cache-meta");
    const shortFormat = panel.offsetWidth < 340;
    const remainingMinutes = Math.max(0, stats.totalMinutes - stats.completedMinutes);
    if (lessonsEl) lessonsEl.innerText = `${stats.completedLessons}/${stats.totalLessons}`;
    if (durationEl) {
      durationEl.innerText = `~ ${formatDuration(stats.completedMinutes, shortFormat)} / ${formatDuration(stats.totalMinutes, shortFormat)}`;
    }
    if (remainingEl) {
      remainingEl.innerText = formatDuration(remainingMinutes, false);
    }
    if (percentEl) percentEl.innerText = `${stats.progressPercent}%`;
    if (cacheMetaEl) {
      const source = stats.fromCache ? "cache" : "live scrape";
      const updated = new Date(stats.timestamp).toLocaleString("en-US");
      cacheMetaEl.innerText = `Source: ${source} | Updated: ${updated} | TTL: ${getCacheTtlHours()}h`;
    }
  }
  async function updatePanelStats({ forceRefresh = false, expandBeforeScrape = true } = {}) {
    const panel = document.querySelector("#udemy-plus-panel");
    if (!panel) return;
    const refreshBtn = panel.querySelector("#refresh-stats-btn");
    if (refreshBtn) refreshBtn.disabled = true;
    try {
      const stats = await getCourseStats({ forceRefresh, expandBeforeScrape });
      applyStatsToPanel(panel, stats);
    } catch (error) {
      console.warn("Failed to update panel stats:", error);
    } finally {
      if (refreshBtn) refreshBtn.disabled = false;
    }
  }
  function runBulkAction(completed) {
    const actionKey = completed ? "markAll" : "reset";
    if (!currentConfirmPrefs[actionKey]) {
      markAllLessons?.(completed);
      return;
    }
    showConfirmModal({
      title: completed ? "Confirm Mark All" : "Confirm Reset",
      message: completed ? "Are you sure you want to mark all lessons as completed?" : "Are you sure you want to reset all lessons?",
      riskNote: RISK_NOTE,
      suppressLabel: "Don't show this warning again for this action",
      onConfirm: ({ dontShowAgain }) => {
        if (dontShowAgain) {
          void setConfirmPreference(actionKey, false);
        }
        markAllLessons?.(completed);
      }
    });
  }
  function insertStatsPanel() {
    if (document.querySelector("#udemy-plus-panel")) return;
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
    <div class="card shadow-lg border-0 uplus-theme-default" style="font-family: 'Poppins', sans-serif;">
      <div class="card-header udemyplus-panel-header d-flex justify-content-between align-items-center bg-dark text-white p-4">
        <span class="uplus-brand-label"><img src="${chrome.runtime.getURL("assets/icon-32.png")}" alt="UdemyPlus" class="uplus-brand-icon" />UdemyPlus</span>
        <div class="d-flex align-items-center" style="gap: 8px;">
          <button id="refresh-stats-btn" class="btn p-0 m-0 border-0 bg-transparent text-white" title="Refresh stats now" style="font-size: 1.2rem;">
            <i class="fa-solid fa-rotate-right"></i>
          </button>
          <button id="minimize-btn" class="btn p-0 m-0 border-0 bg-transparent text-white" style="font-size: 1.4rem;">${minimized ? "+" : "&minus;"}</button>
        </div>
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
            <div class="stats-lessons fw-semibold">-/-</div>
            <div class="stats-description">lessons completed</div>
          </div>
          <div class="flex-fill text-center rounded p-2">
            <div class="stats-duration fw-semibold">~ loading...</div>
            <div class="stats-description">watched / total</div>
          </div>
        </div>
        <div class="stats-secondary-row mb-2">
          <div class="text-center rounded p-2 flex-fill stats-percent-block">
            <div class="stats-percent fw-bold">0%</div>
            <div class="stats-description">completed</div>
          </div>
          <div class="text-center rounded p-2 flex-fill stats-remaining-block">
            <div class="stats-percent stats-remaining-value fw-bold">0h 0min</div>
            <div class="stats-description">remaining</div>
          </div>
        </div>
        <div class="text-center mb-3">
          <button class="btn btn-success px-4 py-2 me-2 fw-semibold" id="complete-all" title="Use at your own risk. Not officially recommended by Udemy.">Mark All</button>
          <button class="btn btn-danger px-4 py-2 fw-semibold" id="reset-all" title="Use at your own risk. Not officially recommended by Udemy.">Reset</button>
        </div>
        <p id="stats-cache-meta" class="udemyplus-cache-meta">Source: loading...</p>
      </div>
    </div>
  `;
    document.body.appendChild(panel);
    void loadConfirmPrefs();
    chrome.storage.onChanged.addListener((changes) => {
      const confirmEntry = changes[CONFIRM_PREFS_KEY];
      if (confirmEntry) {
        currentConfirmPrefs = { ...DEFAULT_CONFIRM_PREFS, ...confirmEntry.newValue || {} };
      }
    });
    getSettings().then((settings) => applyPanelSettings(panel, settings));
    if (unsubscribeSettings) unsubscribeSettings();
    unsubscribeSettings = subscribeToSettings((nextSettings) => applyPanelSettings(panel, nextSettings));
    const courseId = getCourseIdFromDOM();
    fetchCourseImage(courseId).then((url) => {
      if (url) {
        const img = panel.querySelector("#course-image");
        if (img) img.src = url;
      }
    });
    const btn = document.getElementById("minimize-btn");
    const refreshBtn = document.getElementById("refresh-stats-btn");
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
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        if (!currentConfirmPrefs.refresh) {
          updatePanelStats({ forceRefresh: true, expandBeforeScrape: true });
          return;
        }
        showConfirmModal({
          title: "Confirm Refresh",
          message: "This will run a full stats refresh and temporarily expand all sections. Continue?",
          riskNote: "",
          suppressLabel: "Don't show this warning again for refresh",
          onConfirm: ({ dontShowAgain }) => {
            if (dontShowAgain) {
              void setConfirmPreference("refresh", false);
            }
            updatePanelStats({ forceRefresh: true, expandBeforeScrape: true });
          }
        });
      });
    }
    if (completeAllBtn) {
      completeAllBtn.addEventListener("click", () => runBulkAction(true));
    }
    if (resetAllBtn) {
      resetAllBtn.addEventListener("click", () => runBulkAction(false));
    }
    if (typeof interact !== "undefined") {
      interact("#udemy-plus-panel").draggable({
        allowFrom: ".card-header",
        listeners: {
          move(event) {
            const target = event.target;
            const dx = event.dx;
            const dy = event.dy;
            const match = target.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
            let nextX = match ? parseFloat(match[1]) + dx : dx;
            let nextY = match ? parseFloat(match[2]) + dy : dy;
            const panelRect = target.getBoundingClientRect();
            const padding = 5;
            if (nextX < padding) nextX = padding;
            if (nextX + panelRect.width > window.innerWidth - padding)
              nextX = window.innerWidth - panelRect.width - padding;
            if (nextY < padding) nextY = padding;
            if (nextY + panelRect.height > window.innerHeight - padding)
              nextY = window.innerHeight - panelRect.height - padding;
            target.style.transform = `translate(${nextX}px, ${nextY}px)`;
            savePanelState({ x: nextX, y: nextY });
          }
        }
      });
    }
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = Math.round(entry.contentRect.width);
        const transformMatch = panel.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
        const currentX = transformMatch ? parseFloat(transformMatch[1]) : x;
        const currentY = transformMatch ? parseFloat(transformMatch[2]) : y;
        savePanelState({ x: currentX, y: currentY, width: newWidth });
        updatePanelStats({ forceRefresh: false, expandBeforeScrape: false });
      }
    });
    resizeObserver.observe(panel);
    updatePanelStats({ forceRefresh: false, expandBeforeScrape: true });
  }

  // scripts/course-page/observers/statObservers.js
  function monitorCheckboxChanges() {
    document.body.addEventListener("change", (e) => {
      if (e.target && e.target.matches('input[type="checkbox"][data-purpose="progress-toggle-button"]')) {
        if (!getSettingsSync().autoRefreshStats) return;
        updatePanelStats({ forceRefresh: true, expandBeforeScrape: false });
      }
    });
  }
  function watchCurrentLessonChange() {
    let lastUrl = location.href;
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        if (!getSettingsSync().autoRefreshStats) return;
        updatePanelStats({ forceRefresh: true, expandBeforeScrape: false });
      }
    }, 1e3);
  }

  // scripts/course-page/services/courseHistory.js
  var HISTORY_KEY = "uplus_course_history";
  var MAX_ITEMS = 20;
  function getCourseSlug2() {
    const match = location.pathname.match(/^\/course\/([^/]+)/);
    return match?.[1] || null;
  }
  function getCourseTitle2() {
    const titleEl = document.querySelector("a.header--header-link--X0YLd") || document.querySelector('[data-purpose="course-header-title"]') || document.querySelector('h1[data-purpose="course-header-title"]');
    return titleEl?.textContent?.trim() || "Udemy Course";
  }
  function isContextInvalidated(error) {
    const message = String(error?.message || error || "");
    return message.includes("Extension context invalidated");
  }
  async function saveCurrentCourseToHistory() {
    const slug = getCourseSlug2();
    if (!slug) return;
    if (!chrome?.runtime?.id) return;
    const courseUrl = `https://www.udemy.com/course/${slug}/`;
    const title = getCourseTitle2();
    const visitedAt = Date.now();
    try {
      const result = await chrome.storage.local.get(HISTORY_KEY);
      const current = Array.isArray(result[HISTORY_KEY]) ? result[HISTORY_KEY] : [];
      const deduped = current.filter((item) => item?.url !== courseUrl);
      const next = [{ url: courseUrl, title, visitedAt }, ...deduped].slice(0, MAX_ITEMS);
      await chrome.storage.local.set({ [HISTORY_KEY]: next });
    } catch (error) {
      if (isContextInvalidated(error)) return;
      console.warn("Failed to save course history:", error);
    }
  }

  // scripts/course-page/initStatsPanel.js
  function initStatsPanel() {
    let tries = 0;
    const interval = setInterval(() => {
      const hasCurriculum = document.querySelectorAll("li.curriculum-item-link--curriculum-item--OVP5S").length > 0;
      const interactReady = typeof interact !== "undefined";
      if (hasCurriculum && interactReady) {
        clearInterval(interval);
        saveCurrentCourseToHistory();
        insertStatsPanel();
        monitorCheckboxChanges();
        watchCurrentLessonChange();
      }
      if (++tries > 60) clearInterval(interval);
    }, 500);
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
  `;
    wrapper.appendChild(inner);
    parent.insertBefore(wrapper, bodyContainer.nextSibling);
  }

  // scripts/course-page/features/video/speedControl.js
  function setupSpeedControl(video) {
    const speedWrapper = document.getElementById("udemyplus-speed-wrapper");
    const speedTooltip = speedWrapper.querySelector(".udemyplus-tooltip");
    speedWrapper.addEventListener("wheel", (e) => {
      e.preventDefault();
      const increment = 0.1;
      const newRate = Math.min(
        16,
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

  // scripts/course-page/ui/injectControlsUI.js
  function initVideoControls() {
    const bodyContainer = document.querySelector(".app--row--E-WFM.app--body-container--RJZF2");
    const parent = bodyContainer?.parentElement;
    if (!bodyContainer || !parent || document.querySelector("#udemyplus-video-controls")) return;
    createControlsUI(parent, bodyContainer);
    waitForVideoElement((video) => {
      setupSpeedControl(video);
      setupPipControl(video);
      setupVolumeBoost(video);
      setupAutoSkip(video);
      setupLooping(video);
      setupFocusMode(video);
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

  // scripts/course-page/keyboardShortcuts.js
  function isTypingTarget(target) {
    if (!target) return false;
    const tag = target.tagName?.toLowerCase();
    return tag === "input" || tag === "textarea" || target.isContentEditable;
  }
  function clickById(id) {
    const element = document.getElementById(id);
    if (!element) return false;
    element.click();
    return true;
  }
  function adjustVideoSpeed(step) {
    const video = document.querySelector("video");
    if (!video) return false;
    const nextRate = Math.min(16, Math.max(0.1, video.playbackRate + step));
    video.playbackRate = Number(nextRate.toFixed(2));
    const tooltip = document.querySelector("#udemyplus-speed-wrapper .udemyplus-tooltip");
    if (tooltip) {
      tooltip.textContent = `Speed (${video.playbackRate.toFixed(2)}x)`;
    }
    return true;
  }
  function initKeyboardShortcuts() {
    if (window.__uplusShortcutsBound) return;
    window.__uplusShortcutsBound = true;
    document.addEventListener("keydown", (event) => {
      if (isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      let handled = false;
      if (!event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
        if (key === "s") handled = adjustVideoSpeed(-0.1);
        if (key === "d") handled = adjustVideoSpeed(0.1);
      }
      if (!handled && event.altKey && event.shiftKey) {
        if (key === "r") handled = clickById("refresh-stats-btn");
        if (key === "m") handled = clickById("minimize-btn");
        if (key === "f") handled = clickById("udemyplus-focus");
        if (key === "l") handled = clickById("udemyplus-loop");
        if (key === "s") handled = clickById("udemyplus-disable-next");
        if (key === "p") handled = clickById("udemyplus-pip");
        if (key === "v") handled = clickById("udemyplus-volume");
      }
      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
  }

  // scripts/course-page/main.js
  var faCSS = document.createElement("link");
  faCSS.rel = "stylesheet";
  faCSS.href = chrome.runtime.getURL("libs/css/fontawesome.min.css");
  document.head.appendChild(faCSS);
  async function boot() {
    await initSettingsStore();
    initStatsPanel();
    observeVideoContainer();
    initKeyboardShortcuts();
  }
  boot();
})();
