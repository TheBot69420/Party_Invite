/**
 * 3D Envelope, Wax Seal, Invitation Card, and Scene Builder
 * Uses Three.js with PBR materials, custom geometry, dynamic lighting, and particles.
 */

import { TextureGenerator } from './textures.js';

export class EnvelopeScene {
  constructor(container) {
    this.container = container;
    this.width = container.clientWidth;
    this.height = container.clientHeight;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;

    // 3D Model References
    this.rootGroup = null;
    this.envelopeGroup = null;
    this.topFlapHinge = null;
    this.topFlapMesh = null;
    this.waxSealGroup = null;
    this.waxSealMesh = null;
    this.cardGroup = null;
    this.cardMesh = null;
    this.particles = null;
    this.sparkParticles = null;
    this.mouseLight = null;

    // Materials
    this.paperMaterial = null;
    this.liningMaterial = null;
    this.goldTrimMaterial = null;
    this.waxSealMaterial = null;
    this.cardFrontMaterial = null;

    // Raycasting & Interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-1000, -1000);
    this.targetRotation = { x: 0, y: 0 };
    this.isHoveringSeal = false;
    this.isHoveringCard = false;
    this.enableParallax = true;
    this.isOrbiting = false;

    this.init();
  }

  init() {
    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0306, 0.035);

