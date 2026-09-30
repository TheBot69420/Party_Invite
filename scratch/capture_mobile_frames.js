const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const PORT = 9298;
(async () => {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--remote-debugging-port=' + PORT,
    '--disable-gpu',
    '--window-size=1280,900',
    'http://localhost:3000'
  ]);
  try {
    await new Promise(r => setTimeout(r, 2000));
    const pages = await new Promise(res => {
      http.get('http://127.0.0.1:' + PORT + '/json/list', r => {
        let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
      });
    });
    const target = pages.find(p => p.url.includes('localhost:3000'));
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

    // Emulate Mobile 9:16
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise(r => setTimeout(r, 1000));

    // Click Open Envelope
    await send('Runtime.evaluate', { expression: `document.getElementById('btn-toggle-open').click()` });

    for (let i = 0; i <= 10; i++) {
      await new Promise(r => setTimeout(r, 300));
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(`scratch/mobile_frame_${String(i).padStart(2, '0')}.png`, Buffer.from(shot.data, 'base64'));
    }
    console.log('Saved 11 mobile frames!');
    edge.kill();
  } catch(e) {
    console.error(e);
    edge.kill();
  }
})();
