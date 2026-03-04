const HISTORY_KEY = 'uplus_course_history';
const MAX_ITEMS = 20;

function getCourseSlug() {
  const match = location.pathname.match(/^\/course\/([^/]+)/);
  return match?.[1] || null;
}

function getCourseTitle() {
  const titleEl =
    document.querySelector('a.header--header-link--X0YLd') ||
    document.querySelector('[data-purpose="course-header-title"]') ||
    document.querySelector('h1[data-purpose="course-header-title"]');

  return titleEl?.textContent?.trim() || 'Udemy Course';
}

function isContextInvalidated(error) {
  const message = String(error?.message || error || '');
  return message.includes('Extension context invalidated');
}

export async function saveCurrentCourseToHistory() {
  const slug = getCourseSlug();
  if (!slug) return;
  if (!chrome?.runtime?.id) return;

  const courseUrl = `https://www.udemy.com/course/${slug}/`;
  const title = getCourseTitle();
  const visitedAt = Date.now();

  try {
    const result = await chrome.storage.local.get(HISTORY_KEY);
    const current = Array.isArray(result[HISTORY_KEY]) ? result[HISTORY_KEY] : [];
    const deduped = current.filter(item => item?.url !== courseUrl);
    const next = [{ url: courseUrl, title, visitedAt }, ...deduped].slice(0, MAX_ITEMS);
    await chrome.storage.local.set({ [HISTORY_KEY]: next });
  } catch (error) {
    if (isContextInvalidated(error)) return;
    console.warn('Failed to save course history:', error);
  }
}
