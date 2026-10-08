import * as THREE from 'three';
import { SceneManager } from './scene.js';
import { World } from './world.js';
import { Player } from './player.js';
import { CameraController } from './camera.js';
import { InputManager } from './controls.js';
import { DebugManager } from './debug.js';
import { GameManager } from './gameManager.js';
import { HUD } from './hud.js';

class GameApp {
  constructor() {
    this.container = document.getElementById('game-container');
    this.sceneManager = new SceneManager(this.container);

    // 1. Low-poly vertical world (treadmill with pooled hazards)
    this.world = new World(this.sceneManager.scene);

    // 2. Capsule player with facing direction & free-fall physics
    this.player = new Player(this.sceneManager.scene, this.world);

    // 3. Camera Controller
    this.cameraController = new CameraController(
      this.sceneManager.camera,
      this.sceneManager.renderer.domElement,
      this.player
    );

    // 4. Input Manager
    this.input = new InputManager(this.sceneManager.renderer.domElement);

    // 5. Game Manager & State Machine
    this.gameManager = new GameManager(this);

    // 6. Zero-thrash Arcade HUD
    this.hud = new HUD(this.gameManager);

    // 7. Standalone Debug Manager (disabled by default, 0 computation)
    this.debug = new DebugManager(this);

    // 8. Game Loop timing
    this.clock = new THREE.Clock();

    // Themes
    this.themes = ['studio', 'sunset', 'cyber'];
    this.currentThemeIdx = 0;

    this.setupShortcuts();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupShortcuts() {
    // Keyboard shortcuts
    this.input.onKeyCallback = (code) => {
      if (code === 'KeyC') {
        this.cameraController.toggleMode();
      } else if (code === 'KeyR' || (code === 'Space' && this.gameManager.state === 'GAME_OVER')) {
        this.gameManager.restart();
        this.input.state.jump = false;
      } else if (code === 'KeyT') {
        this.cycleTheme();
      } else if (code === 'F3' || code === 'Backquote') {
        this.debug.toggle();
      }
    };
  }

  cycleTheme() {
    this.currentThemeIdx = (this.currentThemeIdx + 1) % this.themes.length;
    const theme = this.themes[this.currentThemeIdx];
    this.sceneManager.setTheme(theme);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);
    const inputState = this.input.getState();

    // 1. Update Player and World (active motion unless crashed)
    if (this.gameManager.state !== 'GAME_OVER') {
      const cameraYaw = this.cameraController.getYaw();
      this.player.update(dt, inputState, cameraYaw);

      const scrollSpeed = this.player.getScrollSpeed();
      this.world.update(dt, scrollSpeed);
    }

    // 2. Update Game Manager (collision detection & scoring)
    this.gameManager.update(dt);

    // 3. Update Camera
    this.cameraController.update(dt);

    // 4. Render Scene
    this.sceneManager.render();

    // 5. Update Debug (early exits immediately if disabled)
    this.debug.update(dt);
  }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
