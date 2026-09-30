const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const PORT = 9690;
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

    // Flip to back first
    await send('Runtime.evaluate', {
      expression: 'gsap.set(document.getElementById("envelope-3d-box"), { rotateY: 180 })'
    });

    // Test specific flap angles
    const angles = [0, -30, -60, -90, -120, -150, -180];
    for (const deg of angles) {
      await send('Runtime.evaluate', {
        expression: `gsap.set(document.getElementById("envelope-flap"), { rotateX: ${deg} })`
      });
      await sleep(100);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(`scratch/test_angle_${Math.abs(deg)}.png`, Buffer.from(shot.data, 'base64'));
      console.log(`Saved scratch/test_angle_${Math.abs(deg)}.png`);
    }

    ws.close();
  } finally {
    edge.kill();
  }
})();
