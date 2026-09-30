const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

const PORT = 9651;
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
    '--window-size=1280,900',
    'http://localhost:3000'
  ]);

  try {
    await sleep(2200);
    const pages = await getJson('http://127.0.0.1:' + PORT + '/json/list');
    const target = pages.find(p => p.url && p.url.includes('localhost:3000'));
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
    await send('Page.enable');
    await sleep(500);

    // Let's test the prototype openSequence directly in the browser via Runtime.evaluate
    console.log('Injecting prototype smooth emergence sequence...');
    await send('Runtime.evaluate', {
      expression: `
        // Turn to back first
        document.getElementById('face-front').click();
      `
    });
    await sleep(1100);

    // Now let's define the new openSequence and trigger it
    await send('Runtime.evaluate', {
      expression: `
        window.testSmoothOpen = function() {
          const envelope = document.getElementById('envelope');
          const envelopeFlap = document.getElementById('envelope-flap');
          const waxSeal = document.getElementById('wax-seal');
          const cardLightbox = document.getElementById('card-lightbox');
          const lightboxBackdrop = document.getElementById('lightbox-backdrop');
          const lightboxCardWrapper = document.querySelector('.lightbox-card-wrapper');
          const btnCloseLightbox = document.getElementById('btn-close-lightbox');
          const cardSheen = lightboxCardWrapper.querySelector('.card-shimmer-sheen');

          const isMobile = window.innerWidth <= 768;
          const initialY = isMobile ? 70 : 100;
          const initialScale = isMobile ? 0.42 : 0.48;

          // Prepare lightbox elements before showing
          gsap.killTweensOf([lightboxCardWrapper, lightboxBackdrop, btnCloseLightbox]);
          gsap.set(cardLightbox, { opacity: 1, pointerEvents: 'auto', visibility: 'visible' });
          cardLightbox.classList.add('active');

          gsap.set(lightboxBackdrop, { opacity: 0 });
          gsap.set(btnCloseLightbox, { opacity: 0, scale: 0.5 });
          gsap.set(lightboxCardWrapper, {
            y: initialY,
            scale: initialScale,
            opacity: 0,
            transformOrigin: '50% 50%'
          });

          const tl = gsap.timeline();

          // 1. Wax seal golden bloom
          tl.to(waxSeal, {
            scale: 1.2,
            duration: 0.35,
            ease: 'power2.out'
          }, 0);

          // 2. Flap swings open into 3D depth (-180deg) behind envelope
          tl.to(envelopeFlap, {
            rotateX: -180,
            duration: 1.15,
            ease: 'power3.inOut'
          }, 0.15);

          // 3. Card emerges out of envelope pocket and expands continuously into full screen!
          // No timer, no popup delay!
          tl.to(lightboxCardWrapper, {
            y: 0,
            scale: 1.0,
            opacity: 1,
            duration: 1.35,
            ease: 'power3.out'
          }, 0.4);

          // Backdrop blur dims background smoothly
          tl.to(lightboxBackdrop, {
            opacity: 1,
            duration: 1.2,
            ease: 'power2.out'
          }, 0.4);

          // Envelope settles downward subtly
          tl.to(envelope, {
            y: isMobile ? 70 : 100,
            scale: 0.88,
            duration: 1.25,
            ease: 'power3.out'
          }, 0.4);

          // Close button appears gracefully
          tl.to(btnCloseLightbox, {
            opacity: 1,
            scale: 1.0,
            duration: 0.4,
            ease: 'back.out(1.5)'
          }, 1.1);

          // Shimmer sweep across card
          if (cardSheen) {
            tl.fromTo(cardSheen,
              { left: '-120%' },
              { left: '160%', duration: 1.2, ease: 'power2.inOut' },
              0.7
            );
          }
        };

        window.testSmoothOpen();
      `
    });

    // Capture intermediate frames
    const times = [0, 400, 800, 1200, 1600];
    for (let i = 0; i < times.length; i++) {
      await sleep(i === 0 ? 100 : 400);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('scratch/flow_frame_' + i + '.png', Buffer.from(shot.data, 'base64'));
      console.log('Captured scratch/flow_frame_' + i + '.png');
    }

    ws.close();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    edge.kill();
  }
})();
