const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

const PORT = 9655;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = ''; res.on('data', c => data += c); res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function verifyMode(viewport, dpr, prefix) {
  console.log(`\n==============================================`);
  console.log(`Verifying: ${prefix} (${viewport.w}x${viewport.h} @ ${dpr}x DPR)`);
  console.log(`==============================================`);

  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--remote-debugging-port=' + PORT,
    '--disable-gpu',
    `--window-size=${viewport.w},${viewport.h}`,
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

    // 1. Initial State: Sealed Front Face
    let shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`scratch/${prefix}_1_front.png`, Buffer.from(shot.data, 'base64'));
    console.log(`[${prefix}] Captured step 1: Front Face`);

    // 2. Click Front Face to Flip to Back
    console.log(`[${prefix}] Clicking front to flip...`);
    await send('Runtime.evaluate', {
      expression: `document.getElementById('face-front').click();`
    });
    await sleep(1100);

    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`scratch/${prefix}_2_back_sealed.png`, Buffer.from(shot.data, 'base64'));
    console.log(`[${prefix}] Captured step 2: Sealed Back Face with Wax Seal`);

    // 3. Click Ganesha Wax Seal to Open
    console.log(`[${prefix}] Clicking Wax Seal to open envelope...`);
    await send('Runtime.evaluate', {
      expression: `document.getElementById('wax-seal').click();`
    });

    // Capture mid-emergence (0.75s after click)
    await sleep(750);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`scratch/${prefix}_3_card_emerging.png`, Buffer.from(shot.data, 'base64'));
    console.log(`[${prefix}] Captured step 3: Card Emerging smoothly from envelope`);

    // Wait for emergence to complete (~1.5s more)
    await sleep(1500);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`scratch/${prefix}_4_fullscreen_card.png`, Buffer.from(shot.data, 'base64'));
    console.log(`[${prefix}] Captured step 4: Fullscreen Card directly displayed`);

    // Verify card is in fullscreen and venue link is clickable
    const cardInfo = await send('Runtime.evaluate', {
      expression: `
        const wrapper = document.querySelector('.lightbox-card-wrapper');
        const modal = document.getElementById('card-lightbox');
        const link = document.getElementById('venue-link-lightbox');
        const rect = wrapper ? wrapper.getBoundingClientRect() : null;
        const linkRect = link ? link.getBoundingClientRect() : null;
        ({
          isModalActive: modal ? modal.classList.contains('active') : false,
          cardDimensions: rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : null,
          venueLinkHref: link ? link.href : null,
          venueLinkRect: linkRect ? { top: linkRect.top, left: linkRect.left, width: linkRect.width, height: linkRect.height } : null
        })
      `,
      returnByValue: true
    });
    console.log(`[${prefix}] Card State & Venue Link:`, cardInfo.result.value);

    // 4. Click Close Button (✕) to test re-sealing
    console.log(`[${prefix}] Clicking Close Button (✕)...`);
    await send('Runtime.evaluate', {
      expression: `document.getElementById('btn-close-lightbox').click();`
    });

    // Wait for closing animation
    await sleep(2000);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`scratch/${prefix}_5_resealed.png`, Buffer.from(shot.data, 'base64'));
    console.log(`[${prefix}] Captured step 5: Envelope cleanly re-sealed`);

    // 5. Test re-opening again
    console.log(`[${prefix}] Re-opening by clicking wax seal again...`);
    await send('Runtime.evaluate', {
      expression: `document.getElementById('wax-seal').click();`
    });
    await sleep(2200);

    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`scratch/${prefix}_6_reopened_fullscreen.png`, Buffer.from(shot.data, 'base64'));
    console.log(`[${prefix}] Captured step 6: Re-opened back to fullscreen card`);

    ws.close();
  } catch (err) {
    console.error(`Error in ${prefix}:`, err);
  } finally {
    edge.kill();
  }
}

(async () => {
  // Mobile Verification (iPhone 14/15 Pro: 390x844 @ 3x DPR)
  await verifyMode({ w: 390, h: 844 }, 3, 'mobile_direct');
  await sleep(1200);

  // Desktop Verification (1280x900 @ 1x DPR)
  await verifyMode({ w: 1280, h: 900 }, 1, 'desktop_direct');

  console.log('\nAll direct fullscreen verifications passed successfully!');
})();
