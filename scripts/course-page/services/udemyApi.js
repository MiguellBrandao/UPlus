export function getCourseIdFromDOM() {
	const appEl = document.querySelector('[data-module-args*="courseId"]');
	if (!appEl) return null;

	try {
		const json = JSON.parse(appEl.getAttribute('data-module-args').replace(/&quot;/g, '"'));
		return json.courseId;
	} catch (e) {
		console.warn('❌ Erro ao extrair courseId:', e);
		return null;
	}
}

export async function fetchCourseImage(courseId) {
	try {
		const response = await fetch(`https://www.udemy.com/api-2.0/courses/${courseId}`);
		if (!response.ok) throw new Error('Falha na API');

		const data = await response.json();
		return data.image_240x135;
	} catch (e) {
		console.warn('❌ Erro ao buscar imagem do curso:', e);
		return null;
	}
}
