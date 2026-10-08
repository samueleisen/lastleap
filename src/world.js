import * as THREE from 'three';

/**
 * World: Treadmill / Stationary-Player Infinite Freefall Engine with Zero-Allocation Object Pooling.
 * - Player stays near Y = 0; vertical canyon and obstacles scroll UPWARD at fall speed.
 * - Initial cliff launch ledge scrolls upward and away once the leap starts.
 * - Looping vertical canyon shaft segments create an endless seamless descent without reallocating meshes.
 * - Pre-allocated Obstacle Pool: 14 obstacles continuously recycled at Y < -140 in the fog curtain. Zero VRAM/RAM build-up!
 * - Linear fog curtain at Y < -140 completely masks recycling.
 */
export class World {
  constructor(scene) {
    this.scene = scene;

    // Playable canyon boundary cross-section (X and Z)
    this.canyonBounds = {
      minX: -17,
      maxX: 17,
      minZ: -17,
      maxZ: 17,
    };

    // Initial platform launch bounds (offset backward by 24 behind the player)
    this.cliffBounds = {
      minX: -12,
      maxX: 12,
      minZ: -42, // -18 - 24
      maxZ: -18, // 6 - 24 (cliff edge at Z = -18)
    };

    this.spawnPosition = new THREE.Vector3(0, 1.0, -18);
    this.isFreefallActive = false;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.initMaterials();
    this.buildInitialPlatform();
    this.buildInfiniteShaft();
    this.buildObstaclePool();
  }

  initMaterials() {
    this.materials = {
      platformTop: new THREE.MeshStandardMaterial({
        color: 0x2e384d,
        roughness: 0.65,
        metalness: 0.15,
        flatShading: true,
      }),
      platformEdge: new THREE.MeshStandardMaterial({
        color: 0xf59e0b, // Amber edge indicator
        roughness: 0.4,
        emissive: 0xd97706,
        emissiveIntensity: 0.4,
        flatShading: true,
      }),
      canyonWall: new THREE.MeshStandardMaterial({
        color: 0x161c28,
        roughness: 0.85,
        metalness: 0.1,
        flatShading: true,
      }),
      wallPillar: new THREE.MeshStandardMaterial({
        color: 0x242d3d,
        roughness: 0.8,
        metalness: 0.15,
        flatShading: true,
      }),
      obstacleBody: new THREE.MeshStandardMaterial({
        color: 0x3d475a,
        roughness: 0.7,
        metalness: 0.15,
        flatShading: true,
      }),
      obstacleAccent: new THREE.MeshStandardMaterial({
        color: 0xef4444, // Red danger hazard trim
        emissive: 0x991b1b,
        emissiveIntensity: 0.5,
        roughness: 0.3,
        flatShading: true,
      }),
    };
  }

  /**
   * 1. Initial Starting Platform (Cliff Ledge at Y = 0)
   * When free-fall begins, this moves upward and away.
   */
  buildInitialPlatform() {
    this.platformGroup = new THREE.Group();

    const width = this.cliffBounds.maxX - this.cliffBounds.minX; // 24
    const length = this.cliffBounds.maxZ - this.cliffBounds.minZ; // 24
    const thickness = 2.0;
    const centerZ = (this.cliffBounds.maxZ + this.cliffBounds.minZ) / 2; // -6

    // Platform slab
    const slabGeo = new THREE.BoxGeometry(width, thickness, length);
    const slabMesh = new THREE.Mesh(slabGeo, this.materials.platformTop);
    slabMesh.position.set(0, -thickness / 2, centerZ);
    slabMesh.receiveShadow = true;
    slabMesh.castShadow = true;
    this.platformGroup.add(slabMesh);

    // Amber Leap Edge at Z = 6
    const edgeThickness = 0.25;
    const edgeDepth = 1.0;
    const edgeGeo = new THREE.BoxGeometry(width, edgeThickness, edgeDepth);
    const edgeMesh = new THREE.Mesh(edgeGeo, this.materials.platformEdge);
    edgeMesh.position.set(0, edgeThickness / 2, this.cliffBounds.maxZ - edgeDepth / 2);
    edgeMesh.receiveShadow = true;
    this.platformGroup.add(edgeMesh);

    this.group.add(this.platformGroup);
  }

