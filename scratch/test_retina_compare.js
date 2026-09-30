const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; background: #111; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .card-box {
      width: 350px;
      height: 595px;
      border: 2px solid gold;
      border-radius: 12px;
      overflow: hidden;
      margin: 20px;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
    }
  </style>
</head>
<body>
  <div class="card-box">
    <img src="/scratch/inner-card-highres.png" id="img-test" />
  </div>
</body>
</html>
`;

fs.writeFileSync('scratch/compare_page.html', html, 'utf8');

const PORT = 9646;
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
    '--window-size=430,932', // iPhone 14/15 Pro Max
    '--force-device-scale-factor=3', // DPR 3
    'http://localhost:3000/scratch/compare_page.html'
  ]);

  try {
    await sleep(2000);
    const pages = await getJson('http://127.0.0.1:' + PORT + '/json/list');
    const target = pages.find(p => p.url && p.url.includes('compare_page.html'));
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
    await sleep(1000);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/mobile_retina_card_screenshot.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved scratch/mobile_retina_card_screenshot.png');
    ws.close();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    edge.kill();
  }
})();
