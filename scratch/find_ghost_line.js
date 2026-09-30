const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const PORT = 9300;
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

    // Emulate Mobile
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise(r => setTimeout(r, 1000));
    await send('Runtime.evaluate', { expression: `document.getElementById('btn-toggle-open').click()` });
    await new Promise(r => setTimeout(r, 3500));

    // Find what element is at the left side of the card where the ghost line is
    const card = await send('Runtime.evaluate', {
      expression: `(() => {
        const c = document.getElementById('inner-card');
        const r = c.getBoundingClientRect();
        const testX = r.left + 25;
        const testY = r.top + r.height * 0.5;
        const el = document.elementFromPoint(testX, testY);

        const all = Array.from(document.querySelectorAll('*')).filter(e => {
          const er = e.getBoundingClientRect();
          return er.width > 0 && er.height > 0 && 
            !(er.right < r.left || er.left > r.right || er.bottom < r.top || er.top > r.bottom);
        }).map(e => ({
          tag: e.tagName,
          id: e.id,
          class: e.className,
          zIndex: window.getComputedStyle(e).zIndex,
          transform: window.getComputedStyle(e).transform
        }));

        return {
          cardRect: r,
          hitAtLine: { x: testX, y: testY, tag: el ? el.tagName : null, class: el ? el.className : null, id: el ? el.id : null },
          overlappingElements: all
        };
      })()`,
      returnByValue: true
    });
    console.log(JSON.stringify(card.result.value, null, 2));
    edge.kill();
  } catch(e) {
    console.error(e);
    edge.kill();
  }
})();
