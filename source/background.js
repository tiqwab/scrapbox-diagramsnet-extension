import browser from 'webextension-polyfill';
import {fetchGyazoImage, uploadImageToGyazo} from './api.js';
import {base64ToBlob, blobToBase64} from './util.js';

browser.runtime.onMessage.addListener((message, _sender) => {
	switch (message.type) {
		case 'loadImage': {
			return fetchGyazoImage(message.url)
				.then(blob => blobToBase64(blob))
				.then(encoded => ({
					data: encoded,
				}));
		}

		case 'uploadImage': {
			const blob = base64ToBlob(message.data, 'image/png');
			return uploadImageToGyazo(blob, message.refererUrl, message.title)
				.then(url => ({
					permalinkUrl: url,
				}));
		}

		default: {
			return Promise.reject(new Error(`Unknown event: ${JSON.stringify(message)}`));
		}
	}
});
