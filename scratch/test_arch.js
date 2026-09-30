const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const PORT = 9430;
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

    // 1. Move #inner-card to be child of #envelope-assembly, sibling of #envelope-box
    await send('Runtime.evaluate', {
      expression: `(() => {
        const card = document.getElementById('inner-card');
        const assembly = document.getElementById('envelope-assembly');
        assembly.appendChild(card);
        card.style.transform = 'translate3d(0, 0, 30px)';
      })()`
    });

    // 2. Test Mobile Viewport
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(500);

    // Click Open
    await send('Runtime.evaluate', {
      expression: `(() => {
        // Open with flap rotateX: -180 and card clean transform
        const box = document.getElementById('envelope-box');
        const flap = document.getElementById('envelope-flap');
        const card = document.getElementById('inner-card');
        const env = document.getElementById('envelope-assembly');
        const seal = document.getElementById('wax-seal');

        const tl = gsap.timeline();
        tl.to(box, { rotateY: 180, duration: 0.75, ease: 'power2.inOut' }, 0);
        tl.to(seal, { scale: 1.25, rotation: -8, duration: 0.18, ease: 'back.out(2)' }, 0.65);
        tl.to(flap, { rotateX: -180, duration: 1.15, ease: 'power2.inOut' }, 0.83);
        tl.to(card, { y: -205, z: 50, scale: 1.45, opacity: 1, duration: 1.45, ease: 'power3.out' }, 1.25);
        tl.to(box, { y: 65, scale: 0.82, duration: 1.25, ease: 'power2.out' }, 1.25);
      })()`
    });
    await sleep(3500);

    const shotMobile = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/arch_test_mobile.png', Buffer.from(shotMobile.data, 'base64'));

    // Check hit test on mobile
    const hitTest = await send('Runtime.evaluate', {
      expression: `(() => {
        const card = document.getElementById('inner-card');
        const cr = card.getBoundingClientRect();
        const testPoints = [
          { label: 'top center', x: cr.left + cr.width*0.5, y: cr.top + 30 },
          { label: 'left side', x: cr.left + 20, y: cr.top + cr.height*0.5 },
          { label: 'center', x: cr.left + cr.width*0.5, y: cr.top + cr.height*0.5 },
          { label: 'right side', x: cr.right - 20, y: cr.top + cr.height*0.5 },
          { label: 'bottom', x: cr.left + cr.width*0.5, y: cr.bottom - 30 }
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
    console.log('Mobile Hit Test:', JSON.stringify(hitTest.result ? hitTest.result.value : hitTest, null, 2));

    // 3. Test Desktop
    await send('Emulation.clearDeviceMetricsOverride');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const card = document.getElementById('inner-card');
        const box = document.getElementById('envelope-box');
        gsap.set(card, { y: -205, z: 60, scale: 1.34, opacity: 1 });
        gsap.set(box, { y: 115, scale: 0.84 });
      })()`
    });
    await sleep(500);

    const shotDesktop = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/arch_test_desktop.png', Buffer.from(shotDesktop.data, 'base64'));

    console.log('Saved arch_test_mobile.png and arch_test_desktop.png');
  } finally {
    edge.kill();
  }
})();
