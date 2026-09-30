const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9233;
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

async function testBgColors() {
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

    const variations = [
      {
        name: 'bg_1_royal_midnight_obsidian',
        css: `
          #app {
            background: radial-gradient(ellipse at 50% 50%, #111424 0%, #080a14 45%, #030408 85%, #010204 100%) !important;
          }
          .vignette-overlay {
            background: radial-gradient(ellipse at center, transparent 35%, rgba(1, 2, 4, 0.85) 100%) !important;
          }
        `,
        glow: 'radial-gradient(ellipse at center, rgba(250, 225, 156, 0.28) 0%, rgba(212, 175, 55, 0.12) 40%, transparent 70%)'
      },
      {
        name: 'bg_2_royal_velvet_deep_burgundy',
        css: `
          #app {
            background: radial-gradient(ellipse at 50% 50%, #2a0814 0%, #150309 45%, #0a0104 80%, #030001 100%) !important;
          }
          .vignette-overlay {
            background: radial-gradient(ellipse at center, transparent 35%, rgba(3, 0, 1, 0.88) 100%) !important;
          }
        `,
        glow: 'radial-gradient(ellipse at center, rgba(255, 230, 160, 0.30) 0%, rgba(212, 175, 55, 0.14) 42%, transparent 70%)'
      },
      {
        name: 'bg_3_warm_theatrical_spotlight',
        css: `
          #app {
            background: radial-gradient(ellipse at 50% 48%, #22120b 0%, #130906 40%, #0a0403 75%, #040101 100%) !important;
          }
          .vignette-overlay {
            background: radial-gradient(ellipse at center, transparent 30%, rgba(4, 1, 1, 0.90) 100%) !important;
          }
        `,
        glow: 'radial-gradient(ellipse at center, rgba(255, 220, 130, 0.35) 0%, rgba(212, 175, 55, 0.16) 45%, transparent 72%)'
      },
      {
        name: 'bg_4_pure_luxury_dark_emerald_noir',
        css: `
          #app {
            background: radial-gradient(ellipse at 50% 50%, #081a14 0%, #040e0b 45%, #020705 80%, #010302 100%) !important;
          }
          .vignette-overlay {
            background: radial-gradient(ellipse at center, transparent 35%, rgba(1, 3, 2, 0.88) 100%) !important;
          }
        `,
        glow: 'radial-gradient(ellipse at center, rgba(250, 225, 156, 0.30) 0%, rgba(212, 175, 55, 0.12) 40%, transparent 70%)'
      }
    ];

    for (const v of variations) {
      console.log(`Applying variation: ${v.name}`);
      await client.eval(`
        (() => {
          let styleEl = document.getElementById('test-bg-style');
          if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'test-bg-style';
            document.head.appendChild(styleEl);
          }
          styleEl.textContent = \`${v.css}\`;

          // Add or update scene spotlight glow
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
          glow.style.background = \`${v.glow}\`;
        })()
      `);
      await sleep(600);
      await client.captureScreenshot(`${v.name}_front.png`);

      // Also flip to back to see how the back face pops
      await client.eval(`document.getElementById('btn-flip-envelope').click();`);
      await sleep(1000);
      await client.captureScreenshot(`${v.name}_back.png`);

      // Flip back to front for next variation
      await client.eval(`document.getElementById('btn-flip-envelope').click();`);
      await sleep(1000);
    }

  } finally {
    edge.kill();
  }
}

testBgColors().catch(console.error);
