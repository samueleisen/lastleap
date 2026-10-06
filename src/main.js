import * as THREE from 'three';
import { SceneManager } from './scene.js';
import { Ground } from './ground.js';
import { Player } from './player.js';
import { CameraController } from './camera.js';
import { InputManager } from './controls.js';

class GameApp {
  constructor() {
    this.container = document.getElementById('game-container');
    this.sceneManager = new SceneManager(this.container);

    // 1. Plain square smooth ground
    this.ground = new Ground(this.sceneManager.scene, 42);

    // 2. Plain capsule shape player with facing direction
    this.player = new Player(this.sceneManager.scene, this.ground);

    // 3. Camera Controller
    this.cameraController = new CameraController(
      this.sceneManager.camera,
      this.sceneManager.renderer.domElement,
      this.player
    );

    // 4. Input Manager
    this.input = new InputManager(this.sceneManager.renderer.domElement);

    // 5. Game Loop timing
    this.clock = new THREE.Clock();

    // UI elements cache
    this.dom = {
      fps: document.getElementById('val-fps'),
      posX: document.getElementById('val-pos-x'),
      posY: document.getElementById('val-pos-y'),
      posZ: document.getElementById('val-pos-z'),
      speed: document.getElementById('val-speed'),
      heading: document.getElementById('val-heading'),
      status: document.getElementById('val-status'),
      camMode: document.getElementById('val-cam-mode'),
      btnReset: document.getElementById('btn-reset'),
      btnCamera: document.getElementById('btn-camera'),
      btnTheme: document.getElementById('btn-theme'),
      themeLabel: document.getElementById('theme-label'),
    };

    // FPS calculation
    this.frameCount = 0;
    this.lastFpsUpdate = 0;

    // Themes
    this.themes = ['studio', 'sunset', 'cyber'];
    this.currentThemeIdx = 0;

    this.setupUI();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupUI() {
    // Keyboard shortcuts handler
    this.input.onKeyCallback = (code) => {
      if (code === 'KeyC') {
        const newMode = this.cameraController.toggleMode();
        this.updateCameraUI(newMode);
      } else if (code === 'KeyR') {
        this.player.respawn();
      } else if (code === 'KeyT') {
        this.cycleTheme();
      }
    };

    // Button event listeners
    this.dom.btnReset?.addEventListener('click', () => {
      this.player.respawn();
    });

    this.dom.btnCamera?.addEventListener('click', () => {
      const newMode = this.cameraController.toggleMode();
      this.updateCameraUI(newMode);
    });

    this.dom.btnTheme?.addEventListener('click', () => {
      this.cycleTheme();
    });

    // Touch controls for mobile / tablet
    const touchButtons = document.querySelectorAll('[data-touch-cmd]');
    touchButtons.forEach((btn) => {
      const cmd = btn.getAttribute('data-touch-cmd');
      const start = (e) => {
        e.preventDefault();
        this.input.setInput(cmd, true);
      };
      const end = (e) => {
        e.preventDefault();
        this.input.setInput(cmd, false);
      };
      btn.addEventListener('touchstart', start, { passive: false });
      btn.addEventListener('touchend', end, { passive: false });
      btn.addEventListener('mousedown', start);
      btn.addEventListener('mouseup', end);
    });
  }

  updateCameraUI(mode) {
    if (this.dom.camMode) {
      this.dom.camMode.textContent =
        mode === 'third-person' ? '3rd Person' : mode === 'first-person' ? '1st Person' : 'Free Orbit';
    }
  }

  cycleTheme() {
    this.currentThemeIdx = (this.currentThemeIdx + 1) % this.themes.length;
    const theme = this.themes[this.currentThemeIdx];
    this.sceneManager.setTheme(theme);
    if (this.dom.themeLabel) {
      this.dom.themeLabel.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
    }
  }

  animate() {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);
    const inputState = this.input.getState();

    // 1. Update Player
    const cameraYaw = this.cameraController.getYaw();
    this.player.update(dt, inputState, cameraYaw);

    // 2. Update Camera
    this.cameraController.update(dt);

    // 3. Render Scene
    this.sceneManager.render();

    // 4. Update Telemetry UI
    const speed = this.player.getSpeed();
    this.updateTelemetry(dt, speed);
  }

  updateTelemetry(dt, speed) {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 400) {
      const currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      if (this.dom.fps) this.dom.fps.textContent = `${currentFps} FPS`;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    const pos = this.player.position;
    if (this.dom.posX) this.dom.posX.textContent = pos.x.toFixed(1);
    if (this.dom.posY) this.dom.posY.textContent = pos.y.toFixed(1);
    if (this.dom.posZ) this.dom.posZ.textContent = pos.z.toFixed(1);
    if (this.dom.speed) this.dom.speed.textContent = `${speed.toFixed(1)} m/s`;
    if (this.dom.heading) this.dom.heading.textContent = `${this.player.getFacingDegrees()}°`;

    if (this.dom.status) {
      if (!this.player.isGrounded) {
        this.dom.status.textContent = pos.y < 0 ? 'Falling' : 'In Air';
        this.dom.status.className = 'status-badge status-air';
      } else if (speed > 7.0) {
        this.dom.status.textContent = 'Sprinting';
        this.dom.status.className = 'status-badge status-sprint';
      } else if (speed > 0.2) {
        this.dom.status.textContent = 'Walking';
        this.dom.status.className = 'status-badge status-walk';
      } else {
        this.dom.status.textContent = 'Idle';
        this.dom.status.className = 'status-badge status-idle';
      }
    }
  }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
