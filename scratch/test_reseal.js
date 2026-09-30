const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const PORT = 9662;
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
    '--window-size=390,844',
    'http://localhost:3000/'
  ]);

  try {
    await sleep(2000);
    const pages = await getJson('http://127.0.0.1:' + PORT + '/json/list');
    const target = pages.find(p => p.url && p.url.includes('3000'));
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

    await send('Runtime.enable');
    // Open
    await send('Runtime.evaluate', { expression: 'document.getElementById("wax-seal").click()' });
    await sleep(2200);
    // Close
    await send('Runtime.evaluate', { expression: 'document.getElementById("btn-close-lightbox").click()' });
    await sleep(1500);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/reseal_verified.png', Buffer.from(shot.data, 'base64'));
    console.log('Successfully resealed and captured scratch/reseal_verified.png');
    ws.close();
  } finally {
    edge.kill();
  }
})();
