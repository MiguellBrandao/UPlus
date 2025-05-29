export function setupPipControl(video) {
	document.getElementById('udemyplus-pip').addEventListener('click', () => {
		if (document.pictureInPictureElement) document.exitPictureInPicture();
		else video.requestPictureInPicture().catch(console.error);
	});
}
