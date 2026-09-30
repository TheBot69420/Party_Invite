/**
 * Animation Controller for 3D Envelope Interactions
 * Uses GSAP for smooth choreography, paper physics easing, and camera transitions.
 */

import { sound } from './audio.js';

export const STATES = {
  SEALED: 'SEALED',
  OPENING: 'OPENING',
  OPEN: 'OPEN',
  INSPECTING: 'INSPECTING',
  CLOSING: 'CLOSING'
};

export class AnimationController {
  constructor(sceneInstance, uiCallbacks) {
    this.env = sceneInstance;
    this.ui = uiCallbacks || {};
    this.state = STATES.SEALED;

    this.cardFloatTween = null;
    this.defaultCamPos = { x: 0, y: 0, z: 9.8 };
    this.openCamPos = { x: 0, y: 0.6, z: 9.4 };
    this.inspectCamPos = { x: 0, y: 2.05, z: 5.6 };
  }

  isInteractive() {
    return this.state === STATES.SEALED || this.state === STATES.OPEN || this.state === STATES.INSPECTING;
  }

  /**
   * Wax Seal Click Trigger: Opens the envelope and elevates the card
   */
  openEnvelope() {
    if (this.state !== STATES.SEALED) return;
    this.state = STATES.OPENING;

    if (this.ui.onStateChange) this.ui.onStateChange(this.state);

    const tl = gsap.timeline({
      onComplete: () => {
        this.state = STATES.OPEN;
        if (this.ui.onStateChange) this.ui.onStateChange(this.state);
        this.startCardFloating();
      }
    });

    // --- PHASE A: Seal Break & Spark Burst ---
    sound.playWaxSnap();
    this.env.triggerSparks();

    tl.to(this.env.waxSealGroup.scale, {
      x: 1.25,
      y: 1.25,
      z: 1.25,
      duration: 0.18,
      ease: 'back.out(2)'
    }, 0);

    tl.to(this.env.waxSealGroup.position, {
      z: 0.18,
      duration: 0.22,
      ease: 'power2.out'
    }, 0);

    tl.to(this.env.waxSealGroup.rotation, {
      z: -0.15,
      duration: 0.25,
      ease: 'power1.out'
    }, 0);

    tl.to(this.env.waxSealGroup.scale, {
      x: 1.0,
      y: 1.0,
      z: 1.0,
      duration: 0.3,
      ease: 'power2.inOut'
    }, 0.22);

    // --- PHASE B: Flap Opens ---
    tl.call(() => sound.playPaperRustle(1.2), null, 0.25);

    tl.to(this.env.topFlapHinge.rotation, {
      x: -Math.PI + 0.05,
      duration: 1.35,
      ease: 'power2.inOut'
    }, 0.28);

    tl.to(this.env.camera.position, {
      x: this.openCamPos.x,
      y: this.openCamPos.y,
      z: this.openCamPos.z,
      duration: 1.4,
      ease: 'power2.out'
    }, 0.3);

    // --- PHASE C: The Card Rises ---
    tl.call(() => sound.playCardSlide(), null, 0.75);

    tl.to(this.env.cardGroup.position, {
      y: 2.05,
      duration: 1.35,
      ease: 'power2.out'
    }, 0.75);

    tl.to(this.env.cardGroup.position, {
      z: 0.38,
      duration: 1.1,
      ease: 'power1.inOut'
    }, 0.95);

    tl.to(this.env.cardGroup.rotation, {
      x: -0.05,
      duration: 1.0,
      ease: 'power2.out'
    }, 0.9);

    return tl;
  }

  /**
   * Gentle continuous floating bounce for elevated card
   */
  startCardFloating() {
    if (this.cardFloatTween) this.cardFloatTween.kill();

    this.cardFloatTween = gsap.timeline({ repeat: -1, yoyo: true });
    this.cardFloatTween.to(this.env.cardGroup.position, {
      y: 2.18,
      duration: 2.4,
      ease: 'sine.inOut'
    });
    this.cardFloatTween.to(this.env.cardGroup.rotation, {
      x: -0.03,
      z: 0.012,
      duration: 2.8,
      ease: 'sine.inOut'
    }, 0);
  }

  stopCardFloating() {
    if (this.cardFloatTween) {
      this.cardFloatTween.kill();
      this.cardFloatTween = null;
    }
  }

