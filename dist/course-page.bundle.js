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

  // scripts/course-page/services/settingsStore.js
  var SETTINGS_KEY = "uplus_settings";
  var DEFAULT_SETTINGS = {
    showCourseImage: true,
    autoRefreshStats: true,
    showPercentCompleted: true,
    showRemainingTime: true,
    showStatsMeta: false,
    statsCacheTtlHours: 1,
    highlightSectionProgress: true,
    persistVideoControllerState: true
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

  // scripts/course-page/services/statsService.js
  var CACHE_PREFIX = "udemyPlusCourseStats::";
  var DEFAULT_CACHE_TTL_HOURS = 1;
  var MIN_CACHE_TTL_HOURS = 1;
  var MAX_CACHE_TTL_HOURS = 24;
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
  function getCacheTtlHoursValue() {
    const settings = getSettingsSync();
    const raw = Number(settings.statsCacheTtlHours);
    if (!Number.isFinite(raw)) return DEFAULT_CACHE_TTL_HOURS;
    return Math.min(MAX_CACHE_TTL_HOURS, Math.max(MIN_CACHE_TTL_HOURS, raw));
  }
  function getCacheTtlMs() {
    return getCacheTtlHoursValue() * 60 * 60 * 1e3;
  }
  function isCacheFresh(timestamp, ttlMs) {
    if (!timestamp) return false;
    return Date.now() - timestamp < ttlMs;
  }
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
  function updateStatsFromLessonToggle(checkboxEl) {
    if (!checkboxEl) return null;
    const lessonItem = checkboxEl.closest("li.curriculum-item-link--curriculum-item--OVP5S");
    if (!lessonItem) return null;
    const minutes = getLessonMinutes(lessonItem);
    if (minutes === null) return null;
    const cached = getCachedStats();
    if (!cached) return null;
    const becameCompleted = Boolean(checkboxEl.checked);
    const completedDelta = becameCompleted ? 1 : -1;
    const minutesDelta = becameCompleted ? minutes : -minutes;
    const completedLessons = clamp(
      (cached.completedLessons || 0) + completedDelta,
      0,
      cached.totalLessons || 0
    );
    const completedMinutes = clamp(
      (cached.completedMinutes || 0) + minutesDelta,
      0,
      cached.totalMinutes || 0
    );
    const progressPercent = (cached.totalLessons || 0) > 0 ? Math.round(completedLessons / cached.totalLessons * 100) : 0;
    const next = {
      ...cached,
      completedLessons,
      completedMinutes,
      progressPercent,
      timestamp: Date.now(),
      source: "incremental"
    };
    setCachedStats(next);
    return { ...next, fromCache: false };
  }
  async function getCourseStats({ forceRefresh = false, expandBeforeScrape = true } = {}) {
    const cached = getCachedStats();
    const ttlMs = getCacheTtlMs();
    if (!forceRefresh && cached && isCacheFresh(cached.timestamp, ttlMs)) {
      return { ...cached, source: "cache", fromCache: true };
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
      timestamp: Date.now(),
      source: "live scrape"
    };
    setCachedStats(payload);
    return { ...payload, fromCache: false };
  }
  function getCourseTitle() {
    const titleEl = document.querySelector("a.header--header-link--X0YLd") || document.querySelector('[data-purpose="course-header-title"]') || document.querySelector('h1[data-purpose="course-header-title"]');
    return titleEl ? titleEl.textContent.trim() : "Course Title";
  }
  function getCacheTtlHours() {
    return getCacheTtlHoursValue();
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

  // scripts/course-page/services/courseActions.js
  function getProgressCheckboxes() {
    return Array.from(document.querySelectorAll('input[data-purpose="progress-toggle-button"]'));
  }
  function sleep2(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  async function markAllLessons(completed) {
    showLoadingOverlay();
    window.__uplusBulkActionRunning = true;
    let sectionState = [];
    try {
      sectionState = await expandAllSectionsWithState();
      const checkboxes = getProgressCheckboxes();
      checkboxes.forEach((checkbox) => {
        if (checkbox.checked !== completed) checkbox.click();
      });
      await sleep2(700);
      await updatePanelStats({ forceRefresh: true, expandBeforeScrape: false });
    } catch (error) {
      console.warn("Failed to mark all lessons:", error);
    } finally {
      await restoreSectionState(sectionState);
      focusTopPreviouslyOpenSection(sectionState);
      hideLoadingOverlay();
      window.__uplusBulkActionRunning = false;
    }
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
  function getRuntimeAssetUrl(path) {
    try {
      if (!chrome?.runtime?.id) return "";
      return chrome.runtime.getURL(path);
    } catch {
      return "";
    }
  }
  function startStatsRefreshLock() {
    const current = Number(window.__uplusStatsRefreshDepth || 0);
    window.__uplusStatsRefreshDepth = current + 1;
  }
  function endStatsRefreshLock() {
    const current = Number(window.__uplusStatsRefreshDepth || 0);
    window.__uplusStatsRefreshDepth = Math.max(0, current - 1);
  }
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
    const cacheMeta = panel.querySelector("#stats-cache-meta");
    if (cacheMeta) {
      cacheMeta.style.display = settings.showStatsMeta ? "block" : "none";
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
      durationEl.innerText = `${formatDuration(stats.completedMinutes, shortFormat)} / ${formatDuration(stats.totalMinutes, shortFormat)}`;
    }
    if (remainingEl) {
      remainingEl.innerText = formatDuration(remainingMinutes, false);
    }
    if (percentEl) percentEl.innerText = `${stats.progressPercent}%`;
    if (cacheMetaEl) {
      const source = stats.source || (stats.fromCache ? "cache" : "live scrape");
      const sourceLabel = source === "incremental" ? "instant update" : source;
      const updated = new Date(stats.timestamp).toLocaleString("en-US");
      cacheMetaEl.innerText = `Source: ${sourceLabel} | Updated: ${updated} | TTL: ${getCacheTtlHours()}h`;
    }
  }
  async function updatePanelStats({
    forceRefresh = false,
    expandBeforeScrape = true,
    showLoading = false
  } = {}) {
    const panel = document.querySelector("#udemy-plus-panel");
    if (!panel) return;
    const shouldShowLoading = showLoading || expandBeforeScrape;
    const refreshBtn = panel.querySelector("#refresh-stats-btn");
    if (refreshBtn) refreshBtn.disabled = true;
    if (shouldShowLoading) showLoadingOverlay();
    startStatsRefreshLock();
    try {
      const stats = await getCourseStats({ forceRefresh, expandBeforeScrape });
      applyStatsToPanel(panel, stats);
    } catch (error) {
      console.warn("Failed to update panel stats:", error);
    } finally {
      endStatsRefreshLock();
      if (shouldShowLoading) hideLoadingOverlay();
      if (refreshBtn) refreshBtn.disabled = false;
    }
  }
  function updatePanelStatsFromToggle(checkboxEl) {
    const panel = document.querySelector("#udemy-plus-panel");
    if (!panel) return;
    const deltaStats = updateStatsFromLessonToggle(checkboxEl);
    if (deltaStats) {
      applyStatsToPanel(panel, deltaStats);
      return;
    }
    void updatePanelStats({ forceRefresh: true, expandBeforeScrape: true });
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
    const brandIconUrl = getRuntimeAssetUrl("assets/icon-32.png");
    const brandIconHtml = brandIconUrl ? `<img src="${brandIconUrl}" alt="UdemyPlus" class="uplus-brand-icon" />` : "";
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
        <span class="uplus-brand-label">${brandIconHtml}UdemyPlus</span>
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
            <div class="stats-duration fw-semibold">loading...</div>
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
          updatePanelStats({ forceRefresh: true, expandBeforeScrape: true, showLoading: true });
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
            updatePanelStats({ forceRefresh: true, expandBeforeScrape: true, showLoading: true });
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
  function getLessonKey(checkbox, index) {
    const li = checkbox.closest("li");
    if (!li) return `idx:${index}`;
    const lectureAnchor = li.querySelector('a[href*="/learn/lecture/"]');
    const href = lectureAnchor?.getAttribute("href") || "";
    const match = href.match(/\/learn\/lecture\/(\d+)/);
    if (match?.[1]) return `lecture:${match[1]}`;
    return `idx:${index}`;
  }
  function getProgressCheckboxes2() {
    return Array.from(
      document.querySelectorAll('input[type="checkbox"][data-purpose="progress-toggle-button"]')
    );
  }
  function readCheckboxStateMap() {
    const map = /* @__PURE__ */ new Map();
    getProgressCheckboxes2().forEach((checkbox, index) => {
      map.set(getLessonKey(checkbox, index), Boolean(checkbox.checked));
    });
    return map;
  }
  function isStatsRefreshRunning() {
    return Number(window.__uplusStatsRefreshDepth || 0) > 0;
  }
  function applyStateDiff(previousMap, nextMap) {
    if (window.__uplusBulkActionRunning) return;
    if (isStatsRefreshRunning()) return;
    if (!getSettingsSync().autoRefreshStats) return;
    const checkboxes = getProgressCheckboxes2();
    checkboxes.forEach((checkbox, index) => {
      const key = getLessonKey(checkbox, index);
      if (!previousMap.has(key) || !nextMap.has(key)) return;
      const previousChecked = previousMap.get(key);
      const nextChecked = nextMap.get(key);
      if (previousChecked === nextChecked) return;
      updatePanelStatsFromToggle(checkbox);
    });
  }
  function monitorCheckboxChanges() {
    if (window.__uplusStatsObserverBound) return;
    window.__uplusStatsObserverBound = true;
    let lastState = readCheckboxStateMap();
    let scheduled = false;
    const scheduleDiff = () => {
      if (scheduled) return;
      scheduled = true;
      window.setTimeout(() => {
        const nextState = readCheckboxStateMap();
        applyStateDiff(lastState, nextState);
        lastState = nextState;
        scheduled = false;
      }, 120);
    };
    document.body.addEventListener("change", (e) => {
      if (e.target && e.target.matches('input[type="checkbox"][data-purpose="progress-toggle-button"]')) {
        if (window.__uplusBulkActionRunning) return;
        if (isStatsRefreshRunning()) return;
        if (!getSettingsSync().autoRefreshStats) return;
        updatePanelStatsFromToggle(e.target);
        lastState = readCheckboxStateMap();
      }
    });
    const observer = new MutationObserver(() => {
      scheduleDiff();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["checked", "aria-checked", "class"]
    });
    window.setInterval(() => {
      scheduleDiff();
    }, 800);
  }

  // scripts/course-page/observers/sectionStatusStyling.js
  var SECTION_BUTTON_SELECTOR = [
    "button.js-panel-toggler",
    ".ud-accordion-panel-toggler button",
    '[class*="accordion-panel-module--outer-panel-toggler--"] button'
  ].join(", ");
  var SECTION_CONTAINER_SELECTOR = [
    '[class*="accordion-panel-module--panel--"]',
    ".ud-accordion-panel",
    'li[class*="section--section"]'
  ].join(", ");
  function parseSectionProgressFromText(text) {
    if (!text) return null;
    const match = text.match(/(\d+)\s*\/\s*(\d+)/);
    if (!match) return null;
    const completed = Number(match[1]);
    const total = Number(match[2]);
    if (!Number.isFinite(completed) || !Number.isFinite(total) || total <= 0) return null;
    return { completed, total };
  }
  function getSectionProgress(button) {
    const container = button.closest(SECTION_CONTAINER_SELECTOR) || button.parentElement;
    if (!container) return null;
    const statusTextEl = container.querySelector('[data-purpose="section-duration"] span[aria-hidden="true"]') || container.querySelector('[data-purpose="section-duration"]');
    return parseSectionProgressFromText(statusTextEl?.textContent || "");
  }
  function clearSectionStyles(button) {
    button.classList.remove(
      "uplus-section-complete",
      "uplus-section-progress",
      "uplus-section-not-started"
    );
  }
  function applySectionStyles() {
    const { highlightSectionProgress } = getSettingsSync();
    const sectionButtons = Array.from(document.querySelectorAll(SECTION_BUTTON_SELECTOR));
    sectionButtons.forEach((button) => {
      clearSectionStyles(button);
      if (!highlightSectionProgress) return;
      const progress = getSectionProgress(button);
      if (!progress) return;
      if (progress.completed === 0) {
        button.classList.add("uplus-section-not-started");
        return;
      }
      if (progress.completed >= progress.total && progress.completed > 0) {
        button.classList.add("uplus-section-complete");
        return;
      }
      if (progress.completed > 0 && progress.completed < progress.total) {
        button.classList.add("uplus-section-progress");
      }
    });
  }
  function initSectionStatusStyling() {
    if (window.__uplusSectionStylingBound) return;
    window.__uplusSectionStylingBound = true;
    let scheduled = false;
    const scheduleApply = () => {
      if (scheduled) return;
      scheduled = true;
      window.setTimeout(() => {
        applySectionStyles();
        scheduled = false;
      }, 150);
    };
    applySectionStyles();
    subscribeToSettings(() => applySectionStyles());
    const observer = new MutationObserver(() => {
      scheduleApply();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
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
        initSectionStatusStyling();
      }
      if (++tries > 60) clearInterval(interval);
    }, 500);
  }

  // scripts/course-page/features/video/createControlsUI.js
  function createControlsUI(nativeControlsBar, { beforeNode = null, afterNode = null } = {}) {
    if (!nativeControlsBar) return;
    const wrapper = document.createElement("div");
    wrapper.id = "udemyplus-video-controls";
    wrapper.className = "udemyplus-video-controls";
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

  // scripts/course-page/services/videoState.js
  var loopEnabled = false;
  var autoSkipEnabled = false;
  var preferredPlaybackRate = 1;
  var volumeBoostEnabled = false;
  var focusModeEnabled = false;
  var pipEnabled = false;
  var persistAcrossReloads = true;
  var VIDEO_STATE_STORAGE_KEY = "uplus_video_control_state_v1";
  function clampPlaybackRate(val) {
    const num = Number(val);
    if (!Number.isFinite(num)) return 1;
    return Math.min(16, Math.max(0.1, Number(num.toFixed(2))));
  }
  function getStateSnapshot() {
    return {
      loopEnabled,
      autoSkipEnabled,
      preferredPlaybackRate: clampPlaybackRate(preferredPlaybackRate),
      volumeBoostEnabled,
      focusModeEnabled,
      pipEnabled
    };
  }
  function applyStateSnapshot(snapshot = {}) {
    loopEnabled = Boolean(snapshot.loopEnabled);
    autoSkipEnabled = Boolean(snapshot.autoSkipEnabled);
    preferredPlaybackRate = clampPlaybackRate(snapshot.preferredPlaybackRate);
    volumeBoostEnabled = Boolean(snapshot.volumeBoostEnabled);
    focusModeEnabled = Boolean(snapshot.focusModeEnabled);
    pipEnabled = Boolean(snapshot.pipEnabled);
  }
  function persistStateIfEnabled() {
    if (!persistAcrossReloads) return;
    try {
      localStorage.setItem(VIDEO_STATE_STORAGE_KEY, JSON.stringify(getStateSnapshot()));
    } catch {
    }
  }
  function loadPersistedStateIfEnabled() {
    if (!persistAcrossReloads) return;
    try {
      const raw = localStorage.getItem(VIDEO_STATE_STORAGE_KEY);
      if (!raw) return;
      applyStateSnapshot(JSON.parse(raw));
    } catch {
    }
  }
  function initVideoStatePersistence() {
    const settings = getSettingsSync();
    persistAcrossReloads = settings.persistVideoControllerState !== false;
    loadPersistedStateIfEnabled();
    subscribeToSettings((nextSettings) => {
      const nextPersist = nextSettings.persistVideoControllerState !== false;
      if (nextPersist === persistAcrossReloads) return;
      persistAcrossReloads = nextPersist;
      if (persistAcrossReloads) {
        persistStateIfEnabled();
        return;
      }
      try {
        localStorage.removeItem(VIDEO_STATE_STORAGE_KEY);
      } catch {
      }
    });
  }
  var videoStateService = {
    getLoopEnabled: () => loopEnabled,
    setLoopEnabled: (val) => {
      loopEnabled = Boolean(val);
      persistStateIfEnabled();
    },
    getAutoSkipEnabled: () => autoSkipEnabled,
    setAutoSkipEnabled: (val) => {
      autoSkipEnabled = Boolean(val);
      persistStateIfEnabled();
    },
    getPreferredPlaybackRate: () => preferredPlaybackRate,
    setPreferredPlaybackRate: (val) => {
      preferredPlaybackRate = clampPlaybackRate(val);
      persistStateIfEnabled();
    },
    getVolumeBoostEnabled: () => volumeBoostEnabled,
    setVolumeBoostEnabled: (val) => {
      volumeBoostEnabled = Boolean(val);
      persistStateIfEnabled();
    },
    getFocusModeEnabled: () => focusModeEnabled,
    setFocusModeEnabled: (val) => {
      focusModeEnabled = Boolean(val);
      persistStateIfEnabled();
    },
    getPipEnabled: () => pipEnabled,
    setPipEnabled: (val) => {
      pipEnabled = Boolean(val);
      persistStateIfEnabled();
    },
    disableLoop: () => {
      loopEnabled = false;
      persistStateIfEnabled();
      const loopIcon = document.getElementById("udemyplus-loop");
      const loopTooltip = document.querySelector("#udemyplus-loop-wrapper .udemyplus-tooltip");
      loopIcon?.classList.remove("text-success");
      if (loopTooltip) loopTooltip.textContent = "Loop Video (OFF)";
    },
    disableAutoSkip: () => {
      autoSkipEnabled = false;
      persistStateIfEnabled();
      const skipBtn = document.getElementById("udemyplus-disable-next");
      const skipTooltip = skipBtn?.nextElementSibling;
      skipBtn?.classList.remove("text-success");
      if (skipTooltip) skipTooltip.textContent = "Auto Skip Delay (OFF)";
    }
  };

  // scripts/course-page/features/video/speedControl.js
  var speedBoundVideos = /* @__PURE__ */ new WeakSet();
  function updateSpeedLabel(rate) {
    const speedValueBtn = document.getElementById("udemyplus-speed");
    if (!speedValueBtn) return;
    speedValueBtn.textContent = `${rate.toFixed(2)}x`;
  }
  function setupSpeedControl(video) {
    const speedWrapper = document.getElementById("udemyplus-speed-wrapper");
    const decreaseBtn = document.getElementById("udemyplus-speed-decrease");
    const increaseBtn = document.getElementById("udemyplus-speed-increase");
    const speedValueBtn = document.getElementById("udemyplus-speed");
    if (!speedWrapper) return;
    if (!decreaseBtn || !increaseBtn || !speedValueBtn) return;
    const getCurrentVideo = () => document.querySelector("video") || video;
    const applyPreferredSpeed = () => {
      const currentVideo = getCurrentVideo();
      if (!currentVideo) return;
      const preferred = videoStateService.getPreferredPlaybackRate();
      currentVideo.playbackRate = preferred;
      updateSpeedLabel(currentVideo.playbackRate);
    };
    const applyCurrentRate = (rate) => {
      const currentVideo = getCurrentVideo();
      if (!currentVideo) return;
      currentVideo.playbackRate = rate;
      updateSpeedLabel(currentVideo.playbackRate);
    };
    applyPreferredSpeed();
    if (!speedBoundVideos.has(video)) {
      speedBoundVideos.add(video);
      video.addEventListener("loadedmetadata", applyPreferredSpeed);
      video.addEventListener("play", () => setTimeout(applyPreferredSpeed, 60));
      video.addEventListener("playing", () => setTimeout(applyPreferredSpeed, 60));
    }
    speedWrapper.addEventListener("wheel", (e) => {
      e.preventDefault();
      const currentVideo = getCurrentVideo();
      if (!currentVideo) return;
      const increment = 0.1;
      const nextRate = currentVideo.playbackRate + (e.deltaY < 0 ? increment : -increment);
      videoStateService.setPreferredPlaybackRate(nextRate);
      applyCurrentRate(videoStateService.getPreferredPlaybackRate());
    });
    decreaseBtn.addEventListener("click", () => {
      const currentVideo = getCurrentVideo();
      if (!currentVideo) return;
      videoStateService.setPreferredPlaybackRate(currentVideo.playbackRate - 0.1);
      applyCurrentRate(videoStateService.getPreferredPlaybackRate());
    });
    increaseBtn.addEventListener("click", () => {
      const currentVideo = getCurrentVideo();
      if (!currentVideo) return;
      videoStateService.setPreferredPlaybackRate(currentVideo.playbackRate + 0.1);
      applyCurrentRate(videoStateService.getPreferredPlaybackRate());
    });
    speedValueBtn.addEventListener("click", () => {
      videoStateService.setPreferredPlaybackRate(1);
      applyCurrentRate(videoStateService.getPreferredPlaybackRate());
    });
  }

  // scripts/course-page/features/video/pipControl.js
  function syncPipUi(enabled) {
    const pipBtn = document.getElementById("udemyplus-pip");
    const pipTooltip = document.querySelector("#udemyplus-pip-wrapper .udemyplus-tooltip");
    pipBtn?.classList.toggle("text-success", enabled);
    if (pipTooltip) pipTooltip.textContent = `Picture in Picture (${enabled ? "ON" : "OFF"})`;
  }
  async function applyPipState(video) {
    const currentVideo = document.querySelector("video") || video;
    if (!currentVideo) return;
    const enabled = videoStateService.getPipEnabled();
    syncPipUi(enabled);
    if (!document.pictureInPictureEnabled) return;
    try {
      if (!enabled && document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return;
      }
      if (enabled) {
        if (document.pictureInPictureElement && document.pictureInPictureElement !== currentVideo) {
          await document.exitPictureInPicture();
        }
        if (document.pictureInPictureElement !== currentVideo) {
          await currentVideo.requestPictureInPicture();
        }
      }
    } catch {
    }
  }
  function setupPipControl(video) {
    const pipBtn = document.getElementById("udemyplus-pip");
    if (!pipBtn) return;
    void applyPipState(video);
    if (video.dataset.uplusPipBound !== "true") {
      video.dataset.uplusPipBound = "true";
      video.addEventListener("enterpictureinpicture", () => {
        videoStateService.setPipEnabled(true);
        syncPipUi(true);
      });
      video.addEventListener("leavepictureinpicture", () => {
        videoStateService.setPipEnabled(false);
        syncPipUi(false);
      });
    }
    pipBtn.onclick = async () => {
      const next = !videoStateService.getPipEnabled();
      videoStateService.setPipEnabled(next);
      await applyPipState(video);
      syncPipUi(videoStateService.getPipEnabled());
    };
  }

  // scripts/course-page/features/video/volumeBoost.js
  var audioContext = null;
  var gainByVideo = /* @__PURE__ */ new WeakMap();
  function ensureGainNode(video) {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (gainByVideo.has(video)) return gainByVideo.get(video);
    const source = audioContext.createMediaElementSource(video);
    const gainNode = audioContext.createGain();
    source.connect(gainNode).connect(audioContext.destination);
    gainByVideo.set(video, gainNode);
    return gainNode;
  }
  function syncVolumeUi(enabled) {
    const volumeIcon = document.getElementById("udemyplus-volume");
    const volumeTooltip = document.querySelector("#udemyplus-volume-wrapper .udemyplus-tooltip");
    if (volumeTooltip) volumeTooltip.textContent = `Boost Volume (${enabled ? "ON" : "OFF"})`;
    volumeIcon?.classList.toggle("text-success", enabled);
  }
  function applyBoostState(video) {
    const currentVideo = document.querySelector("video") || video;
    if (!currentVideo) return;
    const enabled = videoStateService.getVolumeBoostEnabled();
    syncVolumeUi(enabled);
    if (!enabled && !gainByVideo.has(currentVideo)) return;
    try {
      const gainNode = ensureGainNode(currentVideo);
      gainNode.gain.value = enabled ? 7 : 1;
    } catch (error) {
      console.warn("Could not apply volume boost state:", error);
    }
  }
  function setupVolumeBoost(video) {
    const volumeIcon = document.getElementById("udemyplus-volume");
    if (!volumeIcon) return;
    applyBoostState(video);
    volumeIcon.addEventListener("click", () => {
      const next = !videoStateService.getVolumeBoostEnabled();
      videoStateService.setVolumeBoostEnabled(next);
      applyBoostState(video);
    });
  }

  // scripts/course-page/features/video/autoSkip.js
  var skipObserver = null;
  var boundButton = null;
  function findNextLessonButton() {
    const currentItem = document.querySelector("li.curriculum-item-link--is-current--2mKk4") || document.querySelector('li[aria-current="true"]');
    if (!currentItem) return null;
    let next = currentItem.nextElementSibling;
    while (next) {
      const clickable = next.querySelector('a[href*="/learn/lecture/"]') || next.querySelector('button[data-purpose="lecture-item-link"]') || next.querySelector("button");
      if (clickable) return clickable;
      next = next.nextElementSibling;
    }
    return null;
  }
  function ensureSkipObserver() {
    if (skipObserver) return;
    skipObserver = new MutationObserver(() => {
      const popup = document.querySelector(".interstitial--container--4wumM");
      if (!popup || !videoStateService.getAutoSkipEnabled()) return;
      popup.style.display = "none";
      const nextLesson = findNextLessonButton();
      if (nextLesson) {
        nextLesson.click();
      }
    });
  }
  function setupAutoSkip(video) {
    void video;
    const autoSkipBtn = document.getElementById("udemyplus-disable-next");
    if (!autoSkipBtn || autoSkipBtn === boundButton) return;
    boundButton = autoSkipBtn;
    const syncUiAndObserver = () => {
      const enabled = videoStateService.getAutoSkipEnabled();
      autoSkipBtn.classList.toggle("text-success", enabled);
      const tooltip = autoSkipBtn.nextElementSibling;
      if (tooltip) tooltip.textContent = `Auto Skip Delay (${enabled ? "ON" : "OFF"})`;
      if (enabled) {
        ensureSkipObserver();
        skipObserver.observe(document.body, { childList: true, subtree: true });
      } else if (skipObserver) {
        skipObserver.disconnect();
      }
    };
    autoSkipBtn.addEventListener("click", () => {
      const newState = !videoStateService.getAutoSkipEnabled();
      if (newState && videoStateService.getLoopEnabled()) {
        videoStateService.disableLoop();
      }
      videoStateService.setAutoSkipEnabled(newState);
      syncUiAndObserver();
    });
    syncUiAndObserver();
  }

  // scripts/course-page/features/video/looping.js
  var loopObserverStarted = false;
  var boundLoopIcon = null;
  function setupLooping(video) {
    void video;
    const loopIcon = document.getElementById("udemyplus-loop");
    const loopTooltip = document.querySelector("#udemyplus-loop-wrapper .udemyplus-tooltip");
    if (!loopIcon || !loopTooltip || loopIcon === boundLoopIcon) return;
    boundLoopIcon = loopIcon;
    const syncLoopUi = () => {
      const enabled = videoStateService.getLoopEnabled();
      loopTooltip.textContent = `Loop Video (${enabled ? "ON" : "OFF"})`;
      loopIcon.classList.toggle("text-success", enabled);
    };
    loopIcon.addEventListener("click", () => {
      const newState = !videoStateService.getLoopEnabled();
      if (newState && videoStateService.getAutoSkipEnabled()) {
        videoStateService.disableAutoSkip();
      }
      videoStateService.setLoopEnabled(newState);
      syncLoopUi();
    });
    syncLoopUi();
    if (loopObserverStarted) return;
    loopObserverStarted = true;
    const loopObserver = new MutationObserver(() => {
      const popup = document.querySelector(".interstitial--container--4wumM");
      if (popup && videoStateService.getLoopEnabled()) {
        const cancelBtn = popup.querySelector('button[data-purpose="cancel-button"]');
        if (cancelBtn) {
          cancelBtn.click();
          const currentVideo = document.querySelector("video");
          if (currentVideo) {
            currentVideo.currentTime = 0;
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
  function getOverlay() {
    return document.querySelector(".udemyplus-focus-overlay");
  }
  function syncFocusUi(enabled) {
    const focusIcon = document.getElementById("udemyplus-focus");
    const focusTooltip = document.querySelector("#udemyplus-focus-wrapper .udemyplus-tooltip");
    if (focusTooltip) focusTooltip.textContent = `Focus Mode (${enabled ? "ON" : "OFF"})`;
    focusIcon?.classList.toggle("text-success", enabled);
  }
  function applyFocusState(video, enabled) {
    const currentVideo = document.querySelector("video") || video;
    const videoParent = currentVideo?.parentElement?.parentElement?.parentElement;
    const panel = document.getElementById("udemy-plus-panel");
    const videoControls = document.querySelector("#udemyplus-video-controls");
    const markAllBtn = document.getElementById("complete-all");
    const resetAllBtn = document.getElementById("reset-all");
    let overlay = getOverlay();
    if (enabled) {
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "udemyplus-focus-overlay";
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.style.opacity = "1");
      } else {
        overlay.style.opacity = "1";
      }
      if (videoParent) videoParent.classList.add("udemyplus-focus-clear");
      if (panel) panel.classList.add("udemyplus-fade-out");
      if (videoControls) videoControls.classList.add("udemyplus-fade-out");
      if (markAllBtn) markAllBtn.style.display = "none";
      if (resetAllBtn) resetAllBtn.style.display = "none";
    } else {
      if (overlay) {
        overlay.style.opacity = "0";
        setTimeout(() => {
          const currentOverlay = getOverlay();
          if (currentOverlay) currentOverlay.remove();
        }, 400);
      }
      if (videoParent) videoParent.classList.remove("udemyplus-focus-clear");
      if (panel) panel.classList.remove("udemyplus-fade-out");
      if (videoControls) videoControls.classList.remove("udemyplus-fade-out");
      if (markAllBtn) markAllBtn.style.display = "";
      if (resetAllBtn) resetAllBtn.style.display = "";
    }
    syncFocusUi(enabled);
  }
  function setupFocusMode(video) {
    const focusIcon = document.getElementById("udemyplus-focus");
    if (!focusIcon) return;
    applyFocusState(video, videoStateService.getFocusModeEnabled());
    if (focusIcon.dataset.uplusBound === "true") return;
    focusIcon.dataset.uplusBound = "true";
    focusIcon.addEventListener("click", () => {
      const next = !videoStateService.getFocusModeEnabled();
      videoStateService.setFocusModeEnabled(next);
      applyFocusState(video, next);
    });
  }

  // scripts/course-page/ui/injectControlsUI.js
  function getDirectChild(container, node) {
    let current = node;
    while (current && current.parentElement !== container) {
      current = current.parentElement;
    }
    return current;
  }
  function initVideoControls({ forceRecreate = false } = {}) {
    const nativeControlsBar = document.querySelector('[data-purpose="video-controls"]');
    const controls = document.querySelector("#udemyplus-video-controls");
    if (!nativeControlsBar) return;
    if (controls && forceRecreate) {
      controls.remove();
    } else if (controls) {
      return;
    }
    const volumeBtn = nativeControlsBar.querySelector('[data-purpose="volume-control-button"]');
    const volumeBlock = getDirectChild(nativeControlsBar, volumeBtn);
    createControlsUI(nativeControlsBar, { beforeNode: volumeBlock });
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
  function getLessonKey2(checkbox, index) {
    const li = checkbox.closest("li");
    if (!li) return `idx:${index}`;
    const lectureAnchor = li.querySelector('a[href*="/learn/lecture/"]');
    const href = lectureAnchor?.getAttribute("href") || "";
    const match = href.match(/\/learn\/lecture\/(\d+)/);
    if (match?.[1]) return `lecture:${match[1]}`;
    const dataPurpose = li.getAttribute("data-purpose") || "";
    if (dataPurpose) return `purpose:${dataPurpose}:${index}`;
    return `idx:${index}`;
  }
  function snapshotCheckboxStates() {
    const checkboxes = Array.from(
      document.querySelectorAll('input[type="checkbox"][data-purpose="progress-toggle-button"]')
    );
    const map = /* @__PURE__ */ new Map();
    checkboxes.forEach((checkbox, index) => {
      map.set(getLessonKey2(checkbox, index), Boolean(checkbox.checked));
    });
    return map;
  }
  function syncIncrementalStatsFromChanges(previousMap) {
    if (!previousMap || previousMap.size === 0) return false;
    const checkboxes = Array.from(
      document.querySelectorAll('input[type="checkbox"][data-purpose="progress-toggle-button"]')
    );
    let hasChanges = false;
    checkboxes.forEach((checkbox, index) => {
      const key = getLessonKey2(checkbox, index);
      if (!previousMap.has(key)) return;
      const previousChecked = previousMap.get(key);
      const currentChecked = Boolean(checkbox.checked);
      if (previousChecked === currentChecked) return;
      hasChanges = true;
      updatePanelStatsFromToggle(checkbox);
    });
    return hasChanges;
  }
  function observeVideoContainer() {
    const getLectureId = () => {
      const match = location.pathname.match(/\/learn\/lecture\/(\d+)/);
      return match?.[1] || null;
    };
    let lastLectureId = getLectureId();
    let lastPathname = location.pathname;
    let lectureChangeTimer = null;
    let checkboxSnapshot = snapshotCheckboxStates();
    const handleLectureChange = () => {
      if (lectureChangeTimer) clearTimeout(lectureChangeTimer);
      lectureChangeTimer = window.setTimeout(() => {
        const previousSnapshot = checkboxSnapshot;
        initVideoControls({ forceRecreate: true });
        syncIncrementalStatsFromChanges(previousSnapshot);
        checkboxSnapshot = snapshotCheckboxStates();
      }, 350);
    };
    const observer = new MutationObserver(() => {
      initVideoControls();
      const currentLectureId = getLectureId();
      const currentPathname = location.pathname;
      const routeChanged = currentPathname !== lastPathname;
      const lectureChanged = routeChanged && currentLectureId && currentLectureId !== lastLectureId;
      if (lectureChanged) {
        lastPathname = currentPathname;
        lastLectureId = currentLectureId;
        handleLectureChange();
      } else {
        lastPathname = currentPathname;
        lastLectureId = currentLectureId || lastLectureId;
        checkboxSnapshot = snapshotCheckboxStates();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setInterval(() => {
      const currentLectureId = getLectureId();
      const currentPathname = location.pathname;
      if (currentPathname === lastPathname) return;
      const lectureChanged = currentLectureId && currentLectureId !== lastLectureId;
      lastPathname = currentPathname;
      lastLectureId = currentLectureId || lastLectureId;
      if (lectureChanged) {
        handleLectureChange();
      }
    }, 500);
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
    const nextRate = video.playbackRate + step;
    videoStateService.setPreferredPlaybackRate(nextRate);
    video.playbackRate = videoStateService.getPreferredPlaybackRate();
    const speedValue = document.getElementById("udemyplus-speed");
    if (speedValue) {
      speedValue.textContent = `${video.playbackRate.toFixed(2)}x`;
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
    initVideoStatePersistence();
    initStatsPanel();
    observeVideoContainer();
    initKeyboardShortcuts();
  }
  boot();
})();
