const fs = require('fs');

// We can read new_card_desktop_opened.png via a small canvas in Edge
const { spawn } = require('child_process');
const http = require('http');

const PORT = 9288;
const server = http.createServer((req, res) => {
  const p = 'C:\\Users\\TheBot69\\.gemini\\antigravity\\brain\\01389b15-e1df-4b69-9d38-9e3d72f01fc4\\new_card_desktop_opened.png';
  res.writeHead(200, { 'Content-Type': 'image/png' });
  fs.createReadStream(p).pipe(res);
}).listen(PORT, async () => {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--remote-debugging-port=9289',
    '--disable-gpu',
    `http://localhost:${PORT}`
  ]);
  await new Promise(r => setTimeout(r, 2000));
  http.get('http://127.0.0.1:9289/json/list', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', async () => {
      const list = JSON.parse(d);
      const target = list.find(p => p.url.includes('localhost:' + PORT));
      const ws = new WebSocket(target.webSocketDebuggerUrl);
      await new Promise(r => ws.onopen = r);
      let id = 1;
      function send(m, p={}) {
        return new Promise(res => {
          const cur = id++;
          const h = (ev) => {
            const msg = JSON.parse(ev.data);
            if (msg.id === cur) { ws.removeEventListener('message', h); res(msg.result); }
          };
          ws.addEventListener('message', h);
          ws.send(JSON.stringify({ id: cur, method: m, params: p }));
        });
      }
      await send('Page.enable');
      await send('Runtime.enable');
      const pixel = await send('Runtime.evaluate', {
        expression: `(() => {
          const img = document.querySelector('img');
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const p50 = ctx.getImageData(640, 50, 1, 1).data;
          const p80 = ctx.getImageData(640, 80, 1, 1).data;
          const p100 = ctx.getImageData(640, 100, 1, 1).data;
          return {
            at50: Array.from(p50),
            at80: Array.from(p80),
            at100: Array.from(p100),
            w: img.naturalWidth,
            h: img.naturalHeight
          };
        })()`,
        returnByValue: true
      });
      console.log('PIXELS:', pixel.result.value);
      edge.kill();
      server.close();
      process.exit(0);
    });
  });
});
