const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const PORT = 9555;
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

    console.log('--- Checking for unwanted text elements ---');
    const textCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const bodyText = document.body.innerText.toLowerCase();
        return {
          hasReseal: bodyText.includes('reseal') || bodyText.includes('re-seal'),
          hasFlip: bodyText.includes('flip') || bodyText.includes('turn to back'),
          hasTouch: bodyText.includes('touch') || bodyText.includes('click to open'),
          bodyText: bodyText.trim(),
          elementsPresent: {
            bottomToolbar: !!document.querySelector('.bottom-toolbar'),
            frontFlipBadge: !!document.querySelector('.front-flip-badge'),
            sealTooltip: !!document.querySelector('#seal-tooltip')
          }
        };
      })()`,
      returnByValue: true
    });
    console.log('Text check result:', JSON.stringify(textCheck.result.value, null, 2));

    // 1. Initial Desktop Clean State
    let shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/desktop_1_clean_initial.png`, Buffer.from(shot.data, 'base64'));
    console.log('Saved desktop_1_clean_initial.png');

    // 2. Click envelope box to open
    console.log('--- Clicking envelope to open ---');
    await send('Runtime.evaluate', {
      expression: `document.getElementById('envelope-3d-box').click();`
    });

    // Capture mid-animation after 1.2s
    await sleep(1200);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/desktop_2_smooth_opening.png`, Buffer.from(shot.data, 'base64'));
    console.log('Saved desktop_2_smooth_opening.png');

    // Wait until openSequence completes (~2.5s from start), but BEFORE auto-fullscreen (~1.4s delay)
    // At t = 1.2s + 1.2s = 2.4s from start:
    await sleep(1200);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/desktop_3_card_emerged_3d.png`, Buffer.from(shot.data, 'base64'));
    console.log('Saved desktop_3_card_emerged_3d.png');

    const stateBeforeAuto = await send('Runtime.evaluate', {
      expression: `(() => ({
        isLightboxActive: document.getElementById('card-lightbox').classList.contains('active')
      }))()`,
      returnByValue: true
    });
    console.log('State before auto-fullscreen (during 1.4s delay):', stateBeforeAuto.result.value);

    // Wait for the 1.4s auto-fullscreen timer to fire
    await sleep(1500);

    const stateAfterAuto = await send('Runtime.evaluate', {
      expression: `(() => ({
        isLightboxActive: document.getElementById('card-lightbox').classList.contains('active')
      }))()`,
      returnByValue: true
    });
    console.log('State after auto-fullscreen:', stateAfterAuto.result.value);

    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/desktop_4_auto_fullscreen.png`, Buffer.from(shot.data, 'base64'));
    console.log('Saved desktop_4_auto_fullscreen.png');

    // Close lightbox and return to 3D view
    await send('Runtime.evaluate', {
      expression: `document.getElementById('btn-close-lightbox').click();`
    });
    await sleep(600);

    // Now test Mobile 9:16 Viewport
    console.log('--- Testing Mobile 9:16 Viewport ---');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await send('Page.reload');
    await sleep(2000);

    // Initial Mobile Clean
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/mobile_1_clean_initial.png`, Buffer.from(shot.data, 'base64'));
    console.log('Saved mobile_1_clean_initial.png');

    // Tap envelope to open on mobile
    await send('Runtime.evaluate', {
      expression: `document.getElementById('envelope-3d-box').click();`
    });

    // Wait for open animation to complete (~2.8s)
    await sleep(2850);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/mobile_2_card_emerged_3d.png`, Buffer.from(shot.data, 'base64'));
    console.log('Saved mobile_2_card_emerged_3d.png');

    // Wait 1.5s for auto-fullscreen
    await sleep(1600);
    const mobileLightboxState = await send('Runtime.evaluate', {
      expression: `(() => ({
        isLightboxActive: document.getElementById('card-lightbox').classList.contains('active'),
        venueLinkCardHref: document.getElementById('venue-link-card').getAttribute('href'),
        venueLinkLightboxHref: document.getElementById('venue-link-lightbox').getAttribute('href')
      }))()`,
      returnByValue: true
    });
    console.log('Mobile lightbox state & venue link:', mobileLightboxState.result.value);

    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/mobile_3_auto_fullscreen.png`, Buffer.from(shot.data, 'base64'));
    console.log('Saved mobile_3_auto_fullscreen.png');

    console.log('Verification completed successfully!');
    ws.close();
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    edge.kill();
  }
})();
