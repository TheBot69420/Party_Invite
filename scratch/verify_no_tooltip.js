const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const PORT = 9490;
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
    await send('Input.enable');
    await sleep(500);

    const artifactDir = 'C:\\Users\\TheBot69\\.gemini\\antigravity\\brain\\01389b15-e1df-4b69-9d38-9e3d72f01fc4';

    // 1. Open Envelope
    await send('Runtime.evaluate', { expression: `document.getElementById('btn-toggle-open').click()` });
    await sleep(3500);

    // 2. Move mouse right over Lord Ganesha on the card (around center x, top y = 200)
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: 640,
      y: 220
    });
    await sleep(300);

    // Verify tooltip is NOT visible
    const tooltipCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const tip = document.getElementById('seal-tooltip');
        return {
          hasVisibleClass: tip.classList.contains('visible'),
          opacity: window.getComputedStyle(tip).opacity,
          display: window.getComputedStyle(tip).display
        };
      })()`,
      returnByValue: true
    });
    console.log('Tooltip check on card hover:', tooltipCheck.result.value);

    // Capture screenshot of desktop open with mouse hovering card
    let shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/desktop_open_no_tooltip.png`, Buffer.from(shot.data, 'base64'));

    // 3. Mobile test
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(600);

    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/mobile_open_no_tooltip.png`, Buffer.from(shot.data, 'base64'));

    console.log('Verification finished successfully!');
  } finally {
    edge.kill();
  }
})();
