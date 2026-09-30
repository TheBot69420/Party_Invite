const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const PORT = 9580;
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
    await send('Input.enable');
    await sleep(600);

    const artifactDir = 'C:\\Users\\TheBot69\\.gemini\\antigravity\\brain\\01389b15-e1df-4b69-9d38-9e3d72f01fc4';

    console.log('--- Step 1: Testing Hover (Must NOT open or move) ---');
    // Dispatch mouse moves across the envelope area (center screen x: 640, y: 450)
    for (let x = 500; x <= 780; x += 30) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y: 450 });
      await sleep(40);
    }
    await sleep(500);

    // Verify envelope is still completely sealed
    const stateOnHover = await send('Runtime.evaluate', {
      expression: `(() => {
        const flap = document.getElementById('envelope-flap');
        const card = document.getElementById('inner-card');
        const lightbox = document.getElementById('card-lightbox');
        return {
          isOpen: document.getElementById('envelope').classList.contains('is-open'),
          flapTransform: window.getComputedStyle(flap).transform,
          cardOpacity: window.getComputedStyle(card).opacity,
          isLightboxActive: lightbox.classList.contains('active')
        };
      })()`,
      returnByValue: true
    });
    console.log('State after hovering across envelope:', stateOnHover.result.value);

    let shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/desktop_hover_remains_sealed.png`, Buffer.from(shot.data, 'base64'));
    console.log('Saved desktop_hover_remains_sealed.png');

    console.log('--- Step 2: Explicit Click to Open ---');
    await send('Runtime.evaluate', {
      expression: `document.getElementById('envelope-3d-box').click();`
    });

    // Wait for the smooth open animation to finish (~2.8s)
    await sleep(2850);

    const stateRightAfterOpen = await send('Runtime.evaluate', {
      expression: `(() => ({
        isLightboxActive: document.getElementById('card-lightbox').classList.contains('active')
      }))()`,
      returnByValue: true
    });
    console.log('State right after card emerged (before 1s timer):', stateRightAfterOpen.result.value);

    // Wait exactly 1100ms (to let the 1.0s timer fire)
    await sleep(1100);

    const stateAfter1s = await send('Runtime.evaluate', {
      expression: `(() => ({
        isLightboxActive: document.getElementById('card-lightbox').classList.contains('active')
      }))()`,
      returnByValue: true
    });
    console.log('State after 1s auto-fullscreen timer:', stateAfter1s.result.value);

    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/desktop_1s_auto_fullscreen.png`, Buffer.from(shot.data, 'base64'));
    console.log('Saved desktop_1s_auto_fullscreen.png');

    // Close lightbox
    await send('Runtime.evaluate', {
      expression: `document.getElementById('btn-close-lightbox').click();`
    });
    await sleep(500);

    // Step 3: Test on Mobile 9:16 Viewport
    console.log('--- Step 3: Mobile 9:16 Viewport ---');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await send('Page.reload');
    await sleep(2000);

    // Tap to open on mobile
    await send('Runtime.evaluate', {
      expression: `document.getElementById('envelope-3d-box').click();`
    });

    // Wait for 3D card emergence (~2.8s)
    await sleep(2850);

    // Wait 1.1s for auto-fullscreen
    await sleep(1100);

    const mobileState = await send('Runtime.evaluate', {
      expression: `(() => ({
        isLightboxActive: document.getElementById('card-lightbox').classList.contains('active')
      }))()`,
      returnByValue: true
    });
    console.log('Mobile auto-fullscreen state after 1s:', mobileState.result.value);

    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/mobile_1s_auto_fullscreen.png`, Buffer.from(shot.data, 'base64'));
    console.log('Saved mobile_1s_auto_fullscreen.png');

    console.log('Verification completed successfully!');
    ws.close();
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    edge.kill();
  }
})();
