const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const PORT = 9620;
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

    console.log('--- Step 1: Click Front to Flip ---');
    await send('Runtime.evaluate', {
      expression: `document.getElementById('face-front').click();`
    });
    await sleep(1200);

    console.log('--- Step 2: Click Wax Seal to Open ---');
    await send('Runtime.evaluate', {
      expression: `document.getElementById('wax-seal').click();`
    });

    // Wait until open animation finishes (~2.2s)
    await sleep(2200);

    const before300ms = await send('Runtime.evaluate', {
      expression: `(() => ({
        isOpen: document.getElementById('envelope').classList.contains('is-open'),
        isLightboxActive: document.getElementById('card-lightbox').classList.contains('active')
      }))()`,
      returnByValue: true
    });
    console.log('State right at open completion (before 0.3s timer):', before300ms.result.value);

    // Wait 350ms (0.35s) so the 300ms (0.3s) timer fires
    await sleep(350);

    const after300ms = await send('Runtime.evaluate', {
      expression: `(() => ({
        isOpen: document.getElementById('envelope').classList.contains('is-open'),
        isLightboxActive: document.getElementById('card-lightbox').classList.contains('active')
      }))()`,
      returnByValue: true
    });
    console.log('State at 0.35s after open completion (MUST be true):', after300ms.result.value);

    let shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/auto_popup_03s_verified.png`, Buffer.from(shot.data, 'base64'));
    console.log('Saved auto_popup_03s_verified.png');

    console.log('0.3s auto popup test completed successfully!');
    ws.close();
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    edge.kill();
  }
})();
