/**
 * Procedural PBR Texture Generator for 3D Envelope & Invitation Card
 * Generates high-resolution textures on offscreen HTML5 Canvases
 * Zero external asset dependencies - instant offline and online loading.
 */

export const TextureGenerator = {
  /**
   * Generates rich dark burgundy paper texture with subtle fiber bump
   */
  createPaperTextures() {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base deep burgundy wine tone
    ctx.fillStyle = '#300810';
    ctx.fillRect(0, 0, size, size);

    // Subtle radial gradient for depth
    const radial = ctx.createRadialGradient(size/2, size/2, 50, size/2, size/2, size * 0.7);
    radial.addColorStop(0, '#3e0c16');
    radial.addColorStop(1, '#240409');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, size, size);

    // Micro paper grain and fibers
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 16;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.7));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.8));
    }
    ctx.putImageData(imgData, 0, 0);

    // Fine organic fiber streaks
    ctx.strokeStyle = 'rgba(75, 20, 30, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const len = 4 + Math.random() * 12;
      const angle = Math.random() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }

    const colorTexture = new THREE.CanvasTexture(canvas);
    colorTexture.wrapS = THREE.RepeatWrapping;
    colorTexture.wrapT = THREE.RepeatWrapping;

    // Bump Map for tactile paper roughness
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = 512;
    bumpCanvas.height = 512;
    const bCtx = bumpCanvas.getContext('2d');
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, 512, 512);

    const bData = bCtx.getImageData(0, 0, 512, 512);
    for (let i = 0; i < bData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 35;
      const val = Math.min(255, Math.max(0, 128 + n));
      bData.data[i] = val;
      bData.data[i+1] = val;
      bData.data[i+2] = val;
      bData.data[i+3] = 255;
    }
    bCtx.putImageData(bData, 0, 0);

    const bumpTexture = new THREE.CanvasTexture(bumpCanvas);
    bumpTexture.wrapS = THREE.RepeatWrapping;
    bumpTexture.wrapT = THREE.RepeatWrapping;
    bumpTexture.repeat.set(4, 4);

    return { colorTexture, bumpTexture };
  },

  /**
   * Generates gold-foil Art Deco geometric pattern for envelope interior lining
   */
  createEnvelopeLiningTexture() {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1c0307';
    ctx.fillRect(0, 0, size, size);

    const step = 64;
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
    ctx.lineWidth = 1.5;

    for (let y = -step; y < size + step * 2; y += step) {
      for (let x = -step; x < size + step * 2; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, y - step / 2);
        ctx.lineTo(x + step / 2, y);
        ctx.lineTo(x, y + step / 2);
        ctx.lineTo(x - step / 2, y);
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, y - step / 4);
        ctx.lineTo(x + step / 4, y);
        ctx.lineTo(x, y + step / 4);
        ctx.lineTo(x - step / 4, y);
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = 'rgba(235, 198, 92, 0.6)';
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
  },

  /**
   * Generates normal and height map for the 3D Metallic Gold Wax Seal with Crest
   */
  createWaxSealTextures() {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const center = size / 2;
    const radius = size * 0.42;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);

    // Outer molten wax rim - irregular organic pooling
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    const points = 48;
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const r = radius + Math.sin(angle * 7) * 14 + Math.cos(angle * 13) * 8 + Math.sin(angle * 3) * 18;
      const px = center + Math.cos(angle) * r;
      const py = center + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Raised bevel rim
    ctx.lineWidth = 26;
    ctx.strokeStyle = '#cccccc';
    ctx.stroke();

    // Recessed interior
    ctx.fillStyle = '#777777';
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.82, 0, Math.PI * 2);
    ctx.fill();

    // Beaded ring
    const beadCount = 36;
    const beadR = radius * 0.76;
    ctx.fillStyle = '#dddddd';
    for (let i = 0; i < beadCount; i++) {
      const angle = (i / beadCount) * Math.PI * 2;
      const bx = center + Math.cos(angle) * beadR;
      const by = center + Math.sin(angle) * beadR;
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Concentric border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.68, 0, Math.PI * 2);
    ctx.stroke();

    // Crown & Monogram Emblem
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Crown
    ctx.beginPath();
    const cy = center - radius * 0.32;
    ctx.moveTo(center - 50, cy + 20);
    ctx.lineTo(center - 60, cy - 15);
    ctx.lineTo(center - 25, cy + 2);
    ctx.lineTo(center, cy - 30);
    ctx.lineTo(center + 25, cy + 2);
    ctx.lineTo(center + 60, cy - 15);
    ctx.lineTo(center + 50, cy + 20);
    ctx.closePath();
    ctx.fill();

    // Monogram Letter "A"
    ctx.font = 'bold 150px "Cinzel", "Playfair Display", "Times New Roman", serif';
    ctx.fillText('A', center, center + 25);

    // Laurel branches
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(center, center + 20, radius * 0.45, Math.PI * 0.35, Math.PI * 0.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(center, center + 20, radius * 0.45, Math.PI * 0.15, Math.PI * 0.65, true);
    ctx.stroke();

    // Star
    ctx.font = '40px serif';
    ctx.fillText('✦', center, center + radius * 0.48);

    // Convert to Normal Map (Sobel filter)
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = size;
    normalCanvas.height = size;
    const nCtx = normalCanvas.getContext('2d');
    const heightImg = ctx.getImageData(0, 0, size, size);
    const normalImg = nCtx.createImageData(size, size);

    const hData = heightImg.data;
    const nData = normalImg.data;
    const strength = 3.2;

    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const idx = (y * size + x) * 4;
        const left = hData[(y * size + (x - 1)) * 4];
        const right = hData[(y * size + (x + 1)) * 4];
        const up = hData[((y - 1) * size + x) * 4];
        const down = hData[((y + 1) * size + x) * 4];

        const dx = (right - left) / 255.0 * strength;
        const dy = (down - up) / 255.0 * strength;
        const dz = 1.0;

        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const nx = (dx / len) * 0.5 + 0.5;
        const ny = (dy / len) * 0.5 + 0.5;
        const nz = (dz / len) * 0.5 + 0.5;

        nData[idx] = Math.floor(nx * 255);
        nData[idx + 1] = Math.floor((1.0 - ny) * 255);
        nData[idx + 2] = Math.floor(nz * 255);
        nData[idx + 3] = 255;
      }
    }
    nCtx.putImageData(normalImg, 0, 0);

    const normalTexture = new THREE.CanvasTexture(normalCanvas);
    const heightTexture = new THREE.CanvasTexture(canvas);

    return { normalTexture, heightTexture };
  },

  /**
   * Generates a 2048x1440 high-resolution luxury invitation card graphic
   */
  createCardTexture() {
    const width = 2048;
    const height = 1440;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Deep obsidian-burgundy satin card base
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#1a0409');
    grad.addColorStop(0.5, '#2b0710');
    grad.addColorStop(1, '#150307');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Fine paper grain
    ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
    for (let i = 0; i < 45000; i++) {
      ctx.fillRect(Math.random() * width, Math.random() * height, 1.5, 1.5);
    }

    function getGoldGradient(x1, y1, x2, y2) {
      const g = ctx.createLinearGradient(x1, y1, x2, y2);
      g.addColorStop(0, '#fbf0b9');
      g.addColorStop(0.2, '#d4af37');
      g.addColorStop(0.4, '#aa771c');
      g.addColorStop(0.6, '#fbf0b9');
      g.addColorStop(0.8, '#d4af37');
      g.addColorStop(1, '#8f5c0b');
      return g;
    }

    const goldGrad = getGoldGradient(0, 0, width, height);

    // Outer double gold border
    const margin = 70;
    ctx.strokeStyle = goldGrad;
    ctx.lineWidth = 6;
    ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);

    const innerMargin = 92;
    ctx.lineWidth = 2;
    ctx.strokeRect(innerMargin, innerMargin, width - innerMargin * 2, height - innerMargin * 2);

    // Corner filigree flourishes
    const drawCornerFiligree = (cx, cy, flipX, flipY) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      ctx.strokeStyle = goldGrad;
      ctx.fillStyle = goldGrad;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.arc(45, 45, 30, Math.PI, Math.PI * 1.5);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(15, 75);
      ctx.quadraticCurveTo(20, 20, 75, 15);
      ctx.quadraticCurveTo(45, 45, 15, 75);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(32, 32, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(75, 15);
      ctx.bezierCurveTo(95, 12, 115, 25, 125, 15);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(15, 75);
      ctx.bezierCurveTo(12, 95, 25, 115, 15, 125);
      ctx.stroke();

      ctx.restore();
    };

    drawCornerFiligree(innerMargin, innerMargin, false, false);
    drawCornerFiligree(width - innerMargin, innerMargin, true, false);
    drawCornerFiligree(innerMargin, height - innerMargin, false, true);
    drawCornerFiligree(width - innerMargin, height - innerMargin, true, true);

    // Top Header Crown Emblem
    ctx.save();
    ctx.translate(width / 2, 230);
    ctx.fillStyle = goldGrad;
    ctx.strokeStyle = goldGrad;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(-60, 20);
    ctx.lineTo(-75, -20);
    ctx.lineTo(-30, 0);
    ctx.lineTo(0, -45);
    ctx.lineTo(30, 0);
    ctx.lineTo(75, -20);
    ctx.lineTo(60, 20);
    ctx.closePath();
    ctx.fill();

    [-75, -30, 0, 30, 75].forEach((px, idx) => {
      const py = idx === 2 ? -52 : (idx === 1 || idx === 3 ? -6 : -26);
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.beginPath();
    ctx.moveTo(-280, 55);
    ctx.lineTo(-40, 55);
    ctx.arc(0, 55, 6, 0, Math.PI * 2);
    ctx.moveTo(40, 55);
    ctx.lineTo(280, 55);
    ctx.stroke();
    ctx.restore();

    // Typography
    ctx.textAlign = 'center';

    ctx.fillStyle = '#dfba67';
    ctx.font = '600 36px "Cinzel", "Trajan Pro", "Times New Roman", serif';
    ctx.fillText('YOU ARE CORDIALLY INVITED TO', width / 2, 380);

    ctx.fillStyle = goldGrad;
    ctx.font = 'italic 700 110px "Playfair Display", "Cinzel Decorative", "Georgia", serif';
    ctx.fillText('The Celestial Gala', width / 2, 540);

    ctx.fillStyle = '#e8cb82';
    ctx.font = 'italic 400 42px "Cormorant Garamond", "Georgia", serif';
    ctx.fillText('AN EVENING OF TIMELESS ELEGANCE & RADIANCE', width / 2, 640);

    // Divider line
    ctx.save();
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 350, 720);
    ctx.lineTo(width / 2 + 350, 720);
    ctx.stroke();
    ctx.fillStyle = goldGrad;
    ctx.font = '28px serif';
    ctx.fillText('✦ ❖ ✦', width / 2, 725);
    ctx.restore();

    // Date & Time
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 48px "Cinzel", "Trajan Pro", serif';
    ctx.fillText('SATURDAY, OCTOBER 24TH, 2026', width / 2, 830);

    ctx.fillStyle = '#dfba67';
    ctx.font = '500 38px "Cinzel", serif';
    ctx.fillText('AT EIGHT O’CLOCK IN THE EVENING', width / 2, 910);

    // Venue
    ctx.fillStyle = '#f5e4b7';
    ctx.font = 'bold 50px "Cinzel", "Georgia", serif';
    ctx.fillText('THE GRAND OBSERVATORY', width / 2, 1020);

    ctx.fillStyle = '#a6824a';
    ctx.font = '34px "Cormorant Garamond", serif';
    ctx.fillText('100 CELESTIAL PROMENADE • SAN FRANCISCO', width / 2, 1090);

    // Dress Code & RSVP
    ctx.save();
    ctx.strokeStyle = goldGrad;
    ctx.lineWidth = 2;
    ctx.strokeRect(width / 2 - 260, 1160, 520, 90);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 32px "Cinzel", sans-serif';
    ctx.fillText('BLACK TIE & MASQUERADE', width / 2, 1215);

    ctx.fillStyle = '#8f6830';
    ctx.font = '30px "Cormorant Garamond", serif';
    ctx.fillText('R.S.V.P. BY OCTOBER TENTH', width / 2, 1310);
    ctx.restore();

    const cardTexture = new THREE.CanvasTexture(canvas);
    cardTexture.generateMipmaps = true;
    cardTexture.minFilter = THREE.LinearMipmapLinearFilter;

    // Card Roughness map (metallic gold vs matte paper)
    const rCanvas = document.createElement('canvas');
    rCanvas.width = 1024;
    rCanvas.height = 720;
    const rCtx = rCanvas.getContext('2d');
    rCtx.fillStyle = '#e5e5e5';
    rCtx.fillRect(0, 0, 1024, 720);
    rCtx.drawImage(canvas, 0, 0, 1024, 720);

    const rImg = rCtx.getImageData(0, 0, 1024, 720);
    for (let i = 0; i < rImg.data.length; i += 4) {
      const brightness = (rImg.data[i] * 0.299 + rImg.data[i+1] * 0.587 + rImg.data[i+2] * 0.114);
      if (brightness > 60) {
        rImg.data[i] = 45;
        rImg.data[i+1] = 45;
        rImg.data[i+2] = 45;
      } else {
        rImg.data[i] = 225;
        rImg.data[i+1] = 225;
        rImg.data[i+2] = 225;
      }
    }
    rCtx.putImageData(rImg, 0, 0);

    const cardRoughnessMap = new THREE.CanvasTexture(rCanvas);

    // Card Back Texture (for full 3D OrbitControls inspection)
    const backCanvas = document.createElement('canvas');
    backCanvas.width = 1024;
    backCanvas.height = 720;
    const bCtx = backCanvas.getContext('2d');

    const bGrad = bCtx.createLinearGradient(0, 0, 1024, 720);
    bGrad.addColorStop(0, '#150307');
    bGrad.addColorStop(0.5, '#22050d');
    bGrad.addColorStop(1, '#110205');
    bCtx.fillStyle = bGrad;
    bCtx.fillRect(0, 0, 1024, 720);

    const bGold = bCtx.createLinearGradient(0, 0, 1024, 720);
    bGold.addColorStop(0, '#fbf0b9');
    bGold.addColorStop(0.5, '#d4af37');
    bGold.addColorStop(1, '#8f5c0b');

    bCtx.strokeStyle = bGold;
    bCtx.lineWidth = 4;
    bCtx.strokeRect(35, 35, 1024 - 70, 720 - 70);
    bCtx.lineWidth = 1.5;
    bCtx.strokeRect(48, 48, 1024 - 96, 720 - 96);

    bCtx.save();
    bCtx.translate(512, 360);

    bCtx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    bCtx.lineWidth = 1.5;
    for (let i = 0; i < 24; i++) {
      bCtx.rotate((Math.PI * 2) / 24);
      bCtx.beginPath();
      bCtx.moveTo(0, 70);
      bCtx.lineTo(0, 100);
      bCtx.stroke();
    }

    bCtx.strokeStyle = bGold;
    bCtx.lineWidth = 3;
    bCtx.beginPath();
    bCtx.arc(0, 0, 65, 0, Math.PI * 2);
    bCtx.stroke();

    bCtx.beginPath();
    bCtx.arc(0, 0, 52, 0, Math.PI * 2);
    bCtx.stroke();

    bCtx.fillStyle = bGold;
    bCtx.beginPath();
    bCtx.moveTo(-25, 10);
    bCtx.lineTo(-32, -12);
    bCtx.lineTo(-12, -2);
    bCtx.lineTo(0, -22);
    bCtx.lineTo(12, -2);
    bCtx.lineTo(32, -12);
    bCtx.lineTo(25, 10);
    bCtx.closePath();
    bCtx.fill();

    bCtx.font = 'bold 36px "Cinzel", serif';
    bCtx.textAlign = 'center';
    bCtx.textBaseline = 'middle';
    bCtx.fillText('A', 0, 24);
    bCtx.restore();

    const cardBackTexture = new THREE.CanvasTexture(backCanvas);

    return { cardTexture, cardRoughnessMap, cardBackTexture };
  },

  /**
   * Generates a realistic blurred contact shadow texture for under the envelope
   */
  createContactShadowTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;

    const grad = ctx.createRadialGradient(cx, cy, 30, cx, cy, size * 0.44);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.78)');
    grad.addColorStop(0.3, 'rgba(0, 0, 0, 0.55)');
    grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.2)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, size * 0.45, size * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  },

  /**
   * Generates a procedural HDR-like equirectangular reflection map
   */
  createEnvironmentMap(renderer) {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size / 2;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#080305';
    ctx.fillRect(0, 0, size, size / 2);

    const topLight = ctx.createLinearGradient(0, 0, 0, size / 4);
    topLight.addColorStop(0, 'rgba(255, 235, 190, 0.95)');
    topLight.addColorStop(0.5, 'rgba(215, 170, 95, 0.4)');
    topLight.addColorStop(1, 'rgba(8, 3, 5, 0)');
    ctx.fillStyle = topLight;
    ctx.fillRect(0, 0, size, size / 4);

    const sideLight1 = ctx.createRadialGradient(size * 0.2, size * 0.25, 10, size * 0.2, size * 0.25, 120);
    sideLight1.addColorStop(0, 'rgba(255, 215, 130, 0.85)');
    sideLight1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sideLight1;
    ctx.fillRect(0, 0, size * 0.5, size * 0.5);

    const sideLight2 = ctx.createRadialGradient(size * 0.8, size * 0.25, 10, size * 0.8, size * 0.25, 120);
    sideLight2.addColorStop(0, 'rgba(240, 180, 100, 0.75)');
    sideLight2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sideLight2;
    ctx.fillRect(size * 0.5, 0, size * 0.5, size * 0.5);

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const renderTarget = pmremGenerator.fromEquirectangular(texture);
    pmremGenerator.dispose();

    return renderTarget.texture;
  }
};
