(function(){
/**
 * The Royal Invitation - True 3D Envelope (Front & Back Interactive Experience)
 * Features:
 * 1. Physical 3D Envelope Shell with 16px paperboard thickness edges
 * 2. Front Face: media_1790006540190.png ("INVITATION / हार्दिक निमन्त्रणा")
 * 3. Back Face: media_1790006549972.png (Triangular Flap & Metallic Ganesha Wax Seal)
 * 4. 3D Flap opening into depth + 3D Inner Card emergence
 * 5. 360/180 3D envelope flipping and real-time mouse parallax tilt
 */

// Particle Dust Canvas
function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  for (let i = 0; i < 70; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.6 + 0.2,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -Math.random() * 0.35 - 0.08
    });
  }

  function render() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -10) p.y = height + 10;
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;

      ctx.fillStyle = `rgba(250, 225, 156, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(render);
  }
  render();
}

window.addEventListener('DOMContentLoaded', () => {
  initParticles();

  // Elements
  const envelope = document.getElementById('envelope');
  const envelope3dBox = document.getElementById('envelope-3d-box');
  const envelopeFlap = document.getElementById('envelope-flap');
  const waxSeal = document.getElementById('wax-seal');
  const innerCard = document.getElementById('inner-card');
  const faceFront = document.getElementById('face-front');
  const faceBack = document.getElementById('face-back');
  const envelopeShadow = document.getElementById('envelope-shadow');

  const STATES = {
    SEALED: 'SEALED',
    OPENING: 'OPENING',
    OPEN: 'OPEN',
    CLOSING: 'CLOSING'
  };
  let currentState = STATES.SEALED;
  let isEnvelopeFlipped = false; // false = Front (Invitation), true = Back (Flap & Wax Seal)

  function isMobileView() {
    return window.innerWidth <= 768;
  }

  function updateUI(state) {
    currentState = state;

    switch (state) {
      case STATES.SEALED:
        if (envelope) envelope.classList.remove('is-open');
        if (faceBack) faceBack.style.boxShadow = '';
        if (innerCard) innerCard.classList.remove('active');
        break;

      case STATES.OPENING:
        if (envelope) envelope.classList.add('is-open');
        break;

      case STATES.OPEN:
        if (envelope) envelope.classList.add('is-open');
        if (faceBack) faceBack.style.boxShadow = 'none';
        if (innerCard) innerCard.classList.add('active');
        break;

      case STATES.CLOSING:
        if (envelope) envelope.classList.remove('is-open');
        if (faceBack) faceBack.style.boxShadow = '';
        if (innerCard) innerCard.classList.remove('active');
        break;
    }
  }

  // Flip 3D Envelope 180deg between Front and Back faces with natural physical lift & shadow dynamics
  function flipEnvelope() {
    if (currentState !== STATES.SEALED) return;

    isEnvelopeFlipped = !isEnvelopeFlipped;

    const flipTl = gsap.timeline({
      onComplete: () => {
        updateUI(currentState);
      }
    });

    // 3D rotation with physical aerodynamic lift
    flipTl.to(envelope3dBox, {
      rotateY: isEnvelopeFlipped ? 180 : 0,
      duration: 0.95,
      ease: 'power3.inOut'
    }, 0);

    flipTl.to(envelope3dBox, {
      z: 32,
      duration: 0.47,
      ease: 'power2.out'
    }, 0);

    flipTl.to(envelope3dBox, {
      z: 0,
      duration: 0.48,
      ease: 'power2.in'
    }, 0.47);

    // Dynamic shadow breath during flip
    if (envelopeShadow) {
      flipTl.to(envelopeShadow, {
        scaleX: 0.88,
        opacity: 0.6,
        duration: 0.47,
        ease: 'power2.out'
      }, 0);
      flipTl.to(envelopeShadow, {
        scaleX: 1.0,
        opacity: 0.85,
        duration: 0.48,
        ease: 'power2.in'
      }, 0.47);
    }
  }

  // Open Sequence: Ensures envelope is turned to flap side, breaks seal, opens flap in 3D, and smoothly expands card into fullscreen
  function openSequence() {
    if (currentState !== STATES.SEALED) return;
    updateUI(STATES.OPENING);

    let startDelay = 0;
    if (!isEnvelopeFlipped) {
      isEnvelopeFlipped = true;
      gsap.to(envelope3dBox, {
        rotateY: 180,
        duration: 0.85,
        ease: 'power3.inOut'
      });
      startDelay = 0.75;
    }

    const cardLightbox = document.getElementById('card-lightbox');
    const lightboxBackdrop = document.getElementById('lightbox-backdrop');
    const lightboxCardWrapper = document.querySelector('.lightbox-card-wrapper');
    const btnCloseLightbox = document.getElementById('btn-close-lightbox');
    const cardSheen = lightboxCardWrapper ? lightboxCardWrapper.querySelector('.card-shimmer-sheen') : null;

    const isMobile = window.innerWidth <= 768;
    const initialY = isMobile ? 80 : 110;
    const initialScale = isMobile ? 0.38 : 0.44;

    // Activate lightbox container for smooth continuous emergence
    if (cardLightbox) cardLightbox.classList.add('active');
    gsap.killTweensOf([lightboxCardWrapper, lightboxBackdrop, btnCloseLightbox]);
    gsap.set(lightboxBackdrop, { opacity: 0 });
    gsap.set(btnCloseLightbox, { opacity: 0, scale: 0.5 });
    gsap.set(lightboxCardWrapper, {
      y: initialY,
      scale: initialScale,
      opacity: 0,
      transformOrigin: '50% 50%'
    });

    const tl = gsap.timeline({
      onComplete: () => {
        updateUI(STATES.OPEN);
        if (lightboxCardWrapper) gsap.set(lightboxCardWrapper, { clearProps: 'transform' });
      }
    });

    // 1. Wax Seal glowing bloom & release
    tl.to(waxSeal, {
      scale: 1.2,
      duration: 0.35,
      ease: 'power2.out'
    }, startDelay);

    // 2. Triangular flap swings open into 3D depth (-180deg) behind envelope
    tl.to(envelopeFlap, {
      rotateX: -180,
      duration: 1.15,
      ease: 'power3.inOut'
    }, startDelay + 0.15);

    // 3. Card emerges out of the envelope pocket and expands continuously into full screen!
    // No automatic popup timer, no delay!
    tl.to(lightboxCardWrapper, {
      y: 0,
      scale: 1.0,
      opacity: 1,
      duration: 1.35,
      ease: 'power3.out'
    }, startDelay + 0.38);

    // Backdrop dims background smoothly
    tl.to(lightboxBackdrop, {
      opacity: 1,
      duration: 1.25,
      ease: 'power2.out'
    }, startDelay + 0.38);

    // Envelope settles downward subtly
    tl.to(envelope, {
      y: isMobile ? 65 : 90,
      scale: 0.86,
      duration: 1.2,
      ease: 'power3.out'
    }, startDelay + 0.38);

    // Close button appears gracefully
    tl.to(btnCloseLightbox, {
      opacity: 1,
      scale: 1.0,
      duration: 0.4,
      ease: 'back.out(1.5)'
    }, startDelay + 1.15);

    // Regal golden shimmer sheen sweep across the card
    if (cardSheen) {
      tl.fromTo(cardSheen,
        { left: '-120%' },
        { left: '160%', duration: 1.2, ease: 'power2.inOut' },
        startDelay + 0.7
      );
    }

    return tl;
  }

  // Close & Re-seal Sequence: Glides card back into envelope pocket, folds flap, snaps wax seal shut
  function closeSequence() {
    if (currentState !== STATES.OPEN) return;
    updateUI(STATES.CLOSING);

    const isMobile = window.innerWidth <= 768;
    const initialY = isMobile ? 80 : 110;
    const initialScale = isMobile ? 0.38 : 0.44;

    const cardLightbox = document.getElementById('card-lightbox');
    const lightboxBackdrop = document.getElementById('lightbox-backdrop');
    const lightboxCardWrapper = document.querySelector('.lightbox-card-wrapper');
    const btnCloseLightbox = document.getElementById('btn-close-lightbox');

    const tl = gsap.timeline({
      onComplete: () => {
        if (cardLightbox) cardLightbox.classList.remove('active');
        updateUI(STATES.SEALED);
      }
    });

    // 1. Card slides smoothly back down into the envelope pocket
    if (lightboxCardWrapper) {
      tl.to(lightboxCardWrapper, {
        y: initialY,
        scale: initialScale,
        opacity: 0,
        duration: 0.75,
        ease: 'power3.inOut'
      }, 0);
    }

    if (lightboxBackdrop) {
      tl.to(lightboxBackdrop, {
        opacity: 0,
        duration: 0.65,
        ease: 'power2.in'
      }, 0.1);
    }

    if (btnCloseLightbox) {
      tl.to(btnCloseLightbox, {
        opacity: 0,
        scale: 0.5,
        duration: 0.25
      }, 0);
    }

    tl.to(envelope, {
      y: 0,
      scale: 1.0,
      duration: 0.75,
      ease: 'power3.out'
    }, 0);

    if (envelopeShadow) {
      tl.to(envelopeShadow, {
        scaleX: 1.0,
        opacity: 0.85,
        y: 0,
        duration: 0.75,
        ease: 'power3.out'
      }, 0);
    }

    // 2. Triangular flap folds shut
    tl.to(envelopeFlap, {
      rotateX: 0,
      duration: 0.8,
      ease: 'power3.inOut'
    }, 0.7);

    // 3. Ganesha wax seal snaps into place
    tl.fromTo(waxSeal, {
      scale: 1.25,
      rotation: 6
    }, {
      scale: 1.0,
      rotation: 0,
      duration: 0.3,
      ease: 'back.out(2)'
    }, 1.45);

    return tl;
  }



  // Touch / Drag Parallax & Swipe Gestures (Mobile Phone Optimized)
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  let isTouching = false;

  window.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
      isTouching = true;
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!isTouching || e.touches.length !== 1) return;
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    
    // Parallax tilt on touch drag
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const tiltX = -((touchY - cy) / cy) * 11;
    const tiltY = ((touchX - cx) / cx) * 14;

    gsap.to(envelope, {
      rotateX: Math.max(-15, Math.min(15, tiltX)),
      rotateY: Math.max(-18, Math.min(18, tiltY)),
      duration: 0.3,
      ease: 'power1.out',
      overwrite: 'auto'
    });
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (!isTouching) return;
    isTouching = false;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    const elapsed = Date.now() - touchStartTime;

    // Horizontal Swipe (Left or Right) to Flip Envelope
    if (Math.abs(diffX) > 40 && Math.abs(diffY) < 65 && elapsed < 550) {
      flipEnvelope();
      return;
    }



    // Reset tilt back to neutral
    gsap.to(envelope, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.6,
      ease: 'power2.out'
    });
  }, { passive: true });

  // Gyroscope Parallax (Device Orientation on Mobile Phones)
  if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma === null || e.beta === null) return;
      // Clamp gamma to [-25, 25] and beta to [15, 55] (centered around 35)
      const gamma = Math.max(-25, Math.min(25, e.gamma));
      const beta = Math.max(15, Math.min(55, e.beta)) - 35;
      
      const tiltY = (gamma / 25) * 12;
      const tiltX = -(beta / 20) * 10;

      gsap.to(envelope, {
        rotateX: tiltX,
        rotateY: tiltY,
        duration: 0.35,
        ease: 'power1.out',
        overwrite: 'auto'
      });
    }, { passive: true });
  }


  // Interaction Triggers:
  // 1. Clicking the front face flips the envelope to the back (revealing the Ganesha wax seal)
  if (faceFront) {
    faceFront.addEventListener('click', (e) => {
      if (currentState === STATES.SEALED && !isEnvelopeFlipped) {
        flipEnvelope();
      }
    });
  }

  // 2. Clicking the back face outside the wax seal flips it back to the front
  if (faceBack) {
    faceBack.addEventListener('click', (e) => {
      if (e.target.closest('#wax-seal') || currentState !== STATES.SEALED) return;
      if (isEnvelopeFlipped) {
        flipEnvelope();
      }
    });
  }

  // 3. ONLY clicking the Ganesha Wax Seal breaks the seal and opens the envelope!
  if (waxSeal) {
    waxSeal.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentState === STATES.SEALED) {
        openSequence();
      }
    });
  }

  // Card Zoom Lightbox Modal
  const cardLightbox = document.getElementById('card-lightbox');
  const btnCloseLightbox = document.getElementById('btn-close-lightbox');
  const lightboxBackdrop = document.getElementById('lightbox-backdrop');

  function openCardLightbox() {
    if (currentState === STATES.SEALED) {
      openSequence();
    }
  }

  function closeCardLightbox() {
    closeSequence();
  }

  // Click inner-card (when open) to re-open or focus
  if (innerCard) {
    innerCard.addEventListener('click', (e) => {
      if (e.target.closest('.venue-location-link')) {
        return; // Clicked venue Google Maps hotspot
      }
      if (currentState === STATES.OPEN) {
        // Already in fullscreen
      }
    });
  }

  // Prevent event bubbling on venue location hotspots
  document.querySelectorAll('.venue-location-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  });

  if (btnCloseLightbox) {
    btnCloseLightbox.addEventListener('click', closeCardLightbox);
  }
  if (lightboxBackdrop) {
    lightboxBackdrop.addEventListener('click', closeCardLightbox);
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCardLightbox();
    }
  });
});

})();
