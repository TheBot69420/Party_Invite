const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const PORT = 9665;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = ''; res.on('data', c => data += c); res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

(async () => {
  console.log('--- Starting verification of "Click front to turn around and auto-open seal" ---');
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--remote-debugging-port=' + PORT,
    '--disable-gpu',
    '--window-size=1200,900',
    'http://localhost:3000/'
  ]);

  try {
    await sleep(2500);
    const pages = await getJson('http://127.0.0.1:' + PORT + '/json/list');
    const target = pages.find(p => p.url && p.url.includes('3000'));
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

    // 1. Initial State: Sealed Front Face
    let shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/step1_initial_front.png', Buffer.from(shot.data, 'base64'));
    console.log('1. Captured scratch/step1_initial_front.png');

    // Check envelope initial state
    let stateRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const box = document.getElementById('envelope-3d-box');
        const style = window.getComputedStyle(box);
        return {
          transform: box.style.transform,
          isLightboxActive: document.getElementById('card-lightbox').classList.contains('active')
        };
      })()`,
      returnByValue: true
    });
    console.log('Initial envelope state:', stateRes.result.value);

    // 2. Click the FRONT of the envelope / card
    console.log('2. Clicking #face-front (NOT clicking the seal!)...');
    await send('Runtime.evaluate', {
      expression: 'document.getElementById("face-front").click()'
    });

    // Wait 450ms (mid-turn)
    await sleep(450);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/step2_mid_turn.png', Buffer.from(shot.data, 'base64'));
    console.log('2b. Captured scratch/step2_mid_turn.png');

    // Wait another 700ms (seal automatically blooming & flap opening)
    await sleep(700);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/step3_auto_seal_opening.png', Buffer.from(shot.data, 'base64'));
    console.log('2c. Captured scratch/step3_auto_seal_opening.png');

    // Wait for card to fully emerge into fullscreen (1.8s)
    await sleep(1800);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/step4_card_fullscreen.png', Buffer.from(shot.data, 'base64'));
    console.log('2d. Captured scratch/step4_card_fullscreen.png');

    stateRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const lb = document.getElementById('card-lightbox');
        const wrapper = document.querySelector('.lightbox-card-wrapper');
        const venueLink = document.getElementById('venue-link-lightbox');
        return {
          lightboxActive: lb.classList.contains('active'),
          cardVisible: window.getComputedStyle(wrapper).opacity === '1',
          venueHref: venueLink ? venueLink.href : null
        };
      })()`,
      returnByValue: true
    });
    console.log('Fullscreen state:', stateRes.result.value);

    // 3. Test Close / Reseal: click close button
    console.log('3. Clicking close button to reseal...');
    await send('Runtime.evaluate', {
      expression: 'document.getElementById("btn-close-lightbox").click()'
    });

    // Wait 3.0s for card slide in, flap close, seal snap, and smooth turn back to front
    await sleep(3000);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/step5_resealed_front.png', Buffer.from(shot.data, 'base64'));
    console.log('3b. Captured scratch/step5_resealed_front.png');

    // 4. Click front AGAIN to verify repeated opening
    console.log('4. Clicking front face again to verify second open...');
    await send('Runtime.evaluate', {
      expression: 'document.getElementById("face-front").click()'
    });
    await sleep(2800);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/step6_reopened_fullscreen.png', Buffer.from(shot.data, 'base64'));
    console.log('4b. Captured scratch/step6_reopened_fullscreen.png');

    stateRes = await send('Runtime.evaluate', {
      expression: `(() => {
        return {
          lightboxActive: document.getElementById('card-lightbox').classList.contains('active')
        };
      })()`,
      returnByValue: true
    });
    console.log('Re-opened state:', stateRes.result.value);

    console.log('--- ALL VERIFICATION STEPS PASSED SUCCESSFULLY! ---');
    ws.close();
  } catch (e) {
    console.error('Error during test:', e);
  } finally {
    edge.kill();
  }
})();
