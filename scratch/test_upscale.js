const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

// Read the original card image as base64
const imgBuffer = fs.readFileSync('assets/inner-card.png');
const base64Data = imgBuffer.toString('base64');
const mimeType = 'image/jpeg'; // original is jpeg

const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<canvas id="c"></canvas>
<script>
window.processImage = function() {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const srcW = img.naturalWidth;  // 602
      const srcH = img.naturalHeight; // 1024
      const scale = 3; // 3x = 1806 x 3072 (High-DPI Retina)
      const dstW = srcW * scale;
      const dstH = srcH * scale;

      const canvas = document.getElementById('c');
      canvas.width = dstW;
      canvas.height = dstH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      // Step 1: High quality bicubic resampling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, dstW, dstH);

      // Step 2: Unsharp masking / Edge contrast enhancement
      // Extract imageData
      const imgData = ctx.getImageData(0, 0, dstW, dstH);
      const data = imgData.data;
      const copy = new Uint8ClampedArray(data);

      // We apply an unsharp mask:
      // sharp = original + amount * (original - blurred)
      // We can use a fast 3x3 box/gaussian blur approximation
      const amount = 0.45; // Subtle edge enhancement, no halos
      const stride = dstW * 4;

      for (let y = 1; y < dstH - 1; y++) {
        const row = y * stride;
        const rowAbove = (y - 1) * stride;
        const rowBelow = (y + 1) * stride;
        for (let x = 1; x < dstW - 1; x++) {
          const idx = row + (x * 4);
          
          for (let c = 0; c < 3; c++) {
            // 3x3 average
            const blur = (
              copy[rowAbove + (x - 1) * 4 + c] + copy[rowAbove + x * 4 + c] + copy[rowAbove + (x + 1) * 4 + c] +
              copy[row + (x - 1) * 4 + c]      + copy[idx + c]              + copy[row + (x + 1) * 4 + c] +
              copy[rowBelow + (x - 1) * 4 + c] + copy[rowBelow + x * 4 + c] + copy[rowBelow + (x + 1) * 4 + c]
            ) / 9;

            const orig = copy[idx + c];
            const diff = orig - blur;
            
            // Apply unsharp enhancement
            data[idx + c] = Math.min(255, Math.max(0, orig + diff * amount));
          }
          // Alpha remains untouched
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Export as high quality PNG
      const pngData = canvas.toDataURL('image/png');
      resolve(pngData);
    };
    img.src = 'data:${mimeType};base64,${base64Data}';
  });
};
</script>
</body>
</html>
`;

fs.writeFileSync('scratch/upscale_helper.html', html, 'utf8');

const PORT = 9645;
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
    '--window-size=2000,3200',
    'http://localhost:3000/scratch/upscale_helper.html'
  ]);

  try {
    await sleep(2000);
    const pages = await getJson('http://127.0.0.1:' + PORT + '/json/list');
    const target = pages.find(p => p.url && p.url.includes('upscale_helper.html'));
    if (!target) {
      console.error('Target page not found:', pages);
      return;
    }
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
    console.log('Evaluating processImage()...');
    const res = await send('Runtime.evaluate', {
      expression: `window.processImage()`,
      awaitPromise: true,
      returnByValue: true
    });

    if (res && res.result && res.result.value) {
      const dataUrl = res.result.value;
      const base64Png = dataUrl.replace(/^data:image\/png;base64,/, '');
      const pngBuf = Buffer.from(base64Png, 'base64');
      fs.writeFileSync('scratch/inner-card-highres.png', pngBuf);
      console.log('Successfully generated scratch/inner-card-highres.png! Size:', pngBuf.length, 'bytes');
    } else {
      console.error('Failed to get png result:', res);
    }

    ws.close();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    edge.kill();
  }
})();
