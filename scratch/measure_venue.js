const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9252;
const imgPath = 'C:\\Users\\TheBot69\\.gemini\\antigravity\\brain\\01389b15-e1df-4b69-9d38-9e3d72f01fc4\\.user_uploaded\\media_1790773456786.jpg';

const server = http.createServer((req, res) => {
  if (req.url === '/img.jpg') {
    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
    fs.createReadStream(imgPath).pipe(res);
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<!DOCTYPE html>
<html>
<body>
<canvas id="c" width="602" height="1024"></canvas>
<script>
window.analysisResult = null;
window.err = null;
const img = new Image();
img.onload = () => {
  try {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, 602, 1024);
    const data = imgData.data;

    let redPixels = [];
    for (let y = 520; y < 660; y++) {
      for (let x = 300; x < 550; x++) {
        const i = (y * 602 + x) * 4;
        const r = data[i], g = data[i+1], b = data[i+2];
        if (r > 130 && g < 80 && b < 80) {
          redPixels.push({x, y, r, g, b});
        }
      }
    }

    let textPixels = [];
    for (let y = 540; y < 650; y++) {
      for (let x = 330; x < 560; x++) {
        const i = (y * 602 + x) * 4;
        const r = data[i], g = data[i+1], b = data[i+2];
        if (r < 180 && g < 140 && b < 140) {
          textPixels.push({x, y, r, g, b});
        }
      }
    }

    const pinMinX = Math.min(...redPixels.map(p => p.x));
    const pinMaxX = Math.max(...redPixels.map(p => p.x));
    const pinMinY = Math.min(...redPixels.map(p => p.y));
    const pinMaxY = Math.max(...redPixels.map(p => p.y));

    const textMinX = Math.min(...textPixels.map(p => p.x));
    const textMaxX = Math.max(...textPixels.map(p => p.x));
    const textMinY = Math.min(...textPixels.map(p => p.y));
    const textMaxY = Math.max(...textPixels.map(p => p.y));

    window.analysisResult = {
      pin: { minX: pinMinX, maxX: pinMaxX, minY: pinMinY, maxY: pinMaxY },
      text: { minX: textMinX, maxX: textMaxX, minY: textMinY, maxY: textMaxY },
      totalBox: {
        minX: Math.min(pinMinX, textMinX),
        maxX: Math.max(pinMaxX, textMaxX),
        minY: Math.min(pinMinY, textMinY),
        maxY: Math.max(pinMaxY, textMaxY),
        leftPct: ((Math.min(pinMinX, textMinX) / 602) * 100).toFixed(2),
        rightPct: ((Math.max(pinMaxX, textMaxX) / 602) * 100).toFixed(2),
        topPct: ((Math.min(pinMinY, textMinY) / 1024) * 100).toFixed(2),
        bottomPct: ((Math.max(pinMaxY, textMaxY) / 1024) * 100).toFixed(2)
      }
    };
  } catch(e) {
    window.err = e.message;
  }
};
img.onerror = (e) => { window.err = 'Img failed to load'; };
img.src = '/img.jpg';
</script>
</body>
</html>`);
}).listen(PORT, async () => {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--remote-debugging-port=9253',
    '--disable-gpu',
    `http://localhost:${PORT}`
  ]);

  await new Promise(r => setTimeout(r, 2000));

  http.get('http://127.0.0.1:9253/json/list', (res) => {
    let d = '';
    res.on('data', chunk => d += chunk);
    res.on('end', async () => {
      const list = JSON.parse(d);
      const target = list.find(p => p.url && p.url.includes('localhost:' + PORT));
      if (!target) {
        console.error('Target not found', list);
        process.exit(1);
      }
      const wsUrl = target.webSocketDebuggerUrl;
      const ws = new WebSocket(wsUrl);
      ws.onopen = async () => {
        let id = 1;
        function send(method, params={}) {
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
        let result = null;
        for (let i = 0; i < 25; i++) {
          await new Promise(r => setTimeout(r, 200));
          const ev = await send('Runtime.evaluate', { expression: 'window.analysisResult || window.err', returnByValue: true });
          if (ev && ev.result && ev.result.value) {
            result = ev.result.value;
            break;
          }
        }
        console.log('VENUE COORDINATES RESULT:');
        console.log(JSON.stringify(result, null, 2));
        edge.kill();
        server.close();
        process.exit(0);
      };
    });
  });
});
