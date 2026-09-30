const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const PORT = 9470;
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
      return new Promise((resolve, reject) => {
        const curId = id++;
        const handler = (ev) => {
          const msg = JSON.parse(ev.data);
          if (msg.id === curId) {
            ws.removeEventListener('message', handler);
            if (msg.error) {
              console.error('CDP Error for ' + method + ':', msg.error);
              resolve(msg);
            } else {
              resolve(msg.result);
            }
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: curId, method, params }));
      });
    }
    await send('Page.enable');
    await send('Runtime.enable');
    await sleep(1000);

    const artifactDir = 'C:\\Users\\TheBot69\\.gemini\\antigravity\\brain\\01389b15-e1df-4b69-9d38-9e3d72f01fc4';

    // ==========================================
    // 1. DESKTOP VERIFICATION
    // ==========================================
    console.log('--- Testing Desktop ---');
    // Front sealed
    let shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/desktop_1_sealed_front.png`, Buffer.from(shot.data, 'base64'));

    // Flip to back
    await send('Runtime.evaluate', { expression: `document.getElementById('btn-flip-envelope').click()` });
    await sleep(1200);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/desktop_2_sealed_back.png`, Buffer.from(shot.data, 'base64'));

    // Open envelope
    await send('Runtime.evaluate', { expression: `document.getElementById('btn-toggle-open').click()` });
    await sleep(3500);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/desktop_3_opened_clean.png`, Buffer.from(shot.data, 'base64'));

    // Check Venue Link
    const venueLinkHref = await send('Runtime.evaluate', {
      expression: `document.getElementById('venue-link-card').href`
    });
    console.log('Venue Link Href:', venueLinkHref.result.value);

    // Zoom Lightbox
    await send('Runtime.evaluate', { expression: `document.getElementById('inner-card').click()` });
    await sleep(600);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/desktop_4_lightbox_zoom.png`, Buffer.from(shot.data, 'base64'));

    // Close Lightbox
    await send('Runtime.evaluate', { expression: `document.getElementById('btn-close-lightbox').click()` });
    await sleep(600);

    // Re-seal envelope
    await send('Runtime.evaluate', { expression: `document.getElementById('btn-toggle-open').click()` });
    await sleep(3000);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/desktop_5_resealed.png`, Buffer.from(shot.data, 'base64'));

    // ==========================================
    // 2. MOBILE VERIFICATION
    // ==========================================
    console.log('--- Testing Mobile ---');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(800);

    // Front sealed on mobile
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/mobile_1_sealed_front.png`, Buffer.from(shot.data, 'base64'));

    // Flip to back
    await send('Runtime.evaluate', { expression: `document.getElementById('btn-flip-envelope').click()` });
    await sleep(1200);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/mobile_2_sealed_back.png`, Buffer.from(shot.data, 'base64'));

    // Open envelope
    await send('Runtime.evaluate', { expression: `document.getElementById('btn-toggle-open').click()` });
    await sleep(3500);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/mobile_3_opened_clean.png`, Buffer.from(shot.data, 'base64'));

    // Hit test on mobile across card height
    const mobileHit = await send('Runtime.evaluate', {
      expression: `(() => {
        const card = document.getElementById('inner-card');
        const cr = card.getBoundingClientRect();
        const testPoints = [
          { label: 'Ganesha Crest (top)', x: cr.left + cr.width*0.5, y: cr.top + 30 },
          { label: 'Families Header', x: cr.left + cr.width*0.5, y: cr.top + cr.height*0.22 },
          { label: 'Manish Pokharel', x: cr.left + cr.width*0.5, y: cr.top + cr.height*0.32 },
          { label: 'Sudha Aryal', x: cr.left + cr.width*0.5, y: cr.top + cr.height*0.42 },
          { label: 'Venue Hotspot', x: cr.left + cr.width*0.7, y: cr.top + cr.height*0.58 },
          { label: 'Couple Portrait', x: cr.left + cr.width*0.5, y: cr.top + cr.height*0.75 }
        ];
        return testPoints.map(p => {
          const el = document.elementFromPoint(p.x, p.y);
          return {
            label: p.label,
            isCardOrChild: el && (el.closest('#inner-card') || el.id === 'inner-card'),
            elementTag: el ? el.tagName : null,
            elementId: el ? el.id : null,
            elementClass: el ? el.className : null
          };
        });
      })()`,
      returnByValue: true
    });
    console.log('Mobile Open Card Hit Tests:', JSON.stringify(mobileHit, null, 2));

    // Re-seal on mobile
    await send('Runtime.evaluate', { expression: `document.getElementById('btn-toggle-open').click()` });
    await sleep(3000);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/mobile_4_resealed.png`, Buffer.from(shot.data, 'base64'));

    console.log('ALL VERIFICATION COMPLETE!');
  } finally {
    edge.kill();
  }
})();
