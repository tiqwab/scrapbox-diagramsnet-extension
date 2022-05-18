async function get(url) {
	const result = await fetch(url, {mode: 'cors'});
	if (!result.ok) {
		const content = await result.text();
		throw new Error(`Error occurred in GET ${url}: ${content}`);
	}

	return result;
}

async function getAsJson(url) {
	const result = await get(url);
	return result.json();
}

async function getAsBlob(url) {
	const result = await get(url);
	return result.blob();
}

async function post(url, body, options) {
	const result = await fetch(url, {
		method: 'POST',
		body,
		mode: 'cors',
		...options,
	});
	if (!result.ok) {
		const content = await result.text();
		throw new Error(`Error occurred in GET ${url}: ${content}`);
	}

	return result;
}

// Get OAuth token of Gyazo
async function fetchGyazoToken() {
	const data = await getAsJson('https://scrapbox.io/api/login/gyazo/oauth-upload/token');
	return data.token;
}

// Get an image from Gyazo url as Blob.
async function fetchGyazoImage(url) {
	return getAsBlob(url);
}

// Upload an image to Gyazo.
// ref. https://gyazo.com/api/docs/image#upload
// data: Blob data of png
// refererUrl: Page URL where the image is used
// title: Page title where the image is used
async function uploadImageToGyazo(data, refererUrl, title) {
	const gyazoToken = await fetchGyazoToken();

	const formData = new FormData();
	formData.append('access_token', gyazoToken);
	formData.append('imagedata', data, 'blob');
	formData.append('referer_url', refererUrl);
	formData.append('title', title);

	const result = await post('https://upload.gyazo.com/api/upload', formData, {});
	const {permalink_url: permalinkUrl} = await result.json();
	return permalinkUrl;
}

export {fetchGyazoImage, uploadImageToGyazo};
