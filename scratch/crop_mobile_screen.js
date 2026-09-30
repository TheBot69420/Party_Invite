const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');

const PORT = 9660;
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
    '--window-size=1200,1200',
    'http://localhost:3000/scratch/crop_helper.html'
  ]);

  try {
    await sleep(2000);
    const pages = await getJson('http://127.0.0.1:' + PORT + '/json/list');
    const target = pages.find(p => p.url && p.url.includes('crop_helper.html'));
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
    const shotData = fs.readFileSync('scratch/mobile_retina_3x_fullscreen.png').toString('base64');
    let res = await send('Runtime.evaluate', {
      expression: 'window.cropText("data:image/png;base64,' + shotData + '")',
      awaitPromise: true,
      returnByValue: true
    });
    fs.writeFileSync('scratch/crop_mobile_screen_rendered_text.png', Buffer.from(res.result.value.replace(/^data:image\/png;base64,/, ''), 'base64'));
    console.log('Saved scratch/crop_mobile_screen_rendered_text.png');
    ws.close();
  } catch (err) {
    console.error(err);
  } finally {
    edge.kill();
  }
})();
