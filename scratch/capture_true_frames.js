const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const PORT = 9678;
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
    await send('Runtime.evaluate', {
      expression: 'document.getElementById("face-front").click()'
    });

    // Frame 1: Envelope turned, wax seal glowing
    await sleep(850);
    let shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/true_flap_1_seal_glow.png', Buffer.from(shot.data, 'base64'));

    // Frame 2: Flap swinging open (around 30-40deg)
    await sleep(350);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/true_flap_2_swinging_35deg.png', Buffer.from(shot.data, 'base64'));

    // Frame 3: Flap swinging open wide (around 120deg)
    await sleep(250);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/true_flap_3_swinging_120deg.png', Buffer.from(shot.data, 'base64'));

    // Frame 4: Flap fully folded back, card emerging out of pocket
    await sleep(300);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/true_flap_4_card_emerging.png', Buffer.from(shot.data, 'base64'));

    // Frame 5: Card fullscreen
    await sleep(800);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/true_flap_5_fullscreen.png', Buffer.from(shot.data, 'base64'));

    console.log('Successfully captured true flap animation frames!');
    ws.close();
  } finally {
    edge.kill();
  }
})();
