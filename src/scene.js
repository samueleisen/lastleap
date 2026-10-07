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
    // Hemisphere light for soft ambient sky/ground reflections across vertical span
    this.hemiLight = new THREE.HemisphereLight(0xddeeff, 0x1a202c, 0.75);
    this.hemiLight.position.set(0, 350, 0);
    this.scene.add(this.hemiLight);

    // Directional sunlight positioned high to illuminate cliff face and ledge
    this.dirLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    this.dirLight.position.set(50, 390, 40);
    this.dirLight.castShadow = true;

    // Direct shadow camera toward cliff launch pad
    this.dirLight.target.position.set(0, 300, -10);
    this.scene.add(this.dirLight.target);

    // Tune shadow bounds to cover the cliff platform crisply
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 200;

    const shadowDist = 45;
    this.dirLight.shadow.camera.left = -shadowDist;
    this.dirLight.shadow.camera.right = shadowDist;
    this.dirLight.shadow.camera.top = shadowDist;
    this.dirLight.shadow.camera.bottom = -shadowDist;
    this.dirLight.shadow.bias = -0.0004;

    this.scene.add(this.dirLight);

    // Secondary fill light for under-ledge and lower chasm visibility
    this.fillLight = new THREE.DirectionalLight(0x7090b0, 0.45);
    this.fillLight.position.set(-60, 200, -30);
    this.scene.add(this.fillLight);
  }

  initSky() {
    // Sophisticated deep twilight gradient backdrop
    this.scene.background = new THREE.Color(0x0e131f);
    // Atmospheric fog calibrated so chasm floor is mystically visible 300m below
    this.scene.fog = new THREE.FogExp2(0x0e131f, 0.0028);
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
