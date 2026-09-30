const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9228;
const ARTIFACTS_DIR = 'C:\\Users\\TheBot69\\.gemini\\antigravity\\brain\\01389b15-e1df-4b69-9d38-9e3d72f01fc4';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
    return new Promise((resolve, reject) => {
      if (this.ws.readyState === WebSocket.OPEN) return resolve();
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
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
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
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

async function runMobileTuning() {
  console.log('Testing Mobile Ultra Big Card...');
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--window-size=390,844',
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

    // Emulate 390x844
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(1000);

    // Flip to back
    await client.eval(`document.getElementById('btn-flip-envelope').click();`);
    await sleep(1000);

    // Open envelope
    await client.eval(`document.getElementById('wax-seal').click();`);
    await sleep(2000);

    // Test different mobile scales
    const mTests = [
      { name: 'mobile_scale_145', y: -160, z: -85, scale: 1.45, envY: 100, envScale: 0.82 },
      { name: 'mobile_scale_152', y: -170, z: -85, scale: 1.52, envY: 110, envScale: 0.80 }
    ];

    for (const t of mTests) {
      const metrics = await client.eval(`
        (() => {
          const card = document.getElementById('inner-card');
          const env = document.getElementById('envelope');
          
          gsap.to(card, {
            y: ${t.y},
            z: ${t.z},
            scale: ${t.scale},
            duration: 0.3
          });
          gsap.to(env, {
            y: ${t.envY},
            scale: ${t.envScale},
            duration: 0.3
          });

          return new Promise(resolve => {
            setTimeout(() => {
              const cardRect = card.getBoundingClientRect();
              const toolbarRect = document.querySelector('.bottom-toolbar').getBoundingClientRect();
              resolve({
                cardTop: cardRect.top,
                cardBottom: cardRect.bottom,
                cardWidth: cardRect.width,
                cardHeight: cardRect.height,
                toolbarTop: toolbarRect.top,
                clearanceTop: cardRect.top,
                clearanceBottom: toolbarRect.top - cardRect.bottom
              });
            }, 400);
          });
        })()
      `);
      console.log(`${t.name} metrics:`, metrics);
      await client.captureScreenshot(`${t.name}.png`);
    }

  } finally {
    edge.kill();
  }
}

runMobileTuning().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
