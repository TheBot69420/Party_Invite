const { spawn } = require('child_process');
const http = require('http');

const PORT = 9330;
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

    // Click Open
    await send('Runtime.evaluate', { expression: `document.getElementById('btn-toggle-open').click()` });
    await sleep(3500);

    const scan = await send('Runtime.evaluate', {
      expression: `(() => {
        const card = document.getElementById('inner-card');
        const cRect = card.getBoundingClientRect();
        const centerX = cRect.left + cRect.width / 2;
        const results = [];
        for (let y = cRect.top - 50; y <= cRect.bottom + 20; y += 25) {
          const els = document.elementsFromPoint(centerX, y);
          results.push({
            y: Math.round(y),
            topEl: els[0] ? (els[0].id || els[0].className || els[0].tagName) : null,
            allEls: els.map(e => e.id || e.className || e.tagName)
          });
        }
        return {
          cardRect: cRect,
          scan: results
        };
      })()`,
      returnByValue: true
    });
    console.log('SCAN RESULTS:', JSON.stringify(scan.result.value, null, 2));
  } finally {
    edge.kill();
  }
})();
