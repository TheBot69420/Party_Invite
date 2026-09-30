const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const PORT = 9560;
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
    '--headless=new', '--remote-debugging-port=' + PORT, '--disable-gpu', 'http://localhost:3000'
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
          if (msg.id === curId) { ws.removeEventListener('message', handler); resolve(msg.result); }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: curId, method, params }));
      });
    }
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await sleep(500);

    // Open envelope
    await send('Runtime.evaluate', { expression: `document.getElementById('envelope-3d-box').click();` });
    await sleep(2400);

    // Test removing box-shadow on all envelope faces and hiding edges
    await send('Runtime.evaluate', {
      expression: `
        document.querySelectorAll('.envelope-face').forEach(f => f.style.boxShadow = 'none');
        document.querySelectorAll('.envelope-edge').forEach(e => e.style.display = 'none');
      `
    });
    await sleep(200);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/test_no_ghost_shadow.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved test_no_ghost_shadow.png');
    ws.close();
  } finally {
    edge.kill();
  }
})();
