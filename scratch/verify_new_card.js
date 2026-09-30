const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9260;
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
  console.log('=== Starting New Card & Google Maps Location Verification ===');
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

    // 1. Check DOM for zero old text overlays and presence of Google Maps link
    console.log('\n--- Checking DOM for text purity & Google Maps links ---');
    const domCheck = await client.eval(`
      (() => {
        const cardMeta = document.querySelector('.card-meta-overlay');
        const lbMeta = document.querySelector('.lightbox-card-meta');
        const cardVenueLink = document.getElementById('venue-link-card');
        const lbVenueLink = document.getElementById('venue-link-lightbox');
        const cardImg = document.querySelector('.portrait-card-img');
        
        return {
          cardMetaExists: !!cardMeta,
          lbMetaExists: !!lbMeta,
          cardVenueLinkHref: cardVenueLink ? cardVenueLink.getAttribute('href') : null,
          cardVenueLinkTarget: cardVenueLink ? cardVenueLink.getAttribute('target') : null,
          lbVenueLinkHref: lbVenueLink ? lbVenueLink.getAttribute('href') : null,
          cardImgNaturalWidth: cardImg ? cardImg.naturalWidth : null,
          cardImgNaturalHeight: cardImg ? cardImg.naturalHeight : null,
          cardImgComplete: cardImg ? cardImg.complete : false
        };
      })()
    `);
    console.log('DOM Check:', JSON.stringify(domCheck, null, 2));

    if (domCheck.cardMetaExists || domCheck.lbMetaExists) {
      throw new Error('Old text overlays (.card-meta-overlay or .lightbox-card-meta) still exist!');
    }
    if (domCheck.cardVenueLinkHref !== 'https://maps.app.goo.gl/5cLbY6xXjAzk1YE78') {
      throw new Error(`Unexpected card venue link href: ${domCheck.cardVenueLinkHref}`);
    }
    if (domCheck.lbVenueLinkHref !== 'https://maps.app.goo.gl/5cLbY6xXjAzk1YE78') {
      throw new Error(`Unexpected lightbox venue link href: ${domCheck.lbVenueLinkHref}`);
    }

    // 2. Open Envelope on Desktop
    console.log('\n--- Opening Envelope on Desktop ---');
    await client.eval(`document.getElementById('btn-toggle-open').click();`);
    await sleep(3500); // Complete animation

    const desktopMetrics = await client.eval(`
      (() => {
        const card = document.getElementById('inner-card');
        const link = document.getElementById('venue-link-card');
        const cardRect = card.getBoundingClientRect();
        const linkRect = link.getBoundingClientRect();
        return {
          cardWidth: Math.round(cardRect.width),
          cardHeight: Math.round(cardRect.height),
          cardTop: Math.round(cardRect.top),
          cardBottom: Math.round(cardRect.bottom),
          linkWidth: Math.round(linkRect.width),
          linkHeight: Math.round(linkRect.height),
          linkRelLeft: Math.round(linkRect.left - cardRect.left),
          linkRelTop: Math.round(linkRect.top - cardRect.top),
          linkRelLeftPct: (((linkRect.left - cardRect.left) / cardRect.width) * 100).toFixed(1) + '%',
          linkRelTopPct: (((linkRect.top - cardRect.top) / cardRect.height) * 100).toFixed(1) + '%'
        };
      })()
    `);
    console.log('Desktop Open Metrics:', desktopMetrics);
    await client.captureScreenshot('new_card_desktop_opened.png');

    // 3. Test Location Link Click (Should NOT open lightbox)
    console.log('\n--- Testing Click on Venue Hotspot (should NOT trigger lightbox) ---');
    const clickResult = await client.eval(`
      (() => {
        let defaultPrevented = false;
        let eventBubbledToCard = false;
        
        const card = document.getElementById('inner-card');
        const link = document.getElementById('venue-link-card');
        const lb = document.getElementById('card-lightbox');

        const cardHandler = () => { eventBubbledToCard = true; };
        card.addEventListener('click', cardHandler, { once: true });

        // Dispatch click
        const clickEv = new MouseEvent('click', { bubbles: true, cancelable: true });
        link.dispatchEvent(clickEv);

        return {
          lbIsActive: lb.classList.contains('active'),
          eventBubbledToCard
        };
      })()
    `);
    console.log('Venue Click Result:', clickResult);
    if (clickResult.lbIsActive) {
      throw new Error('Clicking venue link incorrectly opened the Lightbox modal!');
    }

    // 4. Test Card Click Outside Venue Hotspot (Should open lightbox)
    console.log('\n--- Testing Card Click Outside Venue Hotspot (should open lightbox) ---');
    await client.eval(`
      (() => {
        const card = document.getElementById('inner-card');
        const cardRect = card.getBoundingClientRect();
        // Click at top area of card (e.g. Ganesha area)
        const clickEv = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: cardRect.left + 50,
          clientY: cardRect.top + 50
        });
        card.dispatchEvent(clickEv);
      })()
    `);
    await sleep(800);

    const lbState = await client.eval(`
      (() => {
        const lb = document.getElementById('card-lightbox');
        const lbLink = document.getElementById('venue-link-lightbox');
        const rect = lbLink.getBoundingClientRect();
        return {
          isActive: lb.classList.contains('active'),
          lbLinkExists: !!lbLink,
          lbLinkWidth: Math.round(rect.width),
          lbLinkHeight: Math.round(rect.height),
          lbLinkHref: lbLink.getAttribute('href')
        };
      })()
    `);
    console.log('Lightbox State:', lbState);
    if (!lbState.isActive) throw new Error('Clicking card did not open Lightbox!');
    await client.captureScreenshot('new_card_desktop_lightbox.png');

    // Close Lightbox
    await client.eval(`document.getElementById('btn-close-lightbox').click();`);
    await sleep(600);

    // Re-seal envelope before mobile test
    await client.eval(`document.getElementById('btn-toggle-open').click();`);
    await sleep(3000);

    // ==========================================
    // 5. Mobile 9:16 Emulation (390 x 844)
    // ==========================================
    console.log('\n--- Emulating Mobile 9:16 (390 x 844) ---');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(1200);

    console.log('\n--- Mobile: Open Envelope ---');
    await client.eval(`document.getElementById('btn-toggle-open').click();`);
    await sleep(3500);

    const mobileMetrics = await client.eval(`
      (() => {
        const card = document.getElementById('inner-card');
        const link = document.getElementById('venue-link-card');
        const toolbar = document.querySelector('.bottom-toolbar');
        const cardRect = card.getBoundingClientRect();
        const linkRect = link.getBoundingClientRect();
        const tbRect = toolbar.getBoundingClientRect();
        return {
          cardWidth: Math.round(cardRect.width),
          cardHeight: Math.round(cardRect.height),
          cardTop: Math.round(cardRect.top),
          cardBottom: Math.round(cardRect.bottom),
          toolbarTop: Math.round(tbRect.top),
          clearanceToToolbar: Math.round(tbRect.top - cardRect.bottom),
          linkWidth: Math.round(linkRect.width),
          linkHeight: Math.round(linkRect.height),
          linkHref: link.getAttribute('href')
        };
      })()
    `);
    console.log('Mobile Open Metrics:', mobileMetrics);
    await client.captureScreenshot('new_card_mobile_opened.png');

    // Check errors
    console.log('\n--- Console Errors Check ---');
    console.log(`Errors count: ${client.consoleErrors.length}`);
    if (client.consoleErrors.length > 0) {
      console.error('Errors:', client.consoleErrors);
      throw new Error('Console errors encountered');
    }

    console.log('\n>>> SUCCESS: All verifications passed! Google Maps link and new card image verified perfectly! <<<');
  } finally {
    edge.kill();
  }
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
