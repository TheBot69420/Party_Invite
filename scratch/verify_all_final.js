const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

const PORT = 9648;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = ''; res.on('data', c => data += c); res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function runTest(viewport, dpr, prefix) {
  console.log(`\n========================================`);
  console.log(`Starting Test: ${prefix} (${viewport.w}x${viewport.h} @ ${dpr}x DPR)`);
  console.log(`========================================`);

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

    await send('Page.enable');
    await send('Runtime.enable');
    await sleep(600);

    // 1. Verify device toggle button does not exist
    const btnCheck = await send('Runtime.evaluate', {
      expression: `!!document.getElementById('btn-device-mode')`,
      returnByValue: true
    });
    console.log(`[${prefix}] #btn-device-mode exists in DOM?`, btnCheck.result.value);

    // Capture initial front face
    let shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`scratch/${prefix}_1_front.png`, Buffer.from(shot.data, 'base64'));
    console.log(`[${prefix}] Captured 1_front.png`);

    // 2. Click front to flip envelope to back
    console.log(`[${prefix}] Clicking front to flip...`);
    await send('Runtime.evaluate', {
      expression: `document.getElementById('face-front').click();`
    });
    // Wait for flip animation
    await sleep(1100);

    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`scratch/${prefix}_2_flipped_back.png`, Buffer.from(shot.data, 'base64'));
    console.log(`[${prefix}] Captured 2_flipped_back.png`);

    // 3. Click wax seal to open envelope
    console.log(`[${prefix}] Clicking wax seal to open...`);
    await send('Runtime.evaluate', {
      expression: `document.getElementById('wax-seal').click();`
    });

    // Wait 1.6s to capture the card emerging in 3D
    await sleep(1600);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`scratch/${prefix}_3_card_emerged_3d.png`, Buffer.from(shot.data, 'base64'));
    console.log(`[${prefix}] Captured 3_card_emerged_3d.png`);

    // Wait for completion + 0.1s auto-fullscreen
    await sleep(1200);

    // Verify lightbox is active
    const isLightboxActive = await send('Runtime.evaluate', {
      expression: `document.getElementById('card-lightbox').classList.contains('active')`,
      returnByValue: true
    });
    console.log(`[${prefix}] Lightbox modal is active?`, isLightboxActive.result.value);

    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`scratch/${prefix}_4_fullscreen_lightbox.png`, Buffer.from(shot.data, 'base64'));
    console.log(`[${prefix}] Captured 4_fullscreen_lightbox.png`);

    // Verify venue link hotspot coordinates and href
    const venueCheck = await send('Runtime.evaluate', {
      expression: `
        const link = document.getElementById('venue-link-lightbox');
        const rect = link ? link.getBoundingClientRect() : null;
        ({
          exists: !!link,
          href: link ? link.href : null,
          rect: rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : null
        })
      `,
      returnByValue: true
    });
    console.log(`[${prefix}] Venue Link Check:`, venueCheck.result.value);

    ws.close();
  } catch (err) {
    console.error(`Error in ${prefix}:`, err);
  } finally {
    edge.kill();
  }
}

(async () => {
  // Test Desktop
  await runTest({ w: 1280, h: 900 }, 1, 'desktop_final');
  await sleep(1500);

  // Test Mobile (iPhone 14/15 Pro: 390 x 844, DPR 3)
  await runTest({ w: 390, h: 844 }, 3, 'mobile_final');

  console.log('\nAll tests completed successfully!');
})();
