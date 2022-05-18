import browser from 'webextension-polyfill';

async function fetchGyazoImage(url) {
	const result = await browser.runtime.sendMessage({
		type: 'loadImage',
		url,
	});
	return result.data;
}

async function uploadImageToGyazo(data, refererUrl, title) {
	const result = await browser.runtime.sendMessage({
		type: 'uploadImage',
		data,
		refererUrl,
		title,
	});
	return result.permalinkUrl;
}

export {fetchGyazoImage, uploadImageToGyazo};
