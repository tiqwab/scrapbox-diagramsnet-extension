function base64ToBlob(data, mime) {
	const bin = atob(data);
	const buf = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) {
		buf[i] = bin.codePointAt(i);
	}

	return new Blob([buf.buffer], {type: mime});
}

function blobToBase64(blob) {
	return new Promise((resolve, _) => {
		const reader = new FileReader();
		reader.addEventListener('load', () => {
			resolve(reader.result);
		});
		reader.readAsDataURL(blob);
	});
}

export {base64ToBlob, blobToBase64};
