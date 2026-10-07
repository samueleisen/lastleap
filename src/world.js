import * as THREE from 'three';

/**
 * World: Treadmill / Stationary-Player Infinite Freefall Engine.
 * - Player stays near Y = 0; the vertical canyon and wind streaks scroll UPWARD at fall speed.
 * - Initial cliff launch ledge scrolls upward and away once the leap starts.
 * - Looping vertical canyon shaft segments create an endless seamless descent.
 * - Dense fog curtain at Y < -140 masks spawning and recycling.
 * - Upward wind speed streaks give immediate visceral speed sensation.
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

    // Initial platform launch bounds
    this.cliffBounds = {
      minX: -12,
      maxX: 12,
      minZ: -18,
      maxZ: 6, // Leap edge at Z = 6
    };

    this.spawnPosition = new THREE.Vector3(0, 1.0, -6);
    this.isFreefallActive = false;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.initMaterials();
    this.buildInitialPlatform();
    this.buildInfiniteShaft();
    this.buildWindStreaks();
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
      windStreak: new THREE.MeshBasicMaterial({
        color: 0x88eeff,
        transparent: true,
        opacity: 0.45,
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
      // Stagger segments vertically: +30, -30, -90, -150
      const initialY = 30 - i * this.segmentHeight;
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
   * 3. Upward Wind Streaks (Speed Lines)
   * 50 vertical lines rushing upward past player to provide visceral speed sensation.
   */
  buildWindStreaks() {
    this.streaksGroup = new THREE.Group();
    this.streaks = [];
    const count = 55;

    for (let i = 0; i < count; i++) {
      const length = 2.5 + Math.random() * 4.0;
      const thickness = 0.08 + Math.random() * 0.08;
      const geo = new THREE.BoxGeometry(thickness, length, thickness);
      const mesh = new THREE.Mesh(geo, this.materials.windStreak);

      mesh.position.set(
        (Math.random() - 0.5) * 30,
        -120 + Math.random() * 145,
        (Math.random() - 0.5) * 30
      );

      this.streaksGroup.add(mesh);
      this.streaks.push(mesh);
    }

    this.group.add(this.streaksGroup);
  }

  /**
   * Core Treadmill Update Loop:
   * Moves canyon walls, wind streaks, and initial platform UPWARD at scrollSpeed.
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
    for (const segment of this.shaftSegments) {
      segment.position.y += scrollSpeed * dt;
      // When a segment scrolls above the camera (+60), wrap it down to the bottom
      if (segment.position.y > 60) {
        segment.position.y -= totalShaftHeight;
      }
    }

    // 3. Scroll wind streaks upward (faster than walls for intense rush)
    const streakSpeed = scrollSpeed * 1.35;
    for (const streak of this.streaks) {
      streak.position.y += streakSpeed * dt;
      if (streak.position.y > 25) {
        streak.position.y = -120 - Math.random() * 20;
        streak.position.x = (Math.random() - 0.5) * 30;
        streak.position.z = (Math.random() - 0.5) * 30;
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
      this.shaftSegments[i].position.y = 30 - i * this.segmentHeight;
    }

    for (const streak of this.streaks) {
      streak.position.set(
        (Math.random() - 0.5) * 30,
        -120 + Math.random() * 145,
        (Math.random() - 0.5) * 30
      );
    }
  }
}
