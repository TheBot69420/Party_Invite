const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const PORT = 9370;
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
    '--window-size=1280,900',
    'http://localhost:3000'
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
    await send('Runtime.enable');

    // 1. Mobile Test
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(500);

    // Overwrite openSequence parameters in the browser session to test:
    await send('Runtime.evaluate', {
      expression: `(() => {
        // Let's test the new open values
        window.__testOpen = function() {
          const flap = document.getElementById('envelope-flap');
          const card = document.getElementById('inner-card');
          const env = document.getElementById('envelope');
          const seal = document.getElementById('wax-seal');
          const tl = gsap.timeline();
          
          tl.to(seal, { scale: 1.25, rotation: -8, duration: 0.18, ease: 'back.out(2)' }, 0);
          tl.to(flap, { rotateX: -180, duration: 1.15, ease: 'power2.inOut' }, 0.18);
          tl.set(card, { zIndex: 30 }, 0.2);
          tl.to(card, { y: -205, z: -250, scale: 1.45, opacity: 1, duration: 1.45, ease: 'power3.out' }, 0.6);
          tl.to(env, { y: 65, scale: 0.82, duration: 1.25, ease: 'power2.out' }, 0.6);
          return tl;
        };
      })()`
    });

    // Make sure envelope is flipped to back
    await send('Runtime.evaluate', {
      expression: `gsap.set('#envelope-box', { rotateY: 180 });`
    });
    await sleep(200);

    // Trigger test open
    await send('Runtime.evaluate', {
      expression: `window.__testOpen();`
    });

    // Capture progression frames during open
    for (let f = 1; f <= 8; f++) {
      await sleep(300);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(`scratch/anim_frame_${f}.png`, Buffer.from(shot.data, 'base64'));
    }

    console.log('Saved 8 animation frames!');
  } finally {
    edge.kill();
  }
})();
