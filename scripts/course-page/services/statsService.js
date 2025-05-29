export function extractCourseStats() {
	const sections = document.querySelectorAll('[data-purpose="section-duration"]');
	let totalLessons = 0;
	let completedLessons = 0;
	let totalMinutes = 0;
	let completedMinutes = 0;

	sections.forEach(section => {
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

	const progressPercent =
		totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

	return {
		totalLessons,
		completedLessons,
		totalMinutes: Math.round(totalMinutes),
		completedMinutes: Math.round(completedMinutes),
		progressPercent
	};
}

export function getCourseTitle() {
	const titleEl = document.querySelector('a.header--header-link--X0YLd');
	return titleEl ? titleEl.textContent.trim() : 'Course Title';
}
