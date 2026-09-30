const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9234;
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

async function comparePops() {
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
    const client = new CDPClient(target.webSocketDebuggerUrl);
    await client.ready();
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await sleep(1000);

    const setups = [
      {
        name: 'pop_option_A_royal_sapphire_gold_spotlight',
        desc: 'Deep Royal Sapphire / Midnight Navy with Radiant Warm Gold Aura Spotlight',
        css: `
          #app {
            background: radial-gradient(circle at 50% 48%, #141c33 0%, #0c1224 40%, #060914 75%, #03040a 100%) !important;
          }
          .vignette-overlay {
            background: radial-gradient(circle at 50% 48%, transparent 40%, rgba(2, 3, 8, 0.85) 100%) !important;
          }
          .envelope-face {
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 8px 20px rgba(0, 0, 0, 0.5), 0 0 35px rgba(212, 175, 55, 0.35) !important;
          }
          .envelope-shadow {
            background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.85) 0%, rgba(20, 10, 5, 0.4) 45%, transparent 75%) !important;
          }
        `,
        glow: 'radial-gradient(ellipse at 50% 50%, rgba(250, 225, 156, 0.32) 0%, rgba(212, 175, 55, 0.15) 38%, rgba(20, 28, 55, 0.05) 60%, transparent 75%)'
      },
      {
        name: 'pop_option_B_deep_imperial_ruby_burgundy',
        desc: 'Deep Imperial Ruby Velvet / Wine with Warm Champagne Spotlight',
        css: `
          #app {
            background: radial-gradient(circle at 50% 48%, #2d0b1a 0%, #1a040d 40%, #0d0207 75%, #050003 100%) !important;
          }
          .vignette-overlay {
            background: radial-gradient(circle at 50% 48%, transparent 40%, rgba(5, 0, 3, 0.85) 100%) !important;
          }
          .envelope-face {
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 8px 20px rgba(0, 0, 0, 0.5), 0 0 35px rgba(250, 225, 156, 0.4) !important;
          }
          .envelope-shadow {
            background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.85) 0%, rgba(30, 8, 15, 0.4) 45%, transparent 75%) !important;
          }
        `,
        glow: 'radial-gradient(ellipse at 50% 50%, rgba(255, 230, 160, 0.35) 0%, rgba(212, 175, 55, 0.16) 40%, rgba(45, 10, 25, 0.05) 62%, transparent 75%)'
      },
      {
        name: 'pop_option_C_regal_midnight_noir_gold_halo',
        desc: 'Deep Velvet Charcoal Noir with Intense Golden Radiance',
        css: `
          #app {
            background: radial-gradient(circle at 50% 48%, #1c1815 0%, #100d0b 40%, #080605 75%, #020202 100%) !important;
          }
          .vignette-overlay {
            background: radial-gradient(circle at 50% 48%, transparent 40%, rgba(0, 0, 0, 0.88) 100%) !important;
          }
          .envelope-face {
            box-shadow: 0 25px 65px rgba(0, 0, 0, 0.85), 0 8px 20px rgba(0, 0, 0, 0.6), 0 0 45px rgba(212, 175, 55, 0.45) !important;
          }
        `,
        glow: 'radial-gradient(ellipse at 50% 50%, rgba(255, 225, 140, 0.40) 0%, rgba(212, 175, 55, 0.18) 42%, transparent 72%)'
      }
    ];

    for (const s of setups) {
      console.log(`Testing setup: ${s.name}`);
      await client.eval(`
        (() => {
          let styleEl = document.getElementById('test-pop-style');
          if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'test-pop-style';
            document.head.appendChild(styleEl);
          }
          styleEl.textContent = \`${s.css}\`;

          let glow = document.getElementById('scene-spotlight-glow');
          if (!glow) {
            glow = document.createElement('div');
            glow.id = 'scene-spotlight-glow';
            glow.style.position = 'absolute';
            glow.style.top = '50%';
            glow.style.left = '50%';
            glow.style.transform = 'translate(-50%, -50%) translateZ(-80px)';
            glow.style.width = '880px';
            glow.style.height = '580px';
            glow.style.borderRadius = '50%';
            glow.style.pointerEvents = 'none';
            glow.style.zIndex = '0';
            glow.style.filter = 'blur(45px)';
            const scene = document.getElementById('scene-container');
            scene.insertBefore(glow, scene.firstChild);
          }
          glow.style.background = \`${s.glow}\`;
        })()
      `);
      await sleep(600);
      await client.captureScreenshot(`${s.name}_sealed.png`);

      // Open envelope to see card emergence against this background
      await client.eval(`
        (() => {
          if (!window.isEnvelopeFlipped) {
            document.getElementById('btn-flip-envelope').click();
          }
        })()
      `);
      await sleep(1000);
      await client.eval(`document.getElementById('wax-seal').click();`);
      await sleep(2200);
      await client.captureScreenshot(`${s.name}_opened.png`);

      // Re-seal and flip back
      await client.eval(`document.getElementById('btn-toggle-open').click();`);
      await sleep(2000);
      await client.eval(`document.getElementById('btn-flip-envelope').click();`);
      await sleep(1000);
    }

  } finally {
    edge.kill();
  }
}

comparePops().catch(console.error);
