import * as THREE from 'three';

/**
 * World: Clean, simplified vertical world setup.
 * Essential geometry only:
 * - High cliff launch platform at Y = 300 with clear edge line
 * - Vertical cliff wall plunging straight down into the chasm
 * - Clean flat floor at Y = 0 with a landing target zone
 */
export class World {
  constructor(scene) {
    this.scene = scene;

    this.cliffHeight = 300;
    this.floorHeight = 0;

    // Cliff platform bounds (playable launch surface)
    this.cliffBounds = {
      minX: -15,
      maxX: 15,
      minZ: -30,
      maxZ: 10, // Jump off edge at Z = 10
    };

    // Faraway floor boundaries
    this.floorBounds = {
      halfSize: 250,
    };

    this.spawnPosition = new THREE.Vector3(0, this.cliffHeight + 1.0, -10);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.initMaterials();
    this.buildCliff();
    this.buildCliffWall();
    this.buildFloor();
  }

  initMaterials() {
    this.materials = {
      cliffGround: new THREE.MeshStandardMaterial({
        color: 0x2e384d,
        roughness: 0.65,
        metalness: 0.15,
        flatShading: true,
      }),
      cliffEdge: new THREE.MeshStandardMaterial({
        color: 0xf59e0b, // Amber edge indicator
        roughness: 0.4,
        emissive: 0xd97706,
        emissiveIntensity: 0.35,
        flatShading: true,
      }),
      cliffWall: new THREE.MeshStandardMaterial({
        color: 0x1c2230,
        roughness: 0.85,
        metalness: 0.1,
        flatShading: true,
      }),
      floorGround: new THREE.MeshStandardMaterial({
        color: 0x161c28,
        roughness: 0.75,
        metalness: 0.1,
        flatShading: true,
      }),
      landingTarget: new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x0099aa,
        emissiveIntensity: 0.45,
        roughness: 0.3,
        flatShading: true,
      }),
    };
  }

  buildCliff() {
    const width = this.cliffBounds.maxX - this.cliffBounds.minX; // 30
    const length = this.cliffBounds.maxZ - this.cliffBounds.minZ; // 40
    const thickness = 2.0;
    const centerZ = (this.cliffBounds.maxZ + this.cliffBounds.minZ) / 2; // -10

    // 1. Clean cliff platform box
    const cliffGeo = new THREE.BoxGeometry(width, thickness, length);
    const cliffMesh = new THREE.Mesh(cliffGeo, this.materials.cliffGround);
    cliffMesh.position.set(0, this.cliffHeight - thickness / 2, centerZ);
    cliffMesh.receiveShadow = true;
    cliffMesh.castShadow = true;
    this.group.add(cliffMesh);

    // 2. Clear edge strip at the precipice (Z = 10)
    const edgeThickness = 0.25;
    const edgeDepth = 1.0;
    const edgeGeo = new THREE.BoxGeometry(width, edgeThickness, edgeDepth);
    const edgeMesh = new THREE.Mesh(edgeGeo, this.materials.cliffEdge);
    edgeMesh.position.set(0, this.cliffHeight + edgeThickness / 2, this.cliffBounds.maxZ - edgeDepth / 2);
    edgeMesh.receiveShadow = true;
    this.group.add(edgeMesh);
  }

  buildCliffWall() {
    // Clean vertical cliff wall beneath the platform plunging straight to the floor
    const width = (this.cliffBounds.maxX - this.cliffBounds.minX) + 10; // 40
    const height = this.cliffHeight - this.floorHeight - 2; // simple shape clip fix
    const depth = 24;

    const wallGeo = new THREE.BoxGeometry(width, height, depth);
    const wallMesh = new THREE.Mesh(wallGeo, this.materials.cliffWall);
    wallMesh.position.set(0, height / 2, this.cliffBounds.minZ + depth / 2 - 6);
    wallMesh.receiveShadow = true;
    wallMesh.castShadow = true;
    this.group.add(wallMesh);
  }

  buildFloor() {
    // 1. Clean flat floor at Y = 0
    const floorSize = this.floorBounds.halfSize * 2; // 500
    const thickness = 2.0;

    const floorGeo = new THREE.BoxGeometry(floorSize, thickness, floorSize);
    const floorMesh = new THREE.Mesh(floorGeo, this.materials.floorGround);
    floorMesh.position.set(0, this.floorHeight - thickness / 2, 0);
    floorMesh.receiveShadow = true;
    this.group.add(floorMesh);

    // 2. Clean landing target marker on the floor beneath the jump line
    const targetGeo = new THREE.CylinderGeometry(18, 18, 0.2, 32);
    const targetMesh = new THREE.Mesh(targetGeo, this.materials.landingTarget);
    targetMesh.position.set(0, this.floorHeight + 0.1, 25);
    targetMesh.receiveShadow = true;
    this.group.add(targetMesh);
  }

  isPositionOnCliff(x, z) {
    return (
      x >= this.cliffBounds.minX &&
      x <= this.cliffBounds.maxX &&
      z >= this.cliffBounds.minZ &&
      z <= this.cliffBounds.maxZ
    );
  }

  isPositionOnFloor(x, z) {
    return (
      x >= -this.floorBounds.halfSize &&
      x <= this.floorBounds.halfSize &&
      z >= -this.floorBounds.halfSize &&
      z <= this.floorBounds.halfSize
    );
  }

  getSurfaceElevation(x, z, currentY) {
    // Standing on cliff platform
    if (this.isPositionOnCliff(x, z)) {
      if (currentY >= this.cliffHeight - 2) {
        return this.cliffHeight;
      }
    }

    // Standing on the floor at bottom
    if (this.isPositionOnFloor(x, z)) {
      if (currentY <= this.floorHeight + 4) {
        return this.floorHeight;
      }
    }

    // In mid-air / free fall
    return null;
  }

  getSpawnPosition() {
    return this.spawnPosition.clone();
  }
}
