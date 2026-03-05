import {
  expandAllSectionsWithState,
  restoreSectionState,
  focusTopPreviouslyOpenSection
} from '../utils/domHelpers.js';
import { getSettingsSync } from './settingsStore.js';

const CACHE_PREFIX = 'udemyPlusCourseStats::';
const DEFAULT_CACHE_TTL_HOURS = 1;
const MIN_CACHE_TTL_HOURS = 1;
const MAX_CACHE_TTL_HOURS = 24;

function parseDurationToMinutes(text) {
  if (!text) return null;

  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
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
  const spans = li.querySelectorAll('span');
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
    document.querySelectorAll('li.curriculum-item-link--curriculum-item--OVP5S')
  );

  let totalLessons = 0;
  let completedLessons = 0;
  let totalMinutes = 0;
  let completedMinutes = 0;

  lessons.forEach(li => {
    const minutes = getLessonMinutes(li);
    if (minutes === null) return;

    totalLessons += 1;
    totalMinutes += minutes;

    if (isCompleted(li)) {
      completedLessons += 1;
      completedMinutes += minutes;
    }
  });

  const progressPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

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
  return match?.[1] || 'unknown-course';
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
    // Ignore storage failures.
  }
}

function getCacheTtlHoursValue() {
  const settings = getSettingsSync();
  const raw = Number(settings.statsCacheTtlHours);
  if (!Number.isFinite(raw)) return DEFAULT_CACHE_TTL_HOURS;
  return Math.min(MAX_CACHE_TTL_HOURS, Math.max(MIN_CACHE_TTL_HOURS, raw));
}

function getCacheTtlMs() {
  return getCacheTtlHoursValue() * 60 * 60 * 1000;
}

function isCacheFresh(timestamp, ttlMs) {
  if (!timestamp) return false;
  return Date.now() - timestamp < ttlMs;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function updateStatsFromLessonToggle(checkboxEl) {
  if (!checkboxEl) return null;

  const lessonItem = checkboxEl.closest('li.curriculum-item-link--curriculum-item--OVP5S');
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
  const progressPercent =
    (cached.totalLessons || 0) > 0 ? Math.round((completedLessons / cached.totalLessons) * 100) : 0;

  const next = {
    ...cached,
    completedLessons,
    completedMinutes,
    progressPercent,
    timestamp: Date.now(),
    source: 'incremental'
  };

  setCachedStats(next);
  return { ...next, fromCache: false };
}

export async function getCourseStats({ forceRefresh = false, expandBeforeScrape = true } = {}) {
  const cached = getCachedStats();
  const ttlMs = getCacheTtlMs();

  if (!forceRefresh && cached && isCacheFresh(cached.timestamp, ttlMs)) {
    return { ...cached, source: 'cache', fromCache: true };
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
    source: 'live scrape'
  };

  setCachedStats(payload);
  return { ...payload, fromCache: false };
}

export function getCourseTitle() {
  const titleEl =
    document.querySelector('a.header--header-link--X0YLd') ||
    document.querySelector('[data-purpose="course-header-title"]') ||
    document.querySelector('h1[data-purpose="course-header-title"]');
  return titleEl ? titleEl.textContent.trim() : 'Course Title';
}

export function getCacheTtlHours() {
  return getCacheTtlHoursValue();
}
