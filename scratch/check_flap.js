const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const PORT = 9272;
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

    // Initial state
    const init = await send('Runtime.evaluate', {
      expression: `(() => {
        const flap = document.getElementById('envelope-flap');
        const card = document.getElementById('inner-card');
        const env = document.getElementById('envelope');
        const box = document.getElementById('envelope-box');
        return {
          flapParent: flap.parentElement.className,
          cardParent: card.parentElement.className,
          flapZIndex: window.getComputedStyle(flap).zIndex,
          cardZIndex: window.getComputedStyle(card).zIndex
        };
      })()`,
      returnByValue: true
    });
    console.log('INIT:', init.result.value);

    // Click Open
    await send('Runtime.evaluate', { expression: `document.getElementById('btn-toggle-open').click()` });

    for (let t = 500; t <= 3500; t += 500) {
      await sleep(500);
      const data = await send('Runtime.evaluate', {
        expression: `(() => {
          const flap = document.getElementById('envelope-flap');
          const card = document.getElementById('inner-card');
          const env = document.getElementById('envelope');
          const flapRect = flap.getBoundingClientRect();
          const cardRect = card.getBoundingClientRect();
          const envRect = env.getBoundingClientRect();
          return {
            time: ${t},
            flapTop: Math.round(flapRect.top),
            flapBottom: Math.round(flapRect.bottom),
            cardTop: Math.round(cardRect.top),
            cardBottom: Math.round(cardRect.bottom),
            envTop: Math.round(envRect.top),
            cardZIndex: window.getComputedStyle(card).zIndex,
            flapZIndex: window.getComputedStyle(flap).zIndex,
            cardTransform: window.getComputedStyle(card).transform,
            flapTransform: window.getComputedStyle(flap).transform
          };
        })()`,
        returnByValue: true
      });
      console.log(data.result.value);
    }
  } finally {
    edge.kill();
  }
})();
