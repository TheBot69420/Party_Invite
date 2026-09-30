const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const PORT = 9280;
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

    const hitTest = await send('Runtime.evaluate', {
      expression: `(() => {
        const points = [
          { x: 640, y: 50, label: "above card y=50" },
          { x: 640, y: 100, label: "top of card y=100" },
          { x: 640, y: 250, label: "upper middle card y=250" },
          { x: 640, y: 400, label: "center of card y=400" },
          { x: 300, y: 400, label: "left envelope wing x=300" },
          { x: 980, y: 400, label: "right envelope wing x=980" }
        ];
        return points.map(pt => {
          const el = document.elementFromPoint(pt.x, pt.y);
          return { label: pt.label, x: pt.x, y: pt.y, tag: el ? el.tagName : null, class: el ? el.className : null, id: el ? el.id : null };
        });
      })()`,
      returnByValue: true
    });
    console.log(JSON.stringify(hitTest.result.value, null, 2));

    // Also let's check what the flap looks like: let's hide the card completely and take a screenshot!
    await send('Runtime.evaluate', { expression: `document.getElementById('inner-card').style.display = 'none'` });
    await sleep(500);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/envelope_behind_card.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved scratch/envelope_behind_card.png');
  } finally {
    edge.kill();
  }
})();
