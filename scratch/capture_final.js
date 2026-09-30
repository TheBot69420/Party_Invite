const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const PORT = 9500;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = ''; res.on('data', c => data += c); res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

(async () => {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--remote-debugging-port=' + PORT,
    '--disable-gpu',
    '--window-size=1280,900',
    'http://localhost:3000'
  ]);
  try {
    await sleep(2000);
    const pages = await getJson('http://127.0.0.1:' + PORT + '/json/list');
    const target = pages.find(p => p.url && p.url.includes('localhost:3000'));
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    let id = 1;
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const curId = id++;
        const handler = (ev) => {
          const msg = JSON.parse(ev.data);
          if (msg.id === curId) {
            ws.removeEventListener('message', handler);
            resolve(msg.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: curId, method, params }));
      });
    }
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Input.enable');
    await sleep(500);

    const artifactDir = 'C:\\Users\\TheBot69\\.gemini\\antigravity\\brain\\01389b15-e1df-4b69-9d38-9e3d72f01fc4';

    // 1. Desktop Test: Open envelope and hover mouse over Lord Ganesha / Card
    await send('Runtime.evaluate', { expression: `document.getElementById('btn-toggle-open').click()` });
    await sleep(3500);

    // Hover mouse directly over Lord Ganesha
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: 640,
      y: 200
    });
    await sleep(400);

    let shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/clean_open_desktop_hover.png`, Buffer.from(shot.data, 'base64'));

    // 2. Mobile Native Load:
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await send('Page.navigate', { url: 'http://localhost:3000' });
    await sleep(1500);

    // Open on Mobile
    await send('Runtime.evaluate', { expression: `document.getElementById('btn-toggle-open').click()` });
    await sleep(3500);

    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/clean_open_mobile.png`, Buffer.from(shot.data, 'base64'));

    console.log('Saved clean_open_desktop_hover.png and clean_open_mobile.png');
  } finally {
    edge.kill();
  }
})();
