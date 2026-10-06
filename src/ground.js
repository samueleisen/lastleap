import * as THREE from 'three';

/**
 * Creates the plain square smooth ground as requested:
 * "plain square smooth ground nothing added just a flat object as ground"
 */
export class Ground {
  constructor(scene, size = 40) {
    this.scene = scene;
    this.size = size;
    this.halfSize = size / 2;
    this.thickness = 0.4;
    this.mesh = null;

    this.init();
  }

  init() {
    // A clean, flat square box object (with slight thickness so edges are crisp and visible)
    const geometry = new THREE.BoxGeometry(this.size, this.thickness, this.size);

    // Smooth, clean standard material with no clutter or textures added
    const material = new THREE.MeshStandardMaterial({
      color: 0x242a38, // Sleek slate tone
      roughness: 0.65,
      metalness: 0.15,
      flatShading: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    // Position so the top surface of the ground is exactly at y = 0
    this.mesh.position.set(0, -this.thickness / 2, 0);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;

    this.scene.add(this.mesh);
  }

  /**
   * Check if a position (x, z) is currently on the square ground
   */
  isPositionOnGround(x, z) {
    return (
      x >= -this.halfSize &&
      x <= this.halfSize &&
      z >= -this.halfSize &&
      z <= this.halfSize
    );
  }

  /**
   * Surface Y coordinate of the flat ground
   */
  getSurfaceY() {
    return 0;
  }
}
