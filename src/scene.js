import * as THREE from 'three';

/**
 * Scene Manager: sets up renderer, lighting, sky, shadows, and environment themes
 */
export class SceneManager {
  constructor(canvasContainer) {
    this.container = canvasContainer;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2500
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });

    this.initRenderer();
    this.initLighting();
    this.initSky();
    this.setupResize();
  }

  initRenderer() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.appendChild(this.renderer.domElement);
  }

  initLighting() {
    // Hemisphere light for ambient canyon reflections
    this.hemiLight = new THREE.HemisphereLight(0xddeeff, 0x1a202c, 0.75);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    // Directional sunlight casting crisp shadows across the descent shaft
    this.dirLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    this.dirLight.position.set(30, 50, 25);
    this.dirLight.castShadow = true;

    this.dirLight.target.position.set(0, 0, 0);
    this.scene.add(this.dirLight.target);

    // Tune shadow camera bounds to cover the action space around Y=0
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 120;

    const shadowDist = 32;
    this.dirLight.shadow.camera.left = -shadowDist;
    this.dirLight.shadow.camera.right = shadowDist;
    this.dirLight.shadow.camera.top = shadowDist;
    this.dirLight.shadow.camera.bottom = -shadowDist;
    this.dirLight.shadow.bias = -0.0004;

    this.scene.add(this.dirLight);

    // Secondary fill light for under-ledge and lower chasm visibility
    this.fillLight = new THREE.DirectionalLight(0x7090b0, 0.45);
    this.fillLight.position.set(-30, 25, -20);
    this.scene.add(this.fillLight);
  }

  initSky() {
    // Deep twilight gradient backdrop
    this.scene.background = new THREE.Color(0x0e131f);
    // Linear Fog Curtain: clear near player (40m), 100% opaque at 140m to hide spawning
    this.scene.fog = new THREE.Fog(0x0e131f, 40, 140);
  }

  setTheme(themeName) {
    if (themeName === 'sunset') {
      this.scene.background.set(0x1a0f1e);
      this.scene.fog.color.set(0x1a0f1e);
      this.hemiLight.color.set(0xffa07a);
      this.hemiLight.groundColor.set(0x2a1020);
      this.dirLight.color.set(0xff7733);
      this.dirLight.intensity = 1.5;
    } else if (themeName === 'studio') {
      this.scene.background.set(0x161b26);
      this.scene.fog.color.set(0x161b26);
      this.hemiLight.color.set(0xddeeff);
      this.hemiLight.groundColor.set(0x1a202c);
      this.dirLight.color.set(0xfffaed);
      this.dirLight.intensity = 1.3;
    } else if (themeName === 'cyber') {
      this.scene.background.set(0x070b14);
      this.scene.fog.color.set(0x070b14);
      this.hemiLight.color.set(0x00ffff);
      this.hemiLight.groundColor.set(0x110022);
      this.dirLight.color.set(0x7000ff);
      this.dirLight.intensity = 1.6;
    }
  }

  setupResize() {
    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
