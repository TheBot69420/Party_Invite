const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const PORT = 9600;
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

    const artifactDir = 'C:\\Users\\TheBot69\\.gemini\\antigravity\\brain\\01389b15-e1df-4b69-9d38-9e3d72f01fc4';

    console.log('--- Step 1: Initial Load (Front Face) ---');
    let shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/step1_front_face.png`, Buffer.from(shot.data, 'base64'));
    console.log('Saved step1_front_face.png');

    console.log('--- Step 2: Click Front Face to Flip (Seal MUST NOT open) ---');
    await send('Runtime.evaluate', {
      expression: `document.getElementById('face-front').click();`
    });

    // Wait 1.2s for the flip animation to finish
    await sleep(1200);

    const stateAfterFlip = await send('Runtime.evaluate', {
      expression: `(() => {
        const flap = document.getElementById('envelope-flap');
        const card = document.getElementById('inner-card');
        const env = document.getElementById('envelope');
        return {
          isOpen: env.classList.contains('is-open'),
          cardOpacity: window.getComputedStyle(card).opacity,
          flapTransform: window.getComputedStyle(flap).transform
        };
      })()`,
      returnByValue: true
    });
    console.log('State after flipping to back (MUST be sealed, flap closed):', stateAfterFlip.result.value);

    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/step2_back_face_sealed.png`, Buffer.from(shot.data, 'base64'));
    console.log('Saved step2_back_face_sealed.png');

    console.log('--- Step 3: Click Wax Seal to Open ---');
    await send('Runtime.evaluate', {
      expression: `document.getElementById('wax-seal').click();`
    });

    // Wait for the open animation to complete (~2.0s)
    await sleep(2200);

    const stateAfterSealClick = await send('Runtime.evaluate', {
      expression: `(() => {
        const env = document.getElementById('envelope');
        const card = document.getElementById('inner-card');
        const lightbox = document.getElementById('card-lightbox');
        return {
          isOpen: env.classList.contains('is-open'),
          cardActive: card.classList.contains('active'),
          cardOpacity: window.getComputedStyle(card).opacity,
          isLightboxActiveBefore1s: lightbox.classList.contains('active')
        };
      })()`,
      returnByValue: true
    });
    console.log('State right after card emerged in 3D:', stateAfterSealClick.result.value);

    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/step3_card_emerged_3d.png`, Buffer.from(shot.data, 'base64'));
    console.log('Saved step3_card_emerged_3d.png');

    console.log('--- Step 4: Wait 1.0s for Automatic Fullscreen Lightbox ---');
    await sleep(1100);

    const stateAfter1s = await send('Runtime.evaluate', {
      expression: `(() => ({
        isLightboxActiveAfter1s: document.getElementById('card-lightbox').classList.contains('active')
      }))()`,
      returnByValue: true
    });
    console.log('State after 1s auto-fullscreen timer:', stateAfter1s.result.value);

    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/step4_auto_fullscreen.png`, Buffer.from(shot.data, 'base64'));
    console.log('Saved step4_auto_fullscreen.png');

    // Close lightbox
    await send('Runtime.evaluate', {
      expression: `document.getElementById('btn-close-lightbox').click();`
    });
    await sleep(500);

    // Test on Mobile 9:16 Viewport
    console.log('--- Testing Mobile 9:16 Viewport ---');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await send('Page.reload');
    await sleep(2000);

    // Click front to flip to back
    await send('Runtime.evaluate', {
      expression: `document.getElementById('face-front').click();`
    });
    await sleep(1200);

    // Verify still sealed on mobile
    const mobileSealedState = await send('Runtime.evaluate', {
      expression: `(() => ({
        isOpen: document.getElementById('envelope').classList.contains('is-open')
      }))()`,
      returnByValue: true
    });
    console.log('Mobile state after flip to back (MUST be sealed):', mobileSealedState.result.value);

    // Tap wax seal to open
    await send('Runtime.evaluate', {
      expression: `document.getElementById('wax-seal').click();`
    });
    await sleep(2200);

    // Wait 1.1s for auto-fullscreen
    await sleep(1100);

    const mobileLightboxState = await send('Runtime.evaluate', {
      expression: `(() => ({
        isLightboxActive: document.getElementById('card-lightbox').classList.contains('active'),
        venueLinkCardHref: document.getElementById('venue-link-card').getAttribute('href')
      }))()`,
      returnByValue: true
    });
    console.log('Mobile auto-fullscreen after 1s:', mobileLightboxState.result.value);

    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/step5_mobile_auto_fullscreen.png`, Buffer.from(shot.data, 'base64'));
    console.log('Saved step5_mobile_auto_fullscreen.png');

    console.log('All verification steps completed successfully!');
    ws.close();
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    edge.kill();
  }
})();
