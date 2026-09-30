const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const PORT = 9292;
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
    await send('Runtime.evaluate', { expression: `document.getElementById('btn-toggle-open').click()` });
    await new Promise(r => setTimeout(r, 3500));

    // Hide inner-card
    await send('Runtime.evaluate', { expression: `document.getElementById('inner-card').style.display = 'none'` });

    // Inspect elements at various points
    const check = await send('Runtime.evaluate', {
      expression: `(() => {
        const points = [
          { y: 100, label: "y=100" },
          { y: 200, label: "y=200" },
          { y: 300, label: "y=300" },
          { y: 340, label: "y=340" },
          { y: 360, label: "y=360" },
          { y: 400, label: "y=400" },
          { y: 480, label: "y=480" },
          { y: 550, label: "y=550" }
        ];
        const env = document.getElementById('envelope');
        const flap = document.getElementById('envelope-flap');
        const envRect = env.getBoundingClientRect();
        const flapRect = flap.getBoundingClientRect();
        return {
          envRect: { top: envRect.top, bottom: envRect.bottom, height: envRect.height },
          flapRect: { top: flapRect.top, bottom: flapRect.bottom, height: flapRect.height },
          points: points.map(pt => {
            const el = document.elementFromPoint(640, pt.y);
            return { label: pt.label, y: pt.y, tag: el ? el.tagName : null, class: el ? el.className : null, id: el ? el.id : null };
          })
        };
      })()`,
      returnByValue: true
    });
    console.log(JSON.stringify(check.result.value, null, 2));
    edge.kill();
  } catch(e) {
    console.error(e);
    edge.kill();
  }
})();
