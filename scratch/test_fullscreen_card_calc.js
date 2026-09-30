const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

const PORT = 9652;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = ''; res.on('data', c => data += c); res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function testViewport(w, h, dpr, prefix) {
  console.log(`Testing ${prefix} (${w}x${h} @ ${dpr}x)...`);
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--remote-debugging-port=' + PORT,
    '--disable-gpu',
    `--window-size=${w},${h}`,
    `--force-device-scale-factor=${dpr}`,
    'http://localhost:3000'
  ]);

  try {
    await sleep(2200);
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

    await send('Runtime.enable');
    await send('Page.enable');
    await sleep(500);

    // Flip to back first
    await send('Runtime.evaluate', {
      expression: `document.getElementById('face-front').click();`
    });
    await sleep(1100);

    // Now test the smooth fullscreen emergence
    const res = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const envelope = document.getElementById('envelope');
          const envelope3dBox = document.getElementById('envelope-3d-box');
          const envelopeFlap = document.getElementById('envelope-flap');
          const waxSeal = document.getElementById('wax-seal');
          const innerCard = document.getElementById('inner-card');
          const envelopeShadow = document.getElementById('envelope-shadow');

          const winW = window.innerWidth;
          const winH = window.innerHeight;
          const envW = envelope3dBox.offsetWidth;
          const envH = envelope3dBox.offsetHeight;
          const cardW = innerCard.offsetWidth;
          const cardH = innerCard.offsetHeight;

          // Target Fullscreen Size:
          let targetH = Math.min(winH * 0.88, 880);
          let targetW = targetH * (602 / 1024);
          if (targetW > winW * 0.92) {
            targetW = winW * 0.92;
            targetH = targetW * (1024 / 602);
          }

          const targetScale = targetH / cardH;
          const envSlideY = winH <= 768 ? 160 : 180;
          
          // Center of innerCard in envelope coordinate system:
          // innerCard top is at 10px. Center of card is at 10 + cardH / 2.
          // Center of envelope box is at envH / 2.
          // To put card's center at the screen center when envelope is shifted by envSlideY:
          const targetCardSlideY = (envH / 2) - (10 + cardH / 2) - envSlideY;

          // Execute timeline
          const tl = gsap.timeline();

          // 1. Wax seal bloom
          tl.to(waxSeal, { scale: 1.2, duration: 0.35, ease: 'power2.out' }, 0);

          // 2. Flap swings open into 3D depth behind envelope
          tl.to(envelopeFlap, { rotateX: -180, duration: 1.15, ease: 'power3.inOut' }, 0.15);

          // 3. Card emerges directly into full screen!
          tl.set(innerCard, { zIndex: 50 }, 0.35);
          tl.to(innerCard, {
            y: targetCardSlideY,
            z: -300,
            scale: targetScale,
            opacity: 1,
            duration: 1.35,
            ease: 'power3.out'
          }, 0.4);

          // Envelope slides down and softens
          tl.to(envelope, {
            y: envSlideY,
            opacity: 0.3,
            scale: 0.82,
            duration: 1.3,
            ease: 'power3.out'
          }, 0.4);

          if (envelopeShadow) {
            tl.to(envelopeShadow, {
              opacity: 0.2,
              duration: 1.3,
              ease: 'power3.out'
            }, 0.4);
          }

          const cardSheen = innerCard.querySelector('.card-shimmer-sheen');
          if (cardSheen) {
            tl.fromTo(cardSheen,
              { left: '-120%' },
              { left: '160%', duration: 1.2, ease: 'power2.inOut' },
              0.65
            );
          }

          return { targetScale, targetCardSlideY, targetW, targetH, winW, winH };
        })()
      `,
      returnByValue: true
    });

    console.log(`[${prefix}] Calculations:`, res.result.value);

    // Wait for animation to finish
    await sleep(1800);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`scratch/test_calc_${prefix}.png`, Buffer.from(shot.data, 'base64'));
    console.log(`Saved scratch/test_calc_${prefix}.png`);

    // Verify card rect on screen
    const cardRect = await send('Runtime.evaluate', {
      expression: `
        const c = document.getElementById('inner-card').getBoundingClientRect();
        ({ top: c.top, left: c.left, width: c.width, height: c.height, bottom: c.bottom })
      `,
      returnByValue: true
    });
    console.log(`[${prefix}] Card on screen:`, cardRect.result.value);

    ws.close();
  } catch (err) {
    console.error(`Error in ${prefix}:`, err);
  } finally {
    edge.kill();
  }
}

(async () => {
  await testViewport(1280, 900, 1, 'desktop');
  await sleep(1000);
  await testViewport(390, 844, 3, 'mobile');
})();
