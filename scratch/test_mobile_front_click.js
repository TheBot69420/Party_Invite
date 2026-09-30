const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const PORT = 9668;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = ''; res.on('data', c => data += c); res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

(async () => {
  console.log('--- Testing Mobile Front Tap -> Turn Around & Auto-Open ---');
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--remote-debugging-port=' + PORT,
    '--disable-gpu',
    '--window-size=390,844',
    'http://localhost:3000/'
  ]);

  try {
    await sleep(2500);
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
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true
    });

    // 1. Initial Mobile View (Front Face)
    let shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/mobile_step1_front.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved scratch/mobile_step1_front.png');

    // 2. Tap/click on front face
    console.log('Tapping front face on mobile...');
    await send('Runtime.evaluate', {
      expression: 'document.getElementById("face-front").click()'
    });

    await sleep(2500);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/mobile_step2_fullscreen.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved scratch/mobile_step2_fullscreen.png');

    // 3. Close on mobile
    console.log('Tapping close button on mobile...');
    await send('Runtime.evaluate', {
      expression: 'document.getElementById("btn-close-lightbox").click()'
    });

    await sleep(3000);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/mobile_step3_resealed_front.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved scratch/mobile_step3_resealed_front.png');

    console.log('--- MOBILE TEST COMPLETED SUCCESSFULLY! ---');
    ws.close();
  } catch(e) {
    console.error(e);
  } finally {
    edge.kill();
  }
})();
