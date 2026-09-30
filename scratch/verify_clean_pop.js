const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9240;
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
    this.consoleLogs = [];
    this.consoleErrors = [];

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
        this.consoleLogs.push({ type: msg.params.type, text });
        if (msg.params.type === 'error') {
          this.consoleErrors.push(text);
        }
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        this.consoleErrors.push(msg.params.exceptionDetails.text + (msg.params.exceptionDetails.exception ? ' ' + msg.params.exceptionDetails.exception.description : ''));
      }
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

async function runVerification() {
  console.log('=== Starting Clean Pop Verification (No RSVP, No Sound, Maximum Envelope Pop) ===');
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
    if (!target) throw new Error('Target page localhost:3000 not found');

    const client = new CDPClient(target.webSocketDebuggerUrl);
    await client.ready();
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await sleep(1500);

    // 1. Check DOM for any RSVP or Sound elements
    console.log('\n--- Checking DOM for RSVP & Sound artifacts ---');
    const domCheck = await client.eval(`
      (() => {
        return {
          btnRSVPExists: !!document.getElementById('btn-rsvp'),
          btnCardRSVPExists: !!document.getElementById('btn-card-rsvp'),
          btnSoundExists: !!document.getElementById('btn-sound'),
          inspectModalExists: !!document.getElementById('inspect-modal'),
          toolbarButtonCount: document.querySelectorAll('.bottom-toolbar button').length,
          toolbarButtonTexts: Array.from(document.querySelectorAll('.bottom-toolbar button')).map(b => b.innerText.trim()),
          spotlightGlowExists: !!document.getElementById('scene-glow'),
          hasAudioContext: typeof window.AudioContext !== 'undefined'
        };
      })()
    `);
    console.log('DOM Cleanliness Check:', JSON.stringify(domCheck, null, 2));

    if (domCheck.btnRSVPExists || domCheck.btnCardRSVPExists || domCheck.btnSoundExists || domCheck.inspectModalExists) {
      throw new Error('RSVP or Sound elements still exist in the DOM!');
    }
    if (domCheck.toolbarButtonCount !== 2) {
      throw new Error(`Expected exactly 2 toolbar buttons, found ${domCheck.toolbarButtonCount}`);
    }

    // 2. Desktop Sealed Front
    console.log('\n--- Capturing Desktop Sealed Front ---');
    await client.captureScreenshot('clean_pop_desktop_front.png');

    // 3. Desktop Flip to Back
    console.log('\n--- Desktop: Flip to Back ---');
    await client.eval(`document.getElementById('btn-flip-envelope').click();`);
    await sleep(1200);

    // 4. Desktop Open Envelope
    console.log('\n--- Desktop: Open Envelope via Wax Seal ---');
    await client.eval(`document.getElementById('wax-seal').click();`);
    await sleep(3200); // Allow complete GSAP open timeline to finish

    const openMetrics = await client.eval(`
      (() => {
        const card = document.getElementById('inner-card');
        const env = document.getElementById('envelope');
        const cardRect = card.getBoundingClientRect();
        return {
          cardWidth: Math.round(cardRect.width),
          cardHeight: Math.round(cardRect.height),
          cardTop: Math.round(cardRect.top),
          cardBottom: Math.round(cardRect.bottom),
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          cardZIndex: window.getComputedStyle(card).zIndex
        };
      })()
    `);
    console.log('Desktop Open Metrics:', openMetrics);
    await client.captureScreenshot('clean_pop_desktop_opened.png');

    // 5. Desktop Lightbox Zoom Check
    console.log('\n--- Desktop: Lightbox Zoom ---');
    await client.eval(`document.getElementById('inner-card').click();`);
    await sleep(800);
    const lbState = await client.eval(`
      (() => {
        const lb = document.getElementById('card-lightbox');
        return {
          isOpen: lb.classList.contains('active'),
          imgSrc: lb.querySelector('.lightbox-card-img').getAttribute('src')
        };
      })()
    `);
    console.log('Desktop Lightbox State:', lbState);
    if (!lbState.isOpen) throw new Error('Lightbox did not open on card click');

    // Close Lightbox & Reseal
    await client.eval(`document.getElementById('btn-close-lightbox').click();`);
    await sleep(600);
    await client.eval(`document.getElementById('btn-toggle-open').click();`);
    await sleep(3000);
    // Return to front face for mobile
    await client.eval(`document.getElementById('btn-flip-envelope').click();`);
    await sleep(1200);

    // ==========================================
    // 6. Mobile 9:16 Emulation (390 x 844)
    // ==========================================
    console.log('\n--- Emulating Mobile 9:16 (390 x 844) ---');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(1200);

    console.log('\n--- Capturing Mobile Sealed Front ---');
    await client.captureScreenshot('clean_pop_mobile_front.png');

    console.log('\n--- Mobile: Flip & Open ---');
    await client.eval(`document.getElementById('btn-flip-envelope').click();`);
    await sleep(1200);
    await client.eval(`document.getElementById('wax-seal').click();`);
    await sleep(3200);

    const mobileMetrics = await client.eval(`
      (() => {
        const card = document.getElementById('inner-card');
        const toolbar = document.querySelector('.bottom-toolbar');
        const cardRect = card.getBoundingClientRect();
        const tbRect = toolbar.getBoundingClientRect();
        return {
          cardWidth: Math.round(cardRect.width),
          cardHeight: Math.round(cardRect.height),
          cardTop: Math.round(cardRect.top),
          cardBottom: Math.round(cardRect.bottom),
          toolbarTop: Math.round(tbRect.top),
          gapToToolbar: Math.round(tbRect.top - cardRect.bottom)
        };
      })()
    `);
    console.log('Mobile Open Metrics:', mobileMetrics);
    await client.captureScreenshot('clean_pop_mobile_opened.png');

    // Check errors
    console.log('\n--- Error Log Summary ---');
    console.log(`Console Errors: ${client.consoleErrors.length}`);
    if (client.consoleErrors.length > 0) {
      console.error('Errors encountered:', client.consoleErrors);
      throw new Error('Encountered console errors during execution');
    }

    console.log('\n>>> SUCCESS: All verification steps passed with ZERO errors! <<<');
  } finally {
    edge.kill();
  }
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