  /**
   * Inspect Card: Camera zooms smoothly right in front of the invitation card
   */
  inspectCard() {
    if (this.state !== STATES.OPEN) return;
    this.state = STATES.INSPECTING;
    this.stopCardFloating();

    if (this.ui.onStateChange) this.ui.onStateChange(this.state);

    const tl = gsap.timeline();

    this.env.enableParallax = false;

    tl.to(this.env.cardGroup.rotation, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.8,
      ease: 'power2.out'
    }, 0);

    tl.to(this.env.camera.position, {
      x: this.inspectCamPos.x,
      y: this.inspectCamPos.y,
      z: this.inspectCamPos.z,
      duration: 1.1,
      ease: 'power2.inOut'
    }, 0);

    tl.to(this.env.controls.target, {
      x: 0,
      y: 2.05,
      z: 0.38,
      duration: 1.1,
      ease: 'power2.inOut'
    }, 0);

    return tl;
  }

  /**
   * Exit inspection: returns camera back to normal open overview
   */
  exitInspect() {
    if (this.state !== STATES.INSPECTING) return;

    const tl = gsap.timeline({
      onComplete: () => {
        this.state = STATES.OPEN;
        this.env.enableParallax = true;
        if (this.ui.onStateChange) this.ui.onStateChange(this.state);
        this.startCardFloating();
      }
    });

    tl.to(this.env.camera.position, {
      x: this.openCamPos.x,
      y: this.openCamPos.y,
      z: this.openCamPos.z,
      duration: 0.9,
      ease: 'power2.inOut'
    }, 0);

    tl.to(this.env.controls.target, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.9,
      ease: 'power2.inOut'
    }, 0);

    return tl;
  }

  /**
   * Re-seal Envelope: folds card back into pocket, flap folds down, wax seal locks
   */
  resealEnvelope() {
    if (this.state !== STATES.OPEN && this.state !== STATES.INSPECTING) return;

    this.stopCardFloating();
    this.state = STATES.CLOSING;
    if (this.ui.onStateChange) this.ui.onStateChange(this.state);

    const tl = gsap.timeline({
      onComplete: () => {
        this.state = STATES.SEALED;
        this.env.enableParallax = true;
        if (this.ui.onStateChange) this.ui.onStateChange(this.state);
      }
    });

    tl.to(this.env.controls.target, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.7,
      ease: 'power2.out'
    }, 0);

    tl.to(this.env.camera.position, {
      x: this.defaultCamPos.x,
      y: this.defaultCamPos.y,
      z: this.defaultCamPos.z,
      duration: 1.1,
      ease: 'power2.out'
    }, 0);

    tl.call(() => sound.playCardSlide(), null, 0.1);

    tl.to(this.env.cardGroup.rotation, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.5,
      ease: 'power1.out'
    }, 0);

    tl.to(this.env.cardGroup.position, {
      z: 0.015,
      duration: 0.6,
      ease: 'power1.inOut'
    }, 0.1);

    tl.to(this.env.cardGroup.position, {
      y: -0.15,
      duration: 0.95,
      ease: 'power2.in'
    }, 0.1);

    tl.call(() => sound.playPaperRustle(0.9), null, 0.65);

    tl.to(this.env.topFlapHinge.rotation, {
      x: 0,
      duration: 1.0,
      ease: 'power2.inOut'
    }, 0.7);

    tl.call(() => sound.playWaxSnap(), null, 1.45);

    tl.to(this.env.waxSealGroup.position, {
      z: 0.055,
      duration: 0.25,
      ease: 'back.out(2)'
    }, 1.45);

    tl.to(this.env.waxSealGroup.rotation, {
      z: 0,
      duration: 0.25,
      ease: 'power2.out'
    }, 1.45);

    return tl;
  }

  resetView() {
    gsap.to(this.env.camera.position, {
      x: this.state === STATES.SEALED ? this.defaultCamPos.x : this.openCamPos.x,
      y: this.state === STATES.SEALED ? this.defaultCamPos.y : this.openCamPos.y,
      z: this.state === STATES.SEALED ? this.defaultCamPos.z : this.openCamPos.z,
      duration: 0.8,
      ease: 'power2.out'
    });
    gsap.to(this.env.controls.target, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.8,
      ease: 'power2.out'
    });
    if (this.env.rootGroup) {
      gsap.to(this.env.rootGroup.rotation, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.8,
        ease: 'power2.out'
      });
    }
  }
}
