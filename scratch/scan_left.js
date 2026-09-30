const { spawn } = require('child_process');
const http = require('http');

const PORT = 9350;
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

    // Inspect elements at left cutouts:
    // in test_mobile_flap_180.png:
    // viewport is 390x844.
    // Left side of the card is around x = 50..80, y = 250..550
    const scanLeft = await send('Runtime.evaluate', {
      expression: `(() => {
        const points = [
          { x: 80, y: 280 },
          { x: 75, y: 450 },
          { x: 80, y: 520 },
          { x: 195, y: 400 } // center of card
        ];
        return points.map(p => {
          const els = document.elementsFromPoint(p.x, p.y);
          return {
            point: p,
            topEl: els[0] ? (els[0].id || els[0].className || els[0].tagName) : null,
            chain: els.map(e => (e.id ? '#' + e.id : '') + (e.className ? '.' + e.className.split(' ').join('.') : e.tagName))
          };
        });
      })()`,
      returnByValue: true
    });
    console.log('LEFT SCAN:', JSON.stringify(scanLeft.result.value, null, 2));
  } finally {
    edge.kill();
  }
})();