    // 2. Camera setup
    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 100);
    this.camera.position.set(0, 0, 9.8);

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxDistance = 16;
    this.controls.minDistance = 4;
    this.controls.maxPolarAngle = Math.PI * 0.75;
    this.controls.minPolarAngle = Math.PI * 0.25;
    this.controls.enablePan = false;

    this.controls.addEventListener('start', () => { this.isOrbiting = true; });
    this.controls.addEventListener('end', () => { this.isOrbiting = false; });

    // 5. Procedural Textures & Environment Map
    this.envMap = TextureGenerator.createEnvironmentMap(this.renderer);
    this.scene.environment = this.envMap;

    const paperTextures = TextureGenerator.createPaperTextures();
    const liningTexture = TextureGenerator.createEnvelopeLiningTexture();
    const waxTextures = TextureGenerator.createWaxSealTextures();
    const cardTextures = TextureGenerator.createCardTexture();
    const contactShadowTexture = TextureGenerator.createContactShadowTexture();

    // 6. Materials
    this.paperMaterial = new THREE.MeshStandardMaterial({
      map: paperTextures.colorTexture,
      bumpMap: paperTextures.bumpTexture,
      bumpScale: 0.018,
      roughness: 0.82,
      metalness: 0.08,
      roughnessMap: paperTextures.bumpTexture,
      side: THREE.FrontSide
    });

    this.liningMaterial = new THREE.MeshStandardMaterial({
      map: liningTexture,
      roughness: 0.45,
      metalness: 0.35,
      side: THREE.FrontSide
    });

    this.goldTrimMaterial = new THREE.MeshStandardMaterial({
      color: 0xdfb76c,
      metalness: 0.95,
      roughness: 0.22,
      envMap: this.envMap,
      envMapIntensity: 1.2
    });

    this.waxSealMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xdbaf45,
      metalness: 0.96,
      roughness: 0.24,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
      normalMap: waxTextures.normalTexture,
      normalScale: new THREE.Vector2(1.8, 1.8),
      envMap: this.envMap,
      envMapIntensity: 1.5
    });

    const cardBackMaterial = new THREE.MeshStandardMaterial({
      map: cardTextures.cardBackTexture,
      bumpMap: paperTextures.bumpTexture,
      bumpScale: 0.015,
      roughness: 0.45,
      metalness: 0.4,
      envMap: this.envMap,
      envMapIntensity: 1.1
    });

    this.cardFrontMaterial = new THREE.MeshStandardMaterial({
      map: cardTextures.cardTexture,
      roughnessMap: cardTextures.cardRoughnessMap,
      roughness: 0.5,
      metalness: 0.55,
      envMap: this.envMap,
      envMapIntensity: 1.1
    });

    // 7. Lighting Rig
    this.setupLighting();

    // 8. Build 3D Envelope & Components
    this.buildEnvelope(contactShadowTexture);
    this.buildCard(cardBackMaterial);
    this.buildWaxSeal();
    this.buildParticles();
    this.buildSparkSystem();

    // 9. Event Listeners
    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xfff2e6, 0.7);
    this.scene.add(ambientLight);

    const keySpot = new THREE.SpotLight(0xfffae8, 3.8);
    keySpot.position.set(4, 7, 8);
    keySpot.angle = Math.PI / 4.2;
    keySpot.penumbra = 0.6;
    keySpot.decay = 1.5;
    keySpot.distance = 25;
    keySpot.castShadow = true;
    keySpot.shadow.mapSize.width = 2048;
    keySpot.shadow.mapSize.height = 2048;
    keySpot.shadow.camera.near = 2;
    keySpot.shadow.camera.far = 18;
    keySpot.shadow.bias = -0.0001;
    this.scene.add(keySpot);

    const rimLight = new THREE.DirectionalLight(0xa5c4f5, 1.2);
    rimLight.position.set(-6, 5, -5);
    this.scene.add(rimLight);

    const underFill = new THREE.DirectionalLight(0x731a29, 0.9);
    underFill.position.set(0, -6, 4);
    this.scene.add(underFill);

    this.mouseLight = new THREE.PointLight(0xffe8a3, 2.5, 9);
    this.mouseLight.position.set(0, 0, 4);
    this.scene.add(this.mouseLight);
  }

  buildEnvelope(contactShadowTexture) {
    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.envelopeGroup = new THREE.Group();
    this.rootGroup.add(this.envelopeGroup);

    const envW = 5.8;
    const envH = 3.9;
    const envD = 0.16;

    // Contact shadow underneath
    const shadowGeo = new THREE.PlaneGeometry(8.2, 4.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: contactShadowTexture,
      transparent: true,
      depthWrite: false
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.position.set(0, -envH / 2 - 0.25, -0.6);
    contactShadow.rotation.x = -Math.PI * 0.45;
    this.rootGroup.add(contactShadow);

    // 1. Back Panel
    const backGeo = new THREE.BoxGeometry(envW, envH, 0.04);
    const backMaterials = [
      this.paperMaterial,
      this.paperMaterial,
      this.paperMaterial,
      this.paperMaterial,
      this.liningMaterial,
      this.paperMaterial
    ];
    const backPanel = new THREE.Mesh(backGeo, backMaterials);
    backPanel.position.set(0, 0, -envD / 2);
    backPanel.receiveShadow = true;
    backPanel.castShadow = true;
    this.envelopeGroup.add(backPanel);

    // Gold trim border on back panel perimeter
    const trimBorderGeo = new THREE.BoxGeometry(envW + 0.06, envH + 0.06, 0.015);
    const trimBorder = new THREE.Mesh(trimBorderGeo, this.goldTrimMaterial);
    trimBorder.position.set(0, 0, -envD / 2 - 0.02);
    this.envelopeGroup.add(trimBorder);

    // 2. Left Flap
    const leftShape = new THREE.Shape();
    leftShape.moveTo(-envW / 2, -envH / 2);
    leftShape.lineTo(-envW / 2, envH / 2);
    leftShape.lineTo(0.1, 0);
    leftShape.closePath();

    const leftExtrude = new THREE.ExtrudeGeometry(leftShape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.01 });
    const leftFlap = new THREE.Mesh(leftExtrude, this.paperMaterial);
    leftFlap.position.set(0, 0, envD / 2 - 0.04);
    leftFlap.castShadow = true;
    leftFlap.receiveShadow = true;
    this.envelopeGroup.add(leftFlap);

    const leftTrimGeo = new THREE.CylinderGeometry(0.018, 0.018, Math.hypot(envW/2 + 0.1, envH/2), 8);
    const leftTrim = new THREE.Mesh(leftTrimGeo, this.goldTrimMaterial);
    leftTrim.position.set((-envW/2 + 0.1)/2, envH/4, envD / 2 - 0.02);
    leftTrim.rotation.z = Math.atan2(-envH/2, envW/2 + 0.1) + Math.PI/2;
    this.envelopeGroup.add(leftTrim);

    // 3. Right Flap
    const rightShape = new THREE.Shape();
    rightShape.moveTo(envW / 2, -envH / 2);
    rightShape.lineTo(envW / 2, envH / 2);
    rightShape.lineTo(-0.1, 0);
    rightShape.closePath();

    const rightExtrude = new THREE.ExtrudeGeometry(rightShape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.01 });
    const rightFlap = new THREE.Mesh(rightExtrude, this.paperMaterial);
    rightFlap.position.set(0, 0, envD / 2 - 0.035);
    rightFlap.castShadow = true;
    rightFlap.receiveShadow = true;
    this.envelopeGroup.add(rightFlap);

    const rightTrimGeo = new THREE.CylinderGeometry(0.018, 0.018, Math.hypot(envW/2 + 0.1, envH/2), 8);
    const rightTrim = new THREE.Mesh(rightTrimGeo, this.goldTrimMaterial);
    rightTrim.position.set((envW/2 - 0.1)/2, envH/4, envD / 2 - 0.015);
    rightTrim.rotation.z = -Math.atan2(-envH/2, envW/2 + 0.1) - Math.PI/2;
    this.envelopeGroup.add(rightTrim);

    // 4. Bottom Flap
    const bottomShape = new THREE.Shape();
    bottomShape.moveTo(-envW / 2, -envH / 2);
    bottomShape.lineTo(envW / 2, -envH / 2);
    bottomShape.lineTo(0, 0.4);
    bottomShape.closePath();

    const bottomExtrude = new THREE.ExtrudeGeometry(bottomShape, { depth: 0.025, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.015 });
    const bottomFlap = new THREE.Mesh(bottomExtrude, this.paperMaterial);
    bottomFlap.position.set(0, 0, envD / 2 - 0.01);
    bottomFlap.castShadow = true;
    bottomFlap.receiveShadow = true;
    this.envelopeGroup.add(bottomFlap);

    const botTrimLen = Math.hypot(envW/2, 0.4 + envH/2);
    const botTrimGeo = new THREE.CylinderGeometry(0.02, 0.02, botTrimLen, 8);

    const bTrimL = new THREE.Mesh(botTrimGeo, this.goldTrimMaterial);
    bTrimL.position.set(-envW / 4, (-envH / 2 + 0.4) / 2, envD / 2 + 0.02);
    bTrimL.rotation.z = Math.atan2(0.4 + envH/2, envW/2) - Math.PI/2;
    this.envelopeGroup.add(bTrimL);

    const bTrimR = new THREE.Mesh(botTrimGeo, this.goldTrimMaterial);
    bTrimR.position.set(envW / 4, (-envH / 2 + 0.4) / 2, envD / 2 + 0.02);
    bTrimR.rotation.z = -Math.atan2(0.4 + envH/2, envW/2) + Math.PI/2;
    this.envelopeGroup.add(bTrimR);

    // 5. Top Flap HINGE & Geometry (Rotates -180deg backward on X-axis)
    this.topFlapHinge = new THREE.Group();
    this.topFlapHinge.position.set(0, envH / 2, envD / 2 + 0.01);
    this.envelopeGroup.add(this.topFlapHinge);

    const flapApexY = -2.35;
    const flapShape = new THREE.Shape();
    flapShape.moveTo(-envW / 2, 0);
    flapShape.lineTo(envW / 2, 0);
    flapShape.lineTo(0, flapApexY);
    flapShape.closePath();

    const flapGeo = new THREE.ExtrudeGeometry(flapShape, {
      depth: 0.025,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.01
    });

    this.topFlapMesh = new THREE.Mesh(flapGeo, this.paperMaterial);
    this.topFlapMesh.castShadow = true;
    this.topFlapMesh.receiveShadow = true;
    this.topFlapHinge.add(this.topFlapMesh);

    // Interior lining on the back side of top flap
    const liningShape = new THREE.Shape();
    liningShape.moveTo(-envW / 2 + 0.12, -0.05);
    liningShape.lineTo(envW / 2 - 0.12, -0.05);
    liningShape.lineTo(0, flapApexY + 0.16);
    liningShape.closePath();

    const liningGeo = new THREE.ShapeGeometry(liningShape);
    const flapLining = new THREE.Mesh(liningGeo, this.liningMaterial);
    flapLining.position.set(0, 0, -0.005);
    flapLining.rotation.y = Math.PI;
    this.topFlapHinge.add(flapLining);

    // Top Flap Gold Trim
    const flapTrimLen = Math.hypot(envW / 2, -flapApexY);
    const flapTrimGeo = new THREE.CylinderGeometry(0.022, 0.022, flapTrimLen, 8);

    const fTrimL = new THREE.Mesh(flapTrimGeo, this.goldTrimMaterial);
    fTrimL.position.set(-envW / 4, flapApexY / 2, 0.035);
    fTrimL.rotation.z = -Math.atan2(-flapApexY, envW / 2) + Math.PI / 2;
    this.topFlapHinge.add(fTrimL);

    const fTrimR = new THREE.Mesh(flapTrimGeo, this.goldTrimMaterial);
    fTrimR.position.set(envW / 4, flapApexY / 2, 0.035);
    fTrimR.rotation.z = Math.atan2(-flapApexY, envW / 2) - Math.PI / 2;
    this.topFlapHinge.add(fTrimR);
  }

  buildWaxSeal() {
    this.waxSealGroup = new THREE.Group();
    const flapApexY = -2.35;
    this.waxSealGroup.position.set(0, flapApexY + 0.28, 0.055);
    this.topFlapHinge.add(this.waxSealGroup);

    // 1. Organic molten wax base
    const sealRadius = 0.58;
    const sealShape = new THREE.Shape();
    const segments = 40;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const r = sealRadius + Math.sin(angle * 7) * 0.035 + Math.cos(angle * 11) * 0.022 + Math.sin(angle * 3) * 0.04;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) sealShape.moveTo(px, py);
      else sealShape.lineTo(px, py);
    }
    sealShape.closePath();

    const waxBaseGeo = new THREE.ExtrudeGeometry(sealShape, {
      depth: 0.065,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 4
    });

    this.waxSealMesh = new THREE.Mesh(waxBaseGeo, this.waxSealMaterial);
    this.waxSealMesh.castShadow = true;
    this.waxSealMesh.receiveShadow = true;
    this.waxSealMesh.userData = { isWaxSeal: true };
    this.waxSealGroup.add(this.waxSealMesh);

    // 2. Beveled inner medallion ring
    const ringGeo = new THREE.TorusGeometry(0.38, 0.03, 16, 48);
    const ringMesh = new THREE.Mesh(ringGeo, this.goldTrimMaterial);
    ringMesh.position.set(0, 0, 0.085);
    this.waxSealGroup.add(ringMesh);

    // 3. Central embossed seal face
    const centerGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.04, 32);
    centerGeo.rotateX(Math.PI / 2);
    const centerMesh = new THREE.Mesh(centerGeo, this.waxSealMaterial);
    centerMesh.position.set(0, 0, 0.07);
    this.waxSealGroup.add(centerMesh);

    // 4. Subtle pulsating interactive glow halo
    const glowGeo = new THREE.RingGeometry(0.55, 0.85, 32);
    this.sealGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffd970,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.sealGlowMesh = new THREE.Mesh(glowGeo, this.sealGlowMat);
    this.sealGlowMesh.position.set(0, 0, 0.01);
    this.waxSealGroup.add(this.sealGlowMesh);
  }

  buildCard(cardBackMaterial) {
    this.cardGroup = new THREE.Group();
    // Tucked strictly inside the envelope boundaries (bottom at -1.85, top at +1.55)
    this.cardGroup.position.set(0, -0.15, 0.015);
    this.envelopeGroup.add(this.cardGroup);

    const cardW = 5.0;
    const cardH = 3.4;
    const cardThick = 0.02;

    const cardGeo = new THREE.BoxGeometry(cardW, cardH, cardThick);
    const cardMaterials = [
      this.goldTrimMaterial, // right edge
      this.goldTrimMaterial, // left edge
      this.goldTrimMaterial, // top edge
      this.goldTrimMaterial, // bottom edge
      this.cardFrontMaterial, // front face (luxurious gold invitation)
      cardBackMaterial        // back face
    ];

    this.cardMesh = new THREE.Mesh(cardGeo, cardMaterials);
    this.cardMesh.castShadow = true;
    this.cardMesh.receiveShadow = true;
    this.cardMesh.userData = { isCard: true };
    this.cardGroup.add(this.cardMesh);
  }

  buildParticles() {
    const count = 160;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 1;

      speeds[i * 3] = (Math.random() - 0.5) * 0.003;
      speeds[i * 3 + 1] = Math.random() * 0.004 + 0.001;
      speeds[i * 3 + 2] = (Math.random() - 0.5) * 0.003;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const pCanvas = document.createElement('canvas');
    pCanvas.width = 64;
    pCanvas.height = 64;
    const pCtx = pCanvas.getContext('2d');
    const grad = pCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 235, 170, 1.0)');
    grad.addColorStop(0.3, 'rgba(215, 175, 75, 0.6)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    pCtx.fillStyle = grad;
    pCtx.fillRect(0, 0, 64, 64);
    const pTex = new THREE.CanvasTexture(pCanvas);

    const mat = new THREE.PointsMaterial({
      size: 0.18,
      map: pTex,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(geo, mat);
    this.particles.userData = { speeds, count };
    this.scene.add(this.particles);
  }

  buildSparkSystem() {
    const count = 45;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.08 + 0.03;
      velocities[i * 3] = Math.cos(angle) * speed;
      velocities[i * 3 + 1] = Math.sin(angle) * speed + 0.02;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.05 + 0.03;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.12,
      color: 0xffe285,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.sparkParticles = new THREE.Points(geo, mat);
    this.sparkParticles.userData = { velocities, count, active: false, life: 0 };
    this.topFlapHinge.add(this.sparkParticles);
  }

  triggerSparks() {
    if (!this.sparkParticles) return;
    const pos = this.sparkParticles.geometry.attributes.position.array;
    const flapApexY = -2.35;

    for (let i = 0; i < this.sparkParticles.userData.count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 0.2;
      pos[i * 3 + 1] = flapApexY + 0.28 + (Math.random() - 0.5) * 0.2;
      pos[i * 3 + 2] = 0.1;
    }
    this.sparkParticles.geometry.attributes.position.needsUpdate = true;
    this.sparkParticles.material.opacity = 1.0;
    this.sparkParticles.userData.active = true;
    this.sparkParticles.userData.life = 1.0;
  }

  onResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  onMouseMove(e) {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / this.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / this.height) * 2 + 1;

    if (this.mouseLight) {
      this.mouseLight.position.x = this.mouse.x * 4.5;
      this.mouseLight.position.y = this.mouse.y * 3.5;
      this.mouseLight.position.z = 4.2;
    }

    if (this.enableParallax && !this.isOrbiting) {
      this.targetRotation.x = -this.mouse.y * 0.18;
      this.targetRotation.y = this.mouse.x * 0.26;
    }
  }

  update(delta, elapsed) {
    this.controls.update();

    const camDist = this.camera.position.distanceTo(this.controls.target);
    if (this.enableParallax && this.rootGroup && !this.isOrbiting && camDist > 7) {
      this.rootGroup.rotation.x += (this.targetRotation.x - this.rootGroup.rotation.x) * 0.05;
      this.rootGroup.rotation.y += (this.targetRotation.y - this.rootGroup.rotation.y) * 0.05;
    }

    if (this.particles) {
      const pos = this.particles.geometry.attributes.position.array;
      const speeds = this.particles.userData.speeds;
      const count = this.particles.userData.count;

      for (let i = 0; i < count; i++) {
        pos[i * 3] += speeds[i * 3] + Math.sin(elapsed * 0.8 + i) * 0.002;
        pos[i * 3 + 1] += speeds[i * 3 + 1];
        pos[i * 3 + 2] += speeds[i * 3 + 2];

        if (pos[i * 3 + 1] > 6) pos[i * 3 + 1] = -6;
        if (pos[i * 3] > 8) pos[i * 3] = -8;
        if (pos[i * 3] < -8) pos[i * 3] = 8;
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }

    if (this.sparkParticles && this.sparkParticles.userData.active) {
      const pos = this.sparkParticles.geometry.attributes.position.array;
      const vel = this.sparkParticles.userData.velocities;
      const count = this.sparkParticles.userData.count;

      for (let i = 0; i < count; i++) {
        pos[i * 3] += vel[i * 3];
        pos[i * 3 + 1] += vel[i * 3 + 1];
        pos[i * 3 + 2] += vel[i * 3 + 2];
        vel[i * 3 + 1] -= 0.0015;
      }
      this.sparkParticles.geometry.attributes.position.needsUpdate = true;

      this.sparkParticles.userData.life -= delta * 1.6;
      this.sparkParticles.material.opacity = Math.max(0, this.sparkParticles.userData.life);
      if (this.sparkParticles.userData.life <= 0) {
        this.sparkParticles.userData.active = false;
      }
    }

    if (this.waxSealGroup && this.sealGlowMesh) {
      if (this.isHoveringSeal) {
        const pulse = 1.0 + Math.sin(elapsed * 8) * 0.08;
        this.waxSealGroup.scale.set(pulse, pulse, pulse);
        this.sealGlowMat.opacity = 0.4 + Math.sin(elapsed * 8) * 0.25;
      } else {
        this.sealGlowMat.opacity = 0;
      }
    }

    this.checkRaycast();
    this.renderer.render(this.scene, this.camera);
  }

  checkRaycast() {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.waxSealGroup && this.waxSealGroup.parent) {
      const sealIntersects = this.raycaster.intersectObjects(this.waxSealGroup.children, true);
      this.isHoveringSeal = sealIntersects.length > 0;
    } else {
      this.isHoveringSeal = false;
    }

    if (this.cardGroup) {
      const cardIntersects = this.raycaster.intersectObjects(this.cardGroup.children, true);
      this.isHoveringCard = cardIntersects.length > 0;
    } else {
      this.isHoveringCard = false;
    }
  }

  raycastPoint(clientX, clientY) {
    const rect = this.container.getBoundingClientRect();
    const x = ((clientX - rect.left) / this.width) * 2 - 1;
    const y = -((clientY - rect.top) / this.height) * 2 + 1;
    const pointRaycaster = new THREE.Raycaster();
    pointRaycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    let hitSeal = false;
    let hitCard = false;

    if (this.waxSealGroup) {
      hitSeal = pointRaycaster.intersectObjects(this.waxSealGroup.children, true).length > 0;
    }
    if (this.cardGroup) {
      hitCard = pointRaycaster.intersectObjects(this.cardGroup.children, true).length > 0;
    }

    return { hitSeal, hitCard };
  }
}
