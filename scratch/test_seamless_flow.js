const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

const PORT = 9653;
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
    '--window-size=390,844', // Mobile iPhone 14/15 Pro
    '--force-device-scale-factor=3',
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

    // 1. Flip to back
    console.log('1. Flipping front to back...');
    await send('Runtime.evaluate', {
      expression: `document.getElementById('face-front').click();`
    });
    await sleep(1100);

    // 2. Inject the seamless emergence implementation
    console.log('2. Testing open sequence...');
    await send('Runtime.evaluate', {
      expression: `
        // Remove css keyframe animation on wrapper so GSAP has 100% smooth control
        const style = document.createElement('style');
        style.innerHTML = '.lightbox-card-wrapper { animation: none !important; }';
        document.head.appendChild(style);

        window.testOpen = function() {
          const envelope = document.getElementById('envelope');
          const envelopeFlap = document.getElementById('envelope-flap');
          const waxSeal = document.getElementById('wax-seal');
          const cardLightbox = document.getElementById('card-lightbox');
          const lightboxBackdrop = document.getElementById('lightbox-backdrop');
          const lightboxCardWrapper = document.querySelector('.lightbox-card-wrapper');
          const btnCloseLightbox = document.getElementById('btn-close-lightbox');

          const isMobile = window.innerWidth <= 768;
          const initialY = isMobile ? 80 : 110;
          const initialScale = isMobile ? 0.38 : 0.44;

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

          // Wax seal bloom
          tl.to(waxSeal, { scale: 1.2, duration: 0.35, ease: 'power2.out' }, 0);

          // Flap swings open
          tl.to(envelopeFlap, { rotateX: -180, duration: 1.1, ease: 'power3.inOut' }, 0.15);

          // Card emerges directly from envelope into full screen!
          tl.to(lightboxCardWrapper, {
            y: 0,
            scale: 1.0,
            opacity: 1,
            duration: 1.35,
            ease: 'power3.out'
          }, 0.38);

          tl.to(lightboxBackdrop, {
            opacity: 1,
            duration: 1.25,
            ease: 'power2.out'
          }, 0.38);

          tl.to(envelope, {
            y: isMobile ? 65 : 90,
            scale: 0.86,
            duration: 1.2,
            ease: 'power3.out'
          }, 0.38);

          tl.to(btnCloseLightbox, {
            opacity: 1,
            scale: 1.0,
            duration: 0.4,
            ease: 'back.out(1.5)'
          }, 1.15);
        };

        window.testOpen();
      `
    });

    // Capture at 0.7s (mid-flight emergence out of envelope)
    await sleep(700);
    let shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/seamless_mid_flight.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved scratch/seamless_mid_flight.png');

    // Wait until full-screen reached (~1.8s)
    await sleep(1200);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/seamless_fullscreen.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved scratch/seamless_fullscreen.png');

    // Now test close button
    console.log('3. Testing close sequence...');
    await send('Runtime.evaluate', {
      expression: `
        window.testClose = function() {
          const envelope = document.getElementById('envelope');
          const envelopeFlap = document.getElementById('envelope-flap');
          const waxSeal = document.getElementById('wax-seal');
          const cardLightbox = document.getElementById('card-lightbox');
          const lightboxBackdrop = document.getElementById('lightbox-backdrop');
          const lightboxCardWrapper = document.querySelector('.lightbox-card-wrapper');
          const btnCloseLightbox = document.getElementById('btn-close-lightbox');

          const isMobile = window.innerWidth <= 768;
          const initialY = isMobile ? 80 : 110;
          const initialScale = isMobile ? 0.38 : 0.44;

          const tl = gsap.timeline({
            onComplete: () => {
              cardLightbox.classList.remove('active');
            }
          });

          // Card slides back down into envelope
          tl.to(lightboxCardWrapper, {
            y: initialY,
            scale: initialScale,
            opacity: 0,
            duration: 0.75,
            ease: 'power3.inOut'
          }, 0);

          tl.to(lightboxBackdrop, {
            opacity: 0,
            duration: 0.65,
            ease: 'power2.in'
          }, 0.1);

          tl.to(btnCloseLightbox, {
            opacity: 0,
            scale: 0.5,
            duration: 0.25
          }, 0);

          tl.to(envelope, {
            y: 0,
            scale: 1.0,
            duration: 0.75,
            ease: 'power3.out'
          }, 0);

          // Flap folds shut
          tl.to(envelopeFlap, {
            rotateX: 0,
            duration: 0.8,
            ease: 'power3.inOut'
          }, 0.7);

          // Seal locks
          tl.fromTo(waxSeal, {
            scale: 1.25,
            rotation: 6
          }, {
            scale: 1.0,
            rotation: 0,
            duration: 0.3,
            ease: 'back.out(2)'
          }, 1.45);
        };

        window.testClose();
      `
    });

    await sleep(1800);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/seamless_resealed.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved scratch/seamless_resealed.png');

    ws.close();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    edge.kill();
  }
})();
