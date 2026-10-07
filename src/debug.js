/**
 * Standalone Debug Segment
 * Deactivated by default. Does zero computation and zero DOM updates when disabled.
 */
export class DebugManager {
  constructor(game) {
    this.game = game;
    this.enabled = false;
    this.domElement = null;

    // FPS calculation
    this.frameCount = 0;
    this.lastFpsUpdate = 0;
    this.currentFps = 60;
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.mount();
    } else {
      this.unmount();
    }
    return this.enabled;
  }

  mount() {
    if (!this.domElement) {
      this.domElement = document.createElement('div');
      this.domElement.id = 'debug-overlay';
      document.body.appendChild(this.domElement);
    }
    this.domElement.style.display = 'block';
  }

  unmount() {
    if (this.domElement) {
      this.domElement.style.display = 'none';
    }
  }

  update(dt) {
    // Early exit if disabled to save all computation and DOM work
    if (!this.enabled || !this.domElement) return;

    // Calculate FPS
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 300) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    const player = this.game.player;
    const pos = player.position;
    const speed = player.getSpeed();
    const heading = player.getFacingDegrees();
    const isGrounded = player.isGrounded;

    let state = player.state || 'Idle';
    if (state === 'FREEFALL') {
      if (player.isDiving) state = 'Freefall (Diving)';
      else if (player.isBraking) state = 'Freefall (Braking)';
      else state = 'Freefall (Glide)';
    } else {
      if (speed > 7.0) state = 'Platform Sprint';
      else if (speed > 0.2) state = 'Platform Walk';
      else state = 'Platform Ready';
    }

    const camMode = this.game.cameraController.mode;
    const theme = this.game.themes[this.game.currentThemeIdx];

    this.domElement.innerHTML = `
<div class="dbg-title">DEBUG OVERLAY <span class="dbg-fps">${this.currentFps} FPS</span></div>
<div class="dbg-row"><span>Distance Fallen</span><span>${player.fallDistance.toFixed(0)} m</span></div>
<div class="dbg-row"><span>Fall Speed</span><span>${player.getScrollSpeed().toFixed(1)} m/s</span></div>
<div class="dbg-row"><span>Horiz Speed</span><span>${speed.toFixed(1)} m/s</span></div>
<div class="dbg-row"><span>Lateral Pos</span><span>(${pos.x.toFixed(1)}, ${pos.z.toFixed(1)})</span></div>
<div class="dbg-row"><span>Heading</span><span>${heading}°</span></div>
<div class="dbg-row"><span>State</span><span>${state}</span></div>
<div class="dbg-row"><span>Grounded</span><span>${isGrounded ? 'YES' : 'NO'}</span></div>
<div class="dbg-row"><span>Camera</span><span>${camMode}</span></div>
<div class="dbg-row"><span>Theme</span><span>${theme}</span></div>
<div class="dbg-footer">[F3] or [~] Toggle | [T] Theme | [C] Camera | [R] Respawn</div>
    `.trim();
  }
}
