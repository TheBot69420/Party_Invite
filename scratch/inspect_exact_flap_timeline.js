const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const PORT = 9685;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
(async () => {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--remote-debugging-port=' + PORT,
    '--disable-gpu',
    '--window-size=1000,800',
    'http://localhost:3000/'
  ]);

  try {
    await sleep(2000);
    const pages = await new Promise(res => {
      http.get('http://127.0.0.1:' + PORT + '/json/list', r => {
        let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
      });
    });
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

    // Click face-front to start timeline
    await send('Runtime.evaluate', {
      expression: 'document.getElementById("face-front").click()'
    });

    // We can evaluate GSAP global timeline or capture at exact moments
    // Let's capture at t = 1.1s (flap swinging ~45deg)
    await sleep(1100);
    let shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/exact_1100ms_flap_lifting.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved scratch/exact_1100ms_flap_lifting.png');

    // At t = 1.45s (flap swinging ~120deg)
    await sleep(350);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/exact_1450ms_flap_open_depth.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved scratch/exact_1450ms_flap_open_depth.png');

    // At t = 1.85s (card rising out of open pocket)
    await sleep(400);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/exact_1850ms_card_rising.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved scratch/exact_1850ms_card_rising.png');

    // At t = 2.5s (card full screen)
    await sleep(650);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/exact_2500ms_fullscreen.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved scratch/exact_2500ms_fullscreen.png');

    ws.close();
  } finally {
    edge.kill();
  }
})();
