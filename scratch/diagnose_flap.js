const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const PORT = 9675;
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
    await send('Network.enable');
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    await send('Page.reload');
    await sleep(1500);

    // Click front face
    console.log('Clicking face-front...');
    await send('Runtime.evaluate', {
      expression: 'document.getElementById("face-front").click()'
    });

    const startTime = Date.now();
    for (let t = 0; t <= 2400; t += 200) {
      await sleep(200);
      const res = await send('Runtime.evaluate', {
        expression: `(() => {
          const flap = document.getElementById('envelope-flap');
          const box = document.getElementById('envelope-3d-box');
          const wrapper = document.querySelector('.lightbox-card-wrapper');
          return {
            boxTransform: box.style.transform,
            flapTransform: flap.style.transform,
            wrapperOpacity: wrapper.style.opacity,
            wrapperTransform: wrapper.style.transform
          };
        })()`,
        returnByValue: true
      });
      console.log(`t = ${(Date.now() - startTime)}ms:`, res.result.value);
    }

    ws.close();
  } finally {
    edge.kill();
  }
})();
