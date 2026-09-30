const { spawn } = require('child_process');
const http = require('http');

const PORT = 9355;
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

    // 1. Check Mobile
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(500);
    await send('Runtime.evaluate', { expression: `document.getElementById('btn-toggle-open').click()` });
    await sleep(3500);

    const mobileInfo = await send('Runtime.evaluate', {
      expression: `(() => {
        const card = document.getElementById('inner-card');
        const box = document.getElementById('envelope-box');
        const faceBack = document.getElementById('face-back');
        const flap = document.getElementById('envelope-flap');
        const env = document.getElementById('envelope');
        const scene = document.getElementById('scene-container');
        return {
          cardTransform: window.getComputedStyle(card).transform,
          boxTransform: window.getComputedStyle(box).transform,
          faceBackTransform: window.getComputedStyle(faceBack).transform,
          flapTransform: window.getComputedStyle(flap).transform,
          envTransform: window.getComputedStyle(env).transform,
          scenePerspective: window.getComputedStyle(scene).perspective,
          sceneTransformStyle: window.getComputedStyle(scene).transformStyle,
          envTransformStyle: window.getComputedStyle(env).transformStyle,
          boxTransformStyle: window.getComputedStyle(box).transformStyle,
          faceBackTransformStyle: window.getComputedStyle(faceBack).transformStyle,
          cardZIndex: window.getComputedStyle(card).zIndex,
          faceBackZIndex: window.getComputedStyle(faceBack).zIndex,
          pocketZIndex: window.getComputedStyle(document.querySelector('.envelope-pocket-wrap')).zIndex
        };
      })()`,
      returnByValue: true
    });
    console.log('MOBILE INFO:', JSON.stringify(mobileInfo.result ? mobileInfo.result.value : mobileInfo, null, 2));
  } finally {
    edge.kill();
  }
})();
