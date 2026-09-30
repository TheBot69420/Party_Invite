const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9231;
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

async function testScreensWithMarginAuto() {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--window-size=1920,1080',
    'http://localhost:3000'
  ]);
  try {
    await sleep(2500);
    const pages = await getJson(`http://127.0.0.1:${PORT}/json/list`);
    const target = pages.find(p => p.url && p.url.includes('localhost:3000'));
    const client = new CDPClient(target.webSocketDebuggerUrl);
    await client.ready();
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await sleep(1000);

    const viewports = [
      { name: '1080p_desktop_centered', width: 1920, height: 1080, mobile: false },
      { name: '900p_desktop_centered', width: 1440, height: 900, mobile: false },
      { name: '768p_laptop_centered', width: 1366, height: 768, mobile: false },
      { name: 'iphone_390x844_centered', width: 390, height: 844, mobile: true }
    ];

    for (const vp of viewports) {
      console.log(`Testing viewport ${vp.name} (${vp.width}x${vp.height})...`);
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.mobile
      });
      await sleep(500);

      const res = await client.eval(`
        (() => {
          const scene = document.getElementById('scene-container');
          scene.style.margin = 'auto 0';

          const card = document.getElementById('inner-card');
          const env = document.getElementById('envelope');
          const flap = document.getElementById('envelope-flap');
          const toolbar = document.querySelector('.bottom-toolbar');
          
          const isMobile = ${vp.mobile} || window.innerWidth <= 768;
          const vh = window.innerHeight;
          
          let cardScale, cardSlideY, envSlideY, envScale;
          if (isMobile) {
            cardScale = 1.48;
            cardSlideY = -160;
            envSlideY = 100;
            envScale = 0.82;
          } else {
            // Desktop
            cardScale = 1.35;
            cardSlideY = -120;
            envSlideY = 120;
            envScale = 0.85;
          }

          // Open flap
          gsap.set(flap, { rotateX: 160 });
          // Move card
          gsap.set(card, {
            y: cardSlideY,
            z: -85,
            scale: cardScale,
            opacity: 1
          });
          // Move env
          gsap.set(env, {
            y: envSlideY,
            scale: envScale
          });

          const cardRect = card.getBoundingClientRect();
          const toolbarRect = toolbar.getBoundingClientRect();

          return {
            cardTop: cardRect.top,
            cardBottom: cardRect.bottom,
            cardWidth: cardRect.width,
            cardHeight: cardRect.height,
            toolbarTop: toolbarRect.top,
            clearanceTop: cardRect.top,
            clearanceBottom: toolbarRect.top - cardRect.bottom
          };
        })()
      `);
      console.log(`${vp.name} metrics:`, res);
      await client.captureScreenshot(`vp_${vp.name}.png`);
    }

  } finally {
    edge.kill();
  }
}

testScreensWithMarginAuto().catch(console.error);
