import * as THREE from 'three';

/**
 * Camera Controller supporting Third-Person Follow, First-Person, and Free Orbit
 */
export class CameraController {
  constructor(camera, domElement, player) {
    this.camera = camera;
    this.domElement = domElement;
    this.player = player;

    // Camera modes: 'third-person', 'first-person', 'free'
    this.mode = 'third-person';

    // Third-person spherical coordinates around player
    this.distance = 6.79;
    this.minDistance = 2.5;
    this.maxDistance = 16.0;

    this.yaw = 0; // horizontal angle
    this.pitch = 0.059; // vertical angle (~3.38° gives default Y = 2.0 at 6.79m distance)
    this.minPitch = -1.25; // allows tilting down to look over the cliff edge
    this.maxPitch = 1.45;

    // Follow target smoothing
    const initY = this.player ? this.player.position.y + 0.6 : 1.6;
    const initZ = this.player ? this.player.position.z : -18;
    this.targetPosition = new THREE.Vector3(0, initY, initZ);
    this.smoothTarget = new THREE.Vector3(0, initY, initZ);
    this.smoothFactor = 12.0;

    // Mouse drag state
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.sensitivity = 0.0035;

    this.setupListeners();
  }

  setupListeners() {
    // Mouse drag for rotation
    this.domElement.addEventListener('mousedown', (e) => {
      // Allow left click drag or right click drag
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === this.domElement) {
        // Pointer lock active
        this.yaw -= e.movementX * this.sensitivity;
        this.pitch += e.movementY * this.sensitivity;
        this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
      } else if (this.isDragging) {
        const deltaX = e.clientX - this.previousMousePosition.x;
        const deltaY = e.clientY - this.previousMousePosition.y;

        this.yaw -= deltaX * this.sensitivity;
        this.pitch += deltaY * this.sensitivity;
        this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));

        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    // Zoom with scroll wheel
    this.domElement.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.distance += e.deltaY * 0.005;
        this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance));
      },
      { passive: false }
    );

    // Context menu prevent so right click drag works cleanly
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    // Touch support for mobile swipe
    let touchStartX = 0;
    let touchStartY = 0;
    this.domElement.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      },
      { passive: true }
    );

    this.domElement.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length === 1) {
          const deltaX = e.touches[0].clientX - touchStartX;
          const deltaY = e.touches[0].clientY - touchStartY;
          this.yaw -= deltaX * (this.sensitivity * 1.5);
          this.pitch += deltaY * (this.sensitivity * 1.5);
          this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      },
      { passive: true }
    );
  }

  setMode(newMode) {
    this.mode = newMode;
    if (this.mode === 'first-person') {
      this.player.capsuleMesh.visible = false;
      this.player.visor.visible = false;
      this.player.nose.visible = false;
    } else {
      this.player.capsuleMesh.visible = true;
      this.player.visor.visible = true;
      this.player.nose.visible = true;
    }
  }

  toggleMode() {
    const modes = ['third-person', 'first-person', 'free'];
    const nextIdx = (modes.indexOf(this.mode) + 1) % modes.length;
    this.setMode(modes[nextIdx]);
    return this.mode;
  }

  update(dt) {
    const playerPos = this.player.position;

    if (this.mode === 'third-person') {
      // Option A: Pure Arcade Leap & Flight Transition
      if (!this.isDragging && document.pointerLockElement !== this.domElement) {
        let targetPitch = 0.059; // Cliff perch: flat looking over horizon (~3.4°)
        let targetDistance = 6.79;
        let targetFov = 60;

        if (this.player.state === 'FREEFALL') {
          if (this.player.isDiving) {
            targetPitch = 1.05;    // ~60.2° steep downward vantage
            targetDistance = 12.0; // pulled far up and back for massive overview
            targetFov = 74;        // high speed rush FOV
          } else if (this.player.isBraking) {
            targetPitch = 0.75;    // ~43.0° pulled slightly closer while braking
            targetDistance = 9.2;
            targetFov = 60;
          } else {
            targetPitch = 0.92;    // ~52.7° high top-down perspective to see down the shaft
            targetDistance = 10.5; // elevated distance ("far on top")
            targetFov = 66;
          }
        }

        // Smooth crane-up transition as player leaps into the void
        this.pitch += (targetPitch - this.pitch) * Math.min(2.5 * dt, 1);
        this.distance += (targetDistance - this.distance) * Math.min(2.2 * dt, 1);

        if (Math.abs(this.camera.fov - targetFov) > 0.05) {
          this.camera.fov += (targetFov - this.camera.fov) * Math.min(3.2 * dt, 1);
          this.camera.updateProjectionMatrix();
        }
      }

      // Focus slightly above player center
      this.targetPosition.set(playerPos.x, playerPos.y + 0.6, playerPos.z);
      this.smoothTarget.lerp(this.targetPosition, Math.min(this.smoothFactor * dt, 1));

      // Calculate camera position offset from spherical coordinates
      const horizontalDist = this.distance * Math.cos(this.pitch);
      const offsetY = this.distance * Math.sin(this.pitch);
      const offsetX = horizontalDist * Math.sin(this.yaw);
      const offsetZ = horizontalDist * Math.cos(this.yaw);

      this.camera.position.set(
        this.smoothTarget.x - offsetX,
        this.smoothTarget.y + offsetY,
        this.smoothTarget.z - offsetZ
      );

      this.camera.lookAt(this.smoothTarget);
    } else if (this.mode === 'first-person') {
      // Position at visor height
      const eyeHeight = playerPos.y + 0.42;
      this.camera.position.set(playerPos.x, eyeHeight, playerPos.z);

      // Camera looks forward based on yaw and pitch
      const lookTarget = new THREE.Vector3(
        playerPos.x + Math.sin(this.yaw) * Math.cos(this.pitch),
        eyeHeight - Math.sin(this.pitch),
        playerPos.z + Math.cos(this.yaw) * Math.cos(this.pitch)
      );
      this.camera.lookAt(lookTarget);
    } else if (this.mode === 'free') {
      // High isometric overview
      this.targetPosition.set(playerPos.x, playerPos.y, playerPos.z);
      this.smoothTarget.lerp(this.targetPosition, Math.min(this.smoothFactor * dt, 1));

      const isoDist = 14;
      this.camera.position.set(
        this.smoothTarget.x + isoDist * 0.7,
        this.smoothTarget.y + isoDist * 0.8,
        this.smoothTarget.z + isoDist * 0.7
      );
      this.camera.lookAt(this.smoothTarget);
    }
  }

  getYaw() {
    return this.yaw;
  }

  reset() {
    this.yaw = 0;
    this.pitch = 0.059;
    this.distance = 6.79;
    this.camera.fov = 60;
    this.camera.updateProjectionMatrix();

    if (this.player) {
      const initY = this.player.position.y + 0.6;
      const initZ = this.player.position.z;
      this.targetPosition.set(0, initY, initZ);
      this.smoothTarget.set(0, initY, initZ);
    }
  }
}
