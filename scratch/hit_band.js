const { spawn } = require('child_process');
const http = require('http');

const PORT = 9440;
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

    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(500);

    // Click Open
    await send('Runtime.evaluate', { expression: `document.getElementById('btn-toggle-open').click()` });
    await sleep(3500);

    // Apply rotateX -180 and card z -300
    await send('Runtime.evaluate', {
      expression: `
        gsap.set('#envelope-flap', { rotateX: -180 });
        gsap.set('#inner-card', { z: -300 });
      `
    });
    await sleep(200);

    const hit = await send('Runtime.evaluate', {
      expression: `(() => {
        // Point in the grey band
        const x = 52;
        const y = 430;
        const els = document.elementsFromPoint(x, y);
        return {
          point: { x, y },
          els: els.map(e => ({
            tag: e.tagName,
            id: e.id,
            class: e.className,
            rect: e.getBoundingClientRect()
          }))
        };
      })()`,
      returnByValue: true
    });
    console.log('BAND HIT:', JSON.stringify(hit.result.value, null, 2));
  } finally {
    edge.kill();
  }
})();
