const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const PORT = 9380;
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

    // 1. Desktop Test
    await send('Runtime.evaluate', {
      expression: `(() => {
        // Intercept GSAP calls in openSequence or test directly
        document.getElementById('btn-toggle-open').click();
      })()`
    });
    // Wait for open animation to complete (approx 2.5s)
    await sleep(3500);

    // Now test with flap rotateX: -180 and card z: -250 on desktop
    await send('Runtime.evaluate', {
      expression: `
        gsap.to('#envelope-flap', { rotateX: -180, duration: 0.3 });
        gsap.to('#inner-card', { z: -250, duration: 0.3 });
      `
    });
    await sleep(500);
    let shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/test_desktop_z250.png', Buffer.from(shot.data, 'base64'));

    // Test Reseal
    await send('Runtime.evaluate', {
      expression: `
        gsap.to('#inner-card', { y: 0, z: 0, scale: 1, opacity: 0, duration: 0.8 });
        gsap.to('#envelope-flap', { rotateX: 0, duration: 0.8, delay: 0.4 });
      `
    });
    await sleep(1500);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/test_desktop_resealed.png', Buffer.from(shot.data, 'base64'));

    // 2. Mobile Test
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(500);

    // Re-open on Mobile
    await send('Runtime.evaluate', {
      expression: `
        gsap.to('#envelope-flap', { rotateX: -180, duration: 0.8 });
        gsap.to('#inner-card', { y: -205, z: -250, scale: 1.45, opacity: 1, duration: 1 });
      `
    });
    await sleep(1500);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/test_mobile_z250.png', Buffer.from(shot.data, 'base64'));

    console.log('Saved test_desktop_z250.png, test_desktop_resealed.png, test_mobile_z250.png');
  } finally {
    edge.kill();
  }
})();
