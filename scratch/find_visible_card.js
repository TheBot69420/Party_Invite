const http = require('http');
const { spawn } = require('child_process');

const PORT = 9681;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
(async () => {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--remote-debugging-port=' + PORT,
    '--disable-gpu',
    'http://localhost:3000/'
  ]);

  try {
    await sleep(2000);
    const pages = await new Promise(res => {
      http.get('http://127.0.0.1:' + PORT + '/json/list', r => {
        let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
      });
    });
    const target = pages.find(p => p.url && p.url.includes('3000'));
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

    await send('Runtime.enable');
    await send('Network.enable');
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    await send('Page.reload');
    await sleep(1500);

    await send('Runtime.evaluate', {
      expression: 'document.getElementById("face-front").click()'
    });

    await sleep(1150);

    const res = await send('Runtime.evaluate', {
      expression: `(() => {
        const allCards = Array.from(document.querySelectorAll('img[src*="inner-card"]'));
        return allCards.map(img => {
          const rect = img.getBoundingClientRect();
          let node = img;
          const chain = [];
          while (node && node !== document.body) {
            chain.push({
              tag: node.tagName,
              id: node.id,
              class: node.className,
              opacity: window.getComputedStyle(node).opacity,
              visibility: window.getComputedStyle(node).visibility,
              display: window.getComputedStyle(node).display,
              transform: node.style.transform
            });
            node = node.parentElement;
          }
          return {
            src: img.src,
            rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
            chain
          };
        });
      })()`,
      returnByValue: true
    });
    console.log('Images at 1150ms:', JSON.stringify(res.result.value, null, 2));
    ws.close();
  } finally {
    edge.kill();
  }
})();
