const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; background: #fff; }
    canvas { display: block; }
  </style>
</head>
<body>
<canvas id="crop"></canvas>
<script>
window.cropText = function(imgSrc) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.getElementById('crop');
      // Crop around "Manish Pokharel" and "Sudha Aryal"
      // Normalized coordinates: x: 15% to 85%, y: 22% to 45%
      const sx = img.naturalWidth * 0.15;
      const sy = img.naturalHeight * 0.22;
      const sw = img.naturalWidth * 0.70;
      const sh = img.naturalHeight * 0.25;

      c.width = sw;
      c.height = sh;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      resolve(c.toDataURL('image/png'));
    };
    img.src = imgSrc;
  });
};
</script>
</body>
</html>
`;

fs.writeFileSync('scratch/crop_helper.html', html, 'utf8');

const PORT = 9656;
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
    '--window-size=1200,1200',
    'http://localhost:3000/scratch/crop_helper.html'
  ]);

  try {
    await sleep(2000);
    const pages = await getJson('http://127.0.0.1:' + PORT + '/json/list');
    const target = pages.find(p => p.url && p.url.includes('crop_helper.html'));
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

    // Crop original user upload
    const origData = fs.readFileSync('C:/Users/TheBot69/.gemini/antigravity/brain/01389b15-e1df-4b69-9d38-9e3d72f01fc4/.user_uploaded/media_1790773456786.jpg').toString('base64');
    let res = await send('Runtime.evaluate', {
      expression: `window.cropText('data:image/jpeg;base64,${origData}')`,
      awaitPromise: true,
      returnByValue: true
    });
    fs.writeFileSync('scratch/crop_original_user_text.png', Buffer.from(res.result.value.replace(/^data:image\/png;base64,/, ''), 'base64'));
    console.log('Saved scratch/crop_original_user_text.png');

    // Crop current assets/inner-card.png
    const curData = fs.readFileSync('assets/inner-card.png').toString('base64');
    res = await send('Runtime.evaluate', {
      expression: `window.cropText('data:image/png;base64,${curData}')`,
      awaitPromise: true,
      returnByValue: true
    });
    fs.writeFileSync('scratch/crop_current_upscaled_text.png', Buffer.from(res.result.value.replace(/^data:image\/png;base64,/, ''), 'base64'));
    console.log('Saved scratch/crop_current_upscaled_text.png');

    ws.close();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    edge.kill();
  }
})();
