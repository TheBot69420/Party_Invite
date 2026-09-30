const { spawn } = require('child_process');
const http = require('http');
const PORT = 9590;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
(async () => {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new', '--remote-debugging-port=' + PORT, '--disable-gpu', 'http://localhost:3000'
  ]);
  try {
    await sleep(2000);
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

    console.log('Page loaded, monitoring state for 5 seconds without touching anything...');
    for (let i = 1; i <= 5; i++) {
      await sleep(1000);
      const st = await send('Runtime.evaluate', {
        expression: `(() => ({
          isOpen: document.getElementById('envelope').classList.contains('is-open'),
          cardOpacity: window.getComputedStyle(document.getElementById('inner-card')).opacity,
          envelope3dBoxTransform: window.getComputedStyle(document.getElementById('envelope-3d-box')).transform,
          flapTransform: window.getComputedStyle(document.getElementById('envelope-flap')).transform
        }))()`,
        returnByValue: true
      });
      console.log('Second ' + i + ':', st.result.value);
    }
    ws.close();
  } finally {
    edge.kill();
  }
})();
