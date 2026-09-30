const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const PORT = 9312;
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

    // 1. Mobile Test
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise(r => setTimeout(r, 1000));

    // Open envelope
    await send('Runtime.evaluate', { expression: `document.getElementById('btn-toggle-open').click()` });
    await new Promise(r => setTimeout(r, 3500));

    const mobileShot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:\\Users\\TheBot69\\.gemini\\antigravity\\brain\\01389b15-e1df-4b69-9d38-9e3d72f01fc4\\clean_flap_mobile_open.png', Buffer.from(mobileShot.data, 'base64'));

    // Check hit test on mobile
    const mobileHit = await send('Runtime.evaluate', {
      expression: `(() => {
        const card = document.getElementById('inner-card');
        const cr = card.getBoundingClientRect();
        const testPoints = [
          { label: 'top center', x: cr.left + cr.width*0.5, y: cr.top + 30 },
          { label: 'names', x: cr.left + cr.width*0.5, y: cr.top + cr.height*0.35 },
          { label: 'date', x: cr.left + cr.width*0.5, y: cr.top + cr.height*0.55 },
          { label: 'couple', x: cr.left + cr.width*0.5, y: cr.top + cr.height*0.75 }
        ];
        return testPoints.map(p => {
          const el = document.elementFromPoint(p.x, p.y);
          return {
            label: p.label,
            isCard: el && (el.closest('#inner-card') || el.id === 'inner-card'),
            tag: el ? el.tagName : null,
            class: el ? el.className : null
          };
        });
      })()`,
      returnByValue: true
    });
    console.log('Mobile Hit Results:', mobileHit.value);

    // 2. Desktop Test
    await send('Emulation.clearDeviceMetricsOverride');
    await send('Page.navigate', { url: 'http://localhost:3000' });
    await new Promise(r => setTimeout(r, 1500));
    await send('Runtime.evaluate', { expression: `document.getElementById('btn-toggle-open').click()` });
    await new Promise(r => setTimeout(r, 3500));

    const desktopShot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:\\Users\\TheBot69\\.gemini\\antigravity\\brain\\01389b15-e1df-4b69-9d38-9e3d72f01fc4\\clean_flap_desktop_open.png', Buffer.from(desktopShot.data, 'base64'));

    const desktopHit = await send('Runtime.evaluate', {
      expression: `(() => {
        const card = document.getElementById('inner-card');
        const cr = card.getBoundingClientRect();
        const testPoints = [
          { label: 'top center', x: cr.left + cr.width*0.5, y: cr.top + 30 },
          { label: 'names', x: cr.left + cr.width*0.5, y: cr.top + cr.height*0.35 },
          { label: 'date', x: cr.left + cr.width*0.5, y: cr.top + cr.height*0.55 },
          { label: 'couple', x: cr.left + cr.width*0.5, y: cr.top + cr.height*0.75 }
        ];
        return testPoints.map(p => {
          const el = document.elementFromPoint(p.x, p.y);
          return {
            label: p.label,
            isCard: el && (el.closest('#inner-card') || el.id === 'inner-card'),
            tag: el ? el.tagName : null,
            class: el ? el.className : null
          };
        });
      })()`,
      returnByValue: true
    });
    console.log('Desktop Hit Results:', desktopHit.value);

    edge.kill();
    console.log('Finished successfully!');
  } catch(e) {
    console.error(e);
    edge.kill();
  }
})();
