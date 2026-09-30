const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const PORT = 9672;
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
    '--window-size=1000,800',
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

    // Click front face
    await send('Runtime.evaluate', {
      expression: 'document.getElementById("face-front").click()'
    });

    // 1. At 800ms: envelope finishes turning to back face, seal blooming
    await sleep(800);
    let shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/smooth_flap_1_seal_release.png', Buffer.from(shot.data, 'base64'));

    // 2. At 1150ms: flap swinging open smoothly into 3D (~60deg)
    await sleep(350);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/smooth_flap_2_swinging_up.png', Buffer.from(shot.data, 'base64'));

    // 3. At 1450ms: flap swung past vertical into depth, pocket open, card gracefully emerging
    await sleep(300);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/smooth_flap_3_pocket_open_emerge.png', Buffer.from(shot.data, 'base64'));

    // 4. At 1900ms: card gliding into fullscreen
    await sleep(450);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/smooth_flap_4_card_expanding.png', Buffer.from(shot.data, 'base64'));

    // 5. At 2500ms: card fully fullscreen
    await sleep(600);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/smooth_flap_5_fullscreen.png', Buffer.from(shot.data, 'base64'));

    console.log('Successfully recorded new smooth flap animation stages!');
    ws.close();
  } catch (err) {
    console.error(err);
  } finally {
    edge.kill();
  }
})();