  /**
   * 2. Endless Looping Vertical Canyon Shaft
   * 4 identical segments of height 60, spanning from Y = +60 to Y = -180.
   */
  buildInfiniteShaft() {
    this.shaftGroup = new THREE.Group();
    this.shaftSegments = [];
    this.numSegments = 4;
    this.segmentHeight = 60;

    for (let i = 0; i < this.numSegments; i++) {
      const segment = this.createShaftSegment(this.segmentHeight);
      // Top edge flush with Y = 0 (spans downwards only from 0 to -240)
      const initialY = -this.segmentHeight / 2 - i * this.segmentHeight;
      segment.position.y = initialY;
      this.shaftGroup.add(segment);
      this.shaftSegments.push(segment);
    }

    this.group.add(this.shaftGroup);
  }

  createShaftSegment(height) {
    const segGroup = new THREE.Group();
    const wallThickness = 3;
    const canyonWidth = 38; // from -19 to +19
    const canyonDepth = 38; // from -19 to +19

    // Left canyon wall (X = -19)
    const wallLeftGeo = new THREE.BoxGeometry(wallThickness, height, canyonDepth);
    const wallLeft = new THREE.Mesh(wallLeftGeo, this.materials.canyonWall);
    wallLeft.position.set(-canyonWidth / 2, 0, 0);
    wallLeft.receiveShadow = true;
    segGroup.add(wallLeft);

    // Right canyon wall (X = +19)
    const wallRightGeo = new THREE.BoxGeometry(wallThickness, height, canyonDepth);
    const wallRight = new THREE.Mesh(wallRightGeo, this.materials.canyonWall);
    wallRight.position.set(canyonWidth / 2, 0, 0);
    wallRight.receiveShadow = true;
    segGroup.add(wallRight);

    // Back canyon wall (Z = -19)
    const wallBackGeo = new THREE.BoxGeometry(canyonWidth, height, wallThickness);
    const wallBack = new THREE.Mesh(wallBackGeo, this.materials.canyonWall);
    wallBack.position.set(0, 0, -canyonDepth / 2);
    wallBack.receiveShadow = true;
    segGroup.add(wallBack);

    // Corner vertical pillars / buttresses for visual texture & speed reference
    const pillarGeo = new THREE.BoxGeometry(2.5, height, 2.5);

    const pillarFL = new THREE.Mesh(pillarGeo, this.materials.wallPillar);
    pillarFL.position.set(-canyonWidth / 2 + 2, 0, canyonDepth / 2 - 2);
    pillarFL.receiveShadow = true;
    segGroup.add(pillarFL);

    const pillarFR = new THREE.Mesh(pillarGeo, this.materials.wallPillar);
    pillarFR.position.set(canyonWidth / 2 - 2, 0, canyonDepth / 2 - 2);
    pillarFR.receiveShadow = true;
    segGroup.add(pillarFR);

    const pillarBL = new THREE.Mesh(pillarGeo, this.materials.wallPillar);
    pillarBL.position.set(-canyonWidth / 2 + 2, 0, -canyonDepth / 2 + 2);
    pillarBL.receiveShadow = true;
    segGroup.add(pillarBL);

    const pillarBR = new THREE.Mesh(pillarGeo, this.materials.wallPillar);
    pillarBR.position.set(canyonWidth / 2 - 2, 0, -canyonDepth / 2 + 2);
    pillarBR.receiveShadow = true;
    segGroup.add(pillarBR);

    return segGroup;
  }

  /**
   * 3. Pre-allocated Object Pool for Obstacles (Zero Allocations Mid-Game)
   * A fixed pool of 12 obstacles that are recycled indefinitely as they pass the player.
   */
  buildObstaclePool() {
    this.obstaclesGroup = new THREE.Group();
    this.obstaclePool = [];
    this.poolSize = 12;

    // 3 reusable shared geometries (allocated once, shared across all pool instances)
    this.sharedGeos = [
      new THREE.BoxGeometry(7.0, 2.4, 7.0),          // Floating square slab
      new THREE.BoxGeometry(14.0, 2.2, 3.2),         // Canyon cross-beam
      new THREE.CylinderGeometry(3.5, 3.5, 3.0, 6),  // Hexagonal rock pillar
    ];

    for (let i = 0; i < this.poolSize; i++) {
      // Pick one of the shared geometries
      const geo = this.sharedGeos[i % this.sharedGeos.length];
      const mesh = new THREE.Mesh(geo, this.materials.obstacleBody);
      mesh.receiveShadow = true;
      mesh.castShadow = true;

      // Add small hazard warning rim/stripe to the obstacle
      const trimGeo = new THREE.BoxGeometry(1.5, 0.4, 1.5);
      const trimMesh = new THREE.Mesh(trimGeo, this.materials.obstacleAccent);
      trimMesh.position.set(0, 1.4, 0);
      mesh.add(trimMesh);

      // Stagger vertically down the shaft (-40m down to -172m, 11m apart)
      const initialY = -40 - i * 11;
      mesh.position.set(
        (Math.random() - 0.5) * 20,
        initialY,
        (Math.random() - 0.5) * 20
      );
      mesh.rotation.y = Math.random() * Math.PI;

      this.obstaclesGroup.add(mesh);
      this.obstaclePool.push(mesh);
    }

    this.group.add(this.obstaclesGroup);
  }

