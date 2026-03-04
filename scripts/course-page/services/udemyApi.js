function getImageFromMetaTags() {
  const selectors = [
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
    'meta[property="twitter:image"]'
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    const content = el?.getAttribute('content');
    if (content) return content;
  }

  return null;
}

export function getCourseIdFromDOM() {
  const appEl = document.querySelector('[data-module-args*="courseId"]');
  if (!appEl) return null;

  try {
    const json = JSON.parse(appEl.getAttribute('data-module-args').replace(/&quot;/g, '"'));
    return json.courseId;
  } catch (e) {
    console.warn('Could not extract courseId from DOM:', e);
    return null;
  }
}

export async function fetchCourseImage(courseId) {
  const metaImage = getImageFromMetaTags();

  if (!courseId) {
    return metaImage;
  }

  try {
    const response = await fetch(
      `https://www.udemy.com/api-2.0/courses/${courseId}/?fields[course]=image_240x135,image_480x270`,
      {
        credentials: 'include',
        headers: {
          accept: 'application/json, text/plain, */*'
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