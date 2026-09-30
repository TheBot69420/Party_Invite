const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const PORT = 9276;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
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
    await sleep(1000);

    // Open envelope
    await send('Runtime.evaluate', { expression: `document.getElementById('btn-toggle-open').click()` });
    await sleep(3500);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/current_open_state.png', Buffer.from(shot.data, 'base64'));

    const flapInfo = await send('Runtime.evaluate', {
      expression: `(() => {
        const flap = document.getElementById('envelope-flap');
        const front = flap.querySelector('.flap-front');
        const back = flap.querySelector('.flap-back');
        const fRect = front.getBoundingClientRect();
        const bRect = back.getBoundingClientRect();
        return {
          frontRect: { top: fRect.top, bottom: fRect.bottom, left: fRect.left, right: fRect.right, width: fRect.width, height: fRect.height },
          backRect: { top: bRect.top, bottom: bRect.bottom, left: bRect.left, right: bRect.right, width: bRect.width, height: bRect.height },
          frontClip: window.getComputedStyle(front.querySelector('.flap-cut-container')).clipPath,
          backClip: window.getComputedStyle(back).clipPath,
          backBg: window.getComputedStyle(back).background,
          backTransform: window.getComputedStyle(back).transform,
          flapTransform: window.getComputedStyle(flap).transform,
          backFaceVisFront: window.getComputedStyle(front).backfaceVisibility,
          backFaceVisBack: window.getComputedStyle(back).backfaceVisibility
        };
      })()`,
      returnByValue: true
    });
    console.log('FLAP DETAIL:', JSON.stringify(flapInfo.result.value, null, 2));
  } finally {
    edge.kill();
  }
})();
