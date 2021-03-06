import {fetchGyazoImage, uploadImageToGyazo} from './client.js';

// Open embeded draw.io and edit diagram, then export Base64-encoded data as png.
// callback: function which accepts exported data
// data: PNG data URI with base64 encoding ('data:image/png;base64,...')
// ref. https://github.com/jgraph/drawio-github/blob/master/edit-diagram.html
// ref. https://desk.draw.io/support/solutions/articles/16000042544-how-does-embed-mode-work-
// ref. https://github.com/weseek/growi/pull/1685
async function drawImage(callback, data) {
	const editor = 'https://embed.diagrams.net/?embed=1&ui=atlas&spin=1&proto=json';

	const iframe = document.createElement('iframe');

	const close = async function () {
		window.removeEventListener('message', receive);
		iframe.remove();
	};

	const save = async function (data) {
		iframe.contentWindow.postMessage(JSON.stringify({
			action: 'spinner',
			message: 'Saving',
			show: 1,
		}), 'https://embed.diagrams.net');

		await callback(data, async success => {
			iframe.contentWindow.postMessage(JSON.stringify({
				action: 'spinner',
				show: 0,
			}), 'https://embed.diagrams.net');

			if (success) {
				await close();
			}
		}, iframe);
	};

	const receive = async function (evt) {
		const message = JSON.parse(evt.data);

		switch (message.event) {
			case 'init': {
				iframe.contentWindow.postMessage(JSON.stringify({
					action: 'load',
					autosave: 0,
					xml: data || '',
				}), 'https://embed.diagrams.net');

				break;
			}

			case 'export': {
				await save(message.data);

				break;
			}

			case 'save': {
				iframe.contentWindow.postMessage(JSON.stringify({
					spin: 'Saving',
					action: 'export',
					format: 'xmlpng',
					xml: message.xml,
				}), 'https://embed.diagrams.net');

				break;
			}

			case 'load': {
			// Do nothing for now

				break;
			}

			case 'exit': {
				await close();

				break;
			}

			default: {
				console.error(`Unknown event: ${JSON.stringify(message)}`);
			}
		}
	};

	window.addEventListener('message', receive);

	iframe.setAttribute('frameborder', '0');
	iframe.setAttribute('style', 'border: 0; background-color: #fff; position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; z-index: 1001');
	iframe.setAttribute('src', editor);

	document.body.append(iframe);
}

// Insert text at the current position of document.
// ref. https://scrapbox.io/customize/scrapbox-insert-text
function insertText(text) {
	const cursor = document.querySelector('#text-input');
	cursor.focus();
	const start = cursor.selectionStart; // In this case maybe 0
	cursor.setRangeText(text);
	cursor.selectionStart = start + text.length;
	cursor.selectionEnd = start + text.length;
	const ev = new InputEvent('input', {bubbles: true, cancelable: false});
	cursor.dispatchEvent(ev);
}

// Move cursor to the end of the specified line
// ref. https://scrapbox.io/takker/scrapbox-cursor-jumper
function _moveCursorTo(lineId) {
	const line = document.getElementById(lineId).querySelectorAll('.text')[0];
	line.scrollTo();
	const {right, top, height} = line.getBoundingClientRect();

	const mouseOptions = {
		button: 0,
		clientX: right,
		clientY: top + (height / 2),
		bubbles: true,
		cancelable: true,
		view: window,
	};

	line.dispatchEvent(new MouseEvent('mousedown', mouseOptions));
	line.dispatchEvent(new MouseEvent('mouseup', mouseOptions));
}

// Data: string such as `data:image/png;base64,<base64_encoded>`
async function showImage(data, callback, _iframe) {
	try {
		const startPos = data.indexOf(',') + 1;
		const imageBase64 = data.slice(Math.max(0, startPos));
		const title = document.title;
		const refererUrl = document.URL;
		const imageUrl = await uploadImageToGyazo(imageBase64, refererUrl, title);

		// This will add `deco-|` class
		insertText(`[| [${imageUrl}]]`);

		callback(true);
	} catch (error) {
		console.error(`Error occurred in showImage: ${error}`);
		callback(false);
	}
}

// Get all image links created by draw.io in document.
// Assume that such links have `deco-|` css class.
function getAllDrawioImageLinks() {
	const result = [];
	for (const node of document.querySelectorAll('.deco\\-\\|')) {
		const imageUrl = node.querySelector('img')?.getAttribute('src');
		if (imageUrl) {
			result.push(imageUrl);
		}
	}

	return result;
}

function generateMutationObserverForEdit() {
	const mo = new MutationObserver((mutationList, _observer) => {
		let imageUrl = null;
		let modalNode = null;
		for (const mutation of mutationList) {
			for (const node of mutation.addedNodes) {
				// console.log(node.id, node.className);
				if (node.querySelectorAll('img').length > 0) {
					imageUrl = node.querySelectorAll('img')[0].getAttribute('src');
					modalNode = node;
				}
			}
		}

		if (imageUrl) {
			const drawioImageUrls = getAllDrawioImageLinks();
			if (drawioImageUrls.includes(imageUrl)) {
				const toolbar = modalNode.querySelectorAll('.toolbar')[0];
				const btn = document.createElement('button');
				btn.textContent = 'Edit on diagrams.net';
				btn.className = 'btn btn-primary draw-button';
				btn.type = 'draw';
				btn.style = 'margin-left: 1em';
				btn.addEventListener('click', async () => {
					const imageBase64 = await fetchGyazoImage(imageUrl);
					await drawImage(showImage, imageBase64);
				});
				toolbar.append(btn);
			}
		}
	});
	return mo;
}

function generateMutationObserverForCreate() {
	const mo = new MutationObserver((mutationList, _observer) => {
		// Append btn after it
		let randomJumpButton = null;
		for (const mutation of mutationList) {
			for (const node of mutation.addedNodes) {
				// console.log(node.id, node.className);
				if (node.className.includes('random-jump-button')) {
					randomJumpButton = node;
				}
			}
		}

		if (randomJumpButton) {
			const btnId = 'page-menu-create-diagrams';
			const btn = document.createElement('a');
			btn.id = btnId;
			btn.className = 'tool-btn';
			btn.setAttribute('type', 'button');
			btn.addEventListener('click', async () => {
				await drawImage(showImage, null);
			});

			const icon = document.createElement('i');
			icon.className = 'kamon kamon-spreadsheet';
			btn.append(icon);

			randomJumpButton.after(btn);
		}
	});
	return mo;
}

generateMutationObserverForCreate().observe(document.body, {childList: true, subtree: true});
generateMutationObserverForEdit().observe(document.body, {childList: true});
