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

export function extractCourseStats() {
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

export function getCourseTitle() {
	const titleEl =
		document.querySelector('a.header--header-link--X0YLd') ||
		document.querySelector('[data-purpose="course-header-title"]') ||
		document.querySelector('h1[data-purpose="course-header-title"]');
	return titleEl ? titleEl.textContent.trim() : 'Course Title';
}
