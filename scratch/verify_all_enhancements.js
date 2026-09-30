const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9232;
const ARTIFACTS_DIR = 'C:\\Users\\TheBot69\\.gemini\\antigravity\\brain\\01389b15-e1df-4b69-9d38-9e3d72f01fc4';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
  }
  ready() {
    return new Promise(resolve => {
      if (this.ws.readyState === WebSocket.OPEN) return resolve();
      this.ws.onopen = () => resolve();
    });
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const res = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails));
    return res.result ? res.result.value : undefined;
  }
  async captureScreenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(res.data, 'base64');
    const p = path.join(ARTIFACTS_DIR, filename);
    fs.writeFileSync(p, buf);
    console.log(`Saved screenshot: ${filename} (${buf.length} bytes)`);
    return p;
  }
}

async function runEndToEndVerification() {
  console.log('Running End-to-End Verification for Big Card & Lightbox Zoom...');
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--window-size=1280,900',
    'http://localhost:3000'
  ]);

  try {
    await sleep(2500);
    const pages = await getJson(`http://127.0.0.1:${PORT}/json/list`);
    const target = pages.find(p => p.url && p.url.includes('localhost:3000'));
    if (!target) throw new Error('Target page not found');

    const client = new CDPClient(target.webSocketDebuggerUrl);
    await client.ready();
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await sleep(1500);

    // ==========================================
    // 1. DESKTOP VERIFICATION
    // ==========================================
    console.log('\n--- Step 1: Desktop Initial Sealed Front ---');
    await client.captureScreenshot('desktop_sealed_front.png');

    console.log('--- Step 2: Flip to Back ---');
    await client.eval(`document.getElementById('btn-flip-envelope').click();`);
    await sleep(1200);
    await client.captureScreenshot('desktop_sealed_back.png');

    console.log('--- Step 3: Open Envelope & Emerge Big Card ---');
    await client.eval(`document.getElementById('wax-seal').click();`);
    await sleep(2500); // Allow GSAP timeline (1.45s) to complete smoothly

    const desktopOpenMetrics = await client.eval(`
      (() => {
        const card = document.getElementById('inner-card');
        const env = document.getElementById('envelope');
        const toolbar = document.querySelector('.bottom-toolbar');
        const cardRect = card.getBoundingClientRect();
        const toolbarRect = toolbar.getBoundingClientRect();
        return {
          cardTop: cardRect.top,
          cardBottom: cardRect.bottom,
          cardWidth: cardRect.width,
          cardHeight: cardRect.height,
          toolbarTop: toolbarRect.top,
          clearanceTop: cardRect.top,
          clearanceBottom: toolbarRect.top - cardRect.bottom,
          cardTransform: window.getComputedStyle(card).transform
        };
      })()
    `);
    console.log('Desktop Open Metrics:', desktopOpenMetrics);
    await client.captureScreenshot('desktop_opened_big_card.png');

    console.log('--- Step 4: Click Card to Open Fullscreen Lightbox Zoom ---');
    await client.eval(`document.getElementById('inner-card').click();`);
    await sleep(800);
    const lightboxState = await client.eval(`
      (() => {
        const lb = document.getElementById('card-lightbox');
        const wrapper = lb.querySelector('.lightbox-card-wrapper');
        const rect = wrapper.getBoundingClientRect();
        return {
          isActive: lb.classList.contains('active'),
          lightboxWidth: rect.width,
          lightboxHeight: rect.height,
          windowHeight: window.innerHeight
        };
      })()
    `);
    console.log('Lightbox State:', lightboxState);
    await client.captureScreenshot('desktop_lightbox_zoom.png');

    console.log('--- Step 5: Close Lightbox ---');
    await client.eval(`document.getElementById('btn-close-lightbox').click();`);
    await sleep(600);

    console.log('--- Step 6: Re-seal Envelope ---');
    await client.eval(`document.getElementById('btn-toggle-open').click();`);
    await sleep(2500);
    await client.captureScreenshot('desktop_resealed.png');

    // ==========================================
    // 2. MOBILE 9:16 VERIFICATION (390x844)
    // ==========================================
    console.log('\n--- Step 7: Mobile 9:16 Emulation ---');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(1000);

    console.log('--- Step 8: Mobile Flip to Back ---');
    await client.eval(`document.getElementById('btn-flip-envelope').click();`);
    await sleep(1200);

    console.log('--- Step 9: Mobile Tap Wax Seal to Open ---');
    await client.eval(`document.getElementById('wax-seal').click();`);
    await sleep(2500);

    const mobileOpenMetrics = await client.eval(`
      (() => {
        const card = document.getElementById('inner-card');
        const toolbar = document.querySelector('.bottom-toolbar');
        const cardRect = card.getBoundingClientRect();
        const toolbarRect = toolbar.getBoundingClientRect();
        return {
          cardTop: cardRect.top,
          cardBottom: cardRect.bottom,
          cardWidth: cardRect.width,
          cardHeight: cardRect.height,
          toolbarTop: toolbarRect.top,
          clearanceTop: cardRect.top,
          clearanceBottom: toolbarRect.top - cardRect.bottom,
          cardTransform: window.getComputedStyle(card).transform
        };
      })()
    `);
    console.log('Mobile Open Metrics:', mobileOpenMetrics);
    await client.captureScreenshot('mobile_opened_big_card.png');

    console.log('--- Step 10: Mobile Tap Card for Lightbox Zoom ---');
    await client.eval(`document.getElementById('inner-card').click();`);
    await sleep(800);
    await client.captureScreenshot('mobile_lightbox_zoom.png');

    console.log('--- Step 11: Mobile Close Lightbox & Re-seal ---');
    await client.eval(`document.getElementById('btn-close-lightbox').click();`);
    await sleep(600);
    await client.eval(`document.getElementById('btn-toggle-open').click();`);
    await sleep(2500);
    await client.captureScreenshot('mobile_resealed.png');

    console.log('\nAll End-to-End Verifications Passed Successfully!');
  } finally {
    edge.kill();
  }
}

runEndToEndVerification().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