  /**
   * Core Treadmill Update Loop:
   * Moves canyon walls, obstacles, and initial platform UPWARD at scrollSpeed.
   * Completely zero-allocation: no 'new' calls or buffer creations during gameplay.
   */
  update(dt, scrollSpeed) {
    if (scrollSpeed <= 0) return;

    this.isFreefallActive = true;

    // 1. Scroll initial platform upward until it exits view
    if (this.platformGroup.visible) {
      this.platformGroup.position.y += scrollSpeed * dt;
      if (this.platformGroup.position.y > 45) {
        this.platformGroup.visible = false;
      }
    }

    // 2. Scroll canyon shaft segments and wrap them seamlessly
    const totalShaftHeight = this.numSegments * this.segmentHeight; // 240
    for (let i = 0; i < this.shaftSegments.length; i++) {
      const segment = this.shaftSegments[i];
      segment.position.y += scrollSpeed * dt;
      // When a segment scrolls above the camera (+60), wrap it down to the bottom
      if (segment.position.y > 60) {
        segment.position.y -= totalShaftHeight;
      }
    }

    // 3. Scroll pooled obstacles upward and recycle when above view
    for (let i = 0; i < this.obstaclePool.length; i++) {
      const obs = this.obstaclePool[i];
      obs.position.y += scrollSpeed * dt;

      // When obstacle exits above player's view (+35), recycle back to bottom
      if (obs.position.y > 35) {
        // Find current lowest obstacle Y in the pool
        let lowestY = -140;
        for (let j = 0; j < this.obstaclePool.length; j++) {
          if (this.obstaclePool[j].position.y < lowestY) {
            lowestY = this.obstaclePool[j].position.y;
          }
        }
        // Place beneath the lowest obstacle (deep inside the 140m fog curtain)
        obs.position.y = lowestY - 11;
        obs.position.x = (Math.random() - 0.5) * 22;
        obs.position.z = (Math.random() - 0.5) * 22;
        obs.rotation.y = Math.random() * Math.PI;
      }
    }
  }

  isPositionOnCliff(x, z) {
    return (
      x >= this.cliffBounds.minX &&
      x <= this.cliffBounds.maxX &&
      z >= this.cliffBounds.minZ &&
      z <= this.cliffBounds.maxZ
    );
  }

  getSurfaceElevation(x, z, currentY) {
    // Only solid while initial platform is still in place and player is on it
    if (this.platformGroup.visible && this.platformGroup.position.y < 0.2) {
      if (this.isPositionOnCliff(x, z)) {
        return 0;
      }
    }
    // In free-fall treadmill
    return null;
  }

  getSpawnPosition() {
    return this.spawnPosition.clone();
  }

  reset() {
    this.isFreefallActive = false;
    this.platformGroup.visible = true;
    this.platformGroup.position.set(0, 0, 0);

    for (let i = 0; i < this.numSegments; i++) {
      this.shaftSegments[i].position.y = -this.segmentHeight / 2 - i * this.segmentHeight;
    }

    for (let i = 0; i < this.obstaclePool.length; i++) {
      this.obstaclePool[i].position.set(
        (Math.random() - 0.5) * 20,
        -40 - i * 11,
        (Math.random() - 0.5) * 20
      );
      this.obstaclePool[i].rotation.y = Math.random() * Math.PI;
    }
  }

  /**
   * Clean GPU and memory disposal (can be called when unmounting or switching level)
   */
  dispose() {
    this.scene.remove(this.group);

    // Dispose shared geometries
    if (this.sharedGeos) {
      for (const geo of this.sharedGeos) {
        geo.dispose();
      }
    }

    // Dispose materials
    for (const key in this.materials) {
      this.materials[key].dispose();
    }
  }
}
