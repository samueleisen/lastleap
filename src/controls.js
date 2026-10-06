/**
 * Input controller for Keyboard, Mouse, and Touch
 */
export class InputManager {
  constructor(domElement) {
    this.domElement = domElement;

    this.state = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jump: false,
    };

    this.onKeyCallback = null;

    this.setupKeyboard();
    this.setupPointerLock();
  }

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.handleKey(e.code, true);

      if (this.onKeyCallback) {
        this.onKeyCallback(e.code);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.handleKey(e.code, false);
    });

    // Reset keys if window loses focus
    window.addEventListener('blur', () => {
      for (const key in this.state) {
        this.state[key] = false;
      }
    });
  }

  handleKey(code, isPressed) {
    switch (code) {
      case 'KeyW':
      case 'ArrowUp':
        this.state.forward = isPressed;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.state.backward = isPressed;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.state.left = isPressed;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.state.right = isPressed;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.state.sprint = isPressed;
        break;
      case 'Space':
        this.state.jump = isPressed;
        break;
    }
  }

  setupPointerLock() {
    // Double click to request pointer lock (immersive camera)
    this.domElement.addEventListener('dblclick', () => {
      if (document.pointerLockElement !== this.domElement) {
        this.domElement.requestPointerLock?.();
      }
    });
  }

  setInput(key, value) {
    if (this.state.hasOwnProperty(key)) {
      this.state[key] = value;
    }
  }

  getState() {
    return this.state;
  }
}
