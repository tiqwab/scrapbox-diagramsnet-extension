// Open embeded draw.io and edit diagram, then export Base64-encoded data as png.
// callback: function which accepts exported data
// data: PNG data URI with base64 encoding ('data:image/png;base64,...')
// ref. https://github.com/jgraph/drawio-github/blob/master/edit-diagram.html
// ref. https://desk.draw.io/support/solutions/articles/16000042544-how-does-embed-mode-work-
// ref. https://github.com/weseek/growi/pull/1685
async function drawImage(callback, data) {

    let editor = 'https://embed.diagrams.net/?embed=1&ui=atlas&spin=1&proto=json';

    let iframe = document.createElement('iframe');

    let close = async function() {
        window.removeEventListener('message', receive);
        document.body.removeChild(iframe);
    }

    let save = async function(data) {
        iframe.contentWindow.postMessage(JSON.stringify({
            action: 'spinner',
            message: 'Saving',
            show: 1
        }), 'https://embed.diagrams.net');

        await callback(data, async (success) => {
            iframe.contentWindow.postMessage(JSON.stringify({
                action: 'spinner',
                show: 0
            }), 'https://embed.diagrams.net');

            if (success) {
                await close();
            }
        }, iframe);
    }

    let receive = async function(evt) {
        let msg = JSON.parse(evt.data);

        if (msg.event == 'init') {
            iframe.contentWindow.postMessage(JSON.stringify({
                action: 'load',
                autosave: 0,
                xml: data || ''
            }), 'https://embed.diagrams.net');
        } else if (msg.event == 'export') {
            await save(msg.data);
        } else if (msg.event == 'save') {
            iframe.contentWindow.postMessage(JSON.stringify({
                spin: 'Saving',
                action: 'export',
                format: 'xmlpng',
                xml: msg.xml
            }), 'https://embed.diagrams.net');
        } else if (msg.event == 'load') {
            // do nothing for now
        } else if (msg.event == 'exit') {
            await close();
        } else {
            console.error(`Unknown event: ${JSON.stringify(msg)}`);
        }
    }

    window.addEventListener('message', receive);

    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('style', 'border: 0; background-color: #fff; position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; z-index: 1001');
    iframe.setAttribute('src', editor);

    document.body.appendChild(iframe);
}

// Insert text at the current position of document.
// ref. https://scrapbox.io/customize/scrapbox-insert-text
function insertText(text) {
    const cursor = document.getElementById('text-input');
    cursor.focus();
    const start = cursor.selectionStart; // in this case maybe 0
    cursor.setRangeText(text);
    cursor.selectionStart = cursor.selectionEnd = start + text.length;
    const ev = new InputEvent("input", {bubbles: true, cancelable: false});
    cursor.dispatchEvent(ev);
}

// Move cursor to the end of the specified line
// ref. https://scrapbox.io/takker/scrapbox-cursor-jumper
function moveCursorTo(lineId) {
    const line = document.getElementById(lineId).getElementsByClassName(`text`)[0];
    line.scrollTo();
    const {right, top, height} = line.getBoundingClientRect();
    
    const mouseOptions = {
      button: 0,
      clientX: right,
      clientY: top + height / 2,
      bubbles: true,
      cancelable: true,
      view: window
    };

    line.dispatchEvent(new MouseEvent("mousedown", mouseOptions));
    line.dispatchEvent(new MouseEvent("mouseup", mouseOptions));
}

async function fetchGyazoToken() {
    const res = await fetch('https://scrapbox.io/api/login/gyazo/oauth-upload/token');
    // FIXME: error handling
    const data = await res.json();
    return data.token;
}

// Upload an image to Gyazo.
// ref. https://gyazo.com/api/docs/image#upload
// data: Blob data of png
async function uploadImage(data) {
    // FIXME: reuse OAuth token?
    const gyazoToken = await fetchGyazoToken();

    // FIXME: title is necessary?
    const formData = new FormData();
    formData.append('access_token', gyazoToken);
    formData.append('imagedata', data, 'test.png');
    formData.append('title', 'test');

    const res = await fetch("https://upload.gyazo.com/api/upload", {
        method: 'POST',
        body: formData,
        mode: 'cors'
    });
    // FIXME: error handling
    const { permalink_url } = await res.json();
    return permalink_url;
}

// Load an image from Gyazo url.
// Returns blob.
async function loadImage(urlStr) {
    let url = new URL(urlStr);
    const res = await fetch(url, {mode: 'cors'});
    // FIXME: error handling
    return await res.blob();
}

function base64ToBlob(data, mime) {
    let bin = atob(data);
    let buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
        buf[i] = bin.charCodeAt(i);
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

// data: string such as `data:image/png;base64,<base64_encoded>`
async function showImage(data, callback, iframe) {
    const startPos = data.indexOf(',') + 1;
    const imageBase64 = data.substring(startPos);
    const imageBlob = base64ToBlob(imageBase64, 'image/png');
    const imageUrl = await uploadImage(imageBlob);

    // this will add `deco-|` class
    insertText(`[| [${imageUrl}]]`);

    callback(true);
}

// Get all image links created by draw.io in document.
// Assume that such links have `deco-|` css class.
function getAllDrawioImageLinks() {
    let res = [];
    for (const node of document.getElementsByClassName('deco-|')) {
        const imageUrl = node.querySelector('img')?.getAttribute('src');
        if (imageUrl) {
            res.push(imageUrl);
        }
    }
    return res;
}

function generateMutationObserver() {
    const mo = new MutationObserver((mutationList, observer) => {
        // FIXME: it is possible that there are multiple img tags?
        let imageUrl = null;
        let modalNode = null;
        for (const mutation of mutationList) {
            for (const node of mutation.addedNodes) {
                imageUrl = node.querySelector('img')?.getAttribute('src');
                modalNode = node;
            }
        }

        if (imageUrl) {
            const drawioImageUrls = getAllDrawioImageLinks();
            if (drawioImageUrls.includes(imageUrl)) {
                const toolbar = modalNode.getElementsByClassName('toolbar')[0];
                const btn = document.createElement('button');
                btn.textContent = 'Edit on diagrams.net';
                btn.className = 'btn btn-primary draw-button';
                btn.type = 'draw';
                btn.style = 'margin-left: 1em';
                btn.addEventListener('click', async () => {
                    const imageBlob = await loadImage(imageUrl);
                    const imageBase64 = await blobToBase64(imageBlob);
                    await drawImage(showImage, imageBase64);
                });
                toolbar.appendChild(btn);
            }
        }
    });
    return mo;
}

let menus = document.getElementsByClassName('page-menu');
if (menus.length == 1) {
    // FIXME: add button after scrapbox rendering
    // FIXME: appearance of button
    // ref. https://qiita.com/beeeyan/items/0d04b1859943a9a1e92c
    let btn = document.createElement('button');
    btn.textContent = 'hello';
    btn.addEventListener('click', async () => { await drawImage(showImage, null); });

    // FIXME: avoid adding more than one button
    menus[0].appendChild(btn);
} else {
    console.error('Expected only one page-menu');
}

generateMutationObserver().observe(document.body, { childList: true });
