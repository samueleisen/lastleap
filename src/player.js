import * as THREE from 'three';

/**
 * Plain capsule shaped player with clear facing direction indicator
 * "plain capsule shape player with facing direction"
 */
export class Player {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;

    // Capsule dimensions
    this.radius = 0.45;
    this.length = 1.1; // cylindrical section height
    this.height = this.length + this.radius * 2; // total height = 2.0
    this.halfHeight = this.height / 2; // 1.0

    // Physics & Movement properties
    const spawn = this.world?.getSpawnPosition ? this.world.getSpawnPosition() : new THREE.Vector3(0, 1.0, 0);
    this.position = spawn.clone();
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.facingAngle = 0; // rotation around Y axis (radians), 0 = facing +Z
    this.targetFacingAngle = 0;

    this.walkSpeed = 6.0;
    this.sprintSpeed = 10.0;
    this.acceleration = 35.0;
    this.friction = 12.0;
    this.turnSpeed = 14.0;

    this.jumpForce = 8.5;
    this.gravity = -24.0;
    this.isGrounded = true;

    // Container group
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.initMesh();
  }

  initMesh() {
    // 1. Plain Capsule Mesh
    const capsuleGeometry = new THREE.CapsuleGeometry(
      this.radius,
      this.length,
      16,
      32
    );

    // Smooth sleek material for the capsule body
    const capsuleMaterial = new THREE.MeshStandardMaterial({
      color: 0x4f8cff, // Crisp vibrant cobalt/azure
      roughness: 0.35,
      metalness: 0.2,
      flatShading: false,
    });

    this.capsuleMesh = new THREE.Mesh(capsuleGeometry, capsuleMaterial);
    this.capsuleMesh.castShadow = true;
    this.capsuleMesh.receiveShadow = true;
    this.group.add(this.capsuleMesh);

    // 2. Facing Direction Indicators:
    // A. Front Visor (embedded on the upper front of the capsule)
    const visorWidth = this.radius * 1.25;
    const visorHeight = 0.22;
    const visorDepth = 0.18;
    const visorGeo = new THREE.BoxGeometry(visorWidth, visorHeight, visorDepth);
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x00ffcc, // Electric cyan visor
      emissive: 0x00ccaa,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.5,
    });
    this.visor = new THREE.Mesh(visorGeo, visorMat);
    // Positioned at head height, facing forward (+Z direction)
    this.visor.position.set(0, 0.42, this.radius * 0.85);
    this.visor.castShadow = true;
    this.group.add(this.visor);

    // B. Forward Arrow / Nose Pointer pointing towards +Z (forward)
    const noseGeo = new THREE.ConeGeometry(0.12, 0.35, 16);
    noseGeo.rotateX(Math.PI / 2); // Point along +Z
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x88eeff,
      emissiveIntensity: 0.4,
      roughness: 0.3,
    });
    this.nose = new THREE.Mesh(noseGeo, noseMat);
    this.nose.position.set(0, 0.42, this.radius + 0.12);
    this.nose.castShadow = true;
    this.group.add(this.nose);

    // C. Ground Directional Heading Ring / Chevron
    const headingGroup = new THREE.Group();
    headingGroup.position.set(0, -this.halfHeight + 0.02, 0);

    // Subtle heading circle
    const ringGeo = new THREE.RingGeometry(0.55, 0.62, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    headingGroup.add(ring);

    // Direction arrow pointing forward (+Z) on the ground
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, 0.95);
    arrowShape.lineTo(0.2, 0.6);
    arrowShape.lineTo(0.08, 0.6);
    arrowShape.lineTo(0.08, 0.3);
    arrowShape.lineTo(-0.08, 0.3);
    arrowShape.lineTo(-0.08, 0.6);
    arrowShape.lineTo(-0.2, 0.6);
    arrowShape.closePath();

    const arrowGeo = new THREE.ShapeGeometry(arrowShape);
    arrowGeo.rotateX(-Math.PI / 2);
    arrowGeo.rotateY(Math.PI); // Orient towards +Z
    const arrowMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const groundArrow = new THREE.Mesh(arrowGeo, arrowMat);
    headingGroup.add(groundArrow);

    this.group.add(headingGroup);

    // Set initial position
    this.updateTransform();
  }

  update(dt, input, cameraAngleY) {
    // 1. Determine Movement Direction relative to Camera
    const moveDir = new THREE.Vector3(0, 0, 0);

    if (input.forward) moveDir.z += 1;
    if (input.backward) moveDir.z -= 1;
    if (input.left) moveDir.x += 1;
    if (input.right) moveDir.x -= 1;

    const isMoving = moveDir.lengthSq() > 0.001;

    if (isMoving) {
      moveDir.normalize();

      // Transform movement direction by camera yaw
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngleY);

      // Target facing angle matches movement direction
      this.targetFacingAngle = Math.atan2(moveDir.x, moveDir.z);

      // Smoothly rotate player toward target facing angle
      this.facingAngle = this.lerpAngle(
        this.facingAngle,
        this.targetFacingAngle,
        this.turnSpeed * dt
      );

      // Speed selection
      const currentSpeed = input.sprint ? this.sprintSpeed : this.walkSpeed;
      const targetVelX = moveDir.x * currentSpeed;
      const targetVelZ = moveDir.z * currentSpeed;

      this.velocity.x += (targetVelX - this.velocity.x) * Math.min(this.acceleration * dt, 1);
      this.velocity.z += (targetVelZ - this.velocity.z) * Math.min(this.acceleration * dt, 1);
    } else {
      // Decelerate smoothly
      const frictionFactor = Math.max(0, 1 - this.friction * dt);
      this.velocity.x *= frictionFactor;
      this.velocity.z *= frictionFactor;
    }

    // 2. Jump Input & Gravity
    if (input.jump && this.isGrounded) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
    }

    // Apply gravity
    this.velocity.y += this.gravity * dt;

    // 3. Update Position
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // 4. Ground / Surface Collision Check
    const playerFeetY = this.position.y - this.halfHeight;
    const surfaceY = this.world?.getSurfaceElevation
      ? this.world.getSurfaceElevation(this.position.x, this.position.z, this.position.y)
      : (this.world?.isPositionOnGround?.(this.position.x, this.position.z) ? this.world.getSurfaceY() : null);

    if (surfaceY !== null && playerFeetY <= surfaceY) {
      // Landed on a solid surface (cliff top or floor)
      this.position.y = surfaceY + this.halfHeight;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      // In mid-air or plummeting down the chasm
      this.isGrounded = false;
    }

    // 5. Fall Respawn (if fell off the chasm floor into deep void)
    if (this.position.y < -35) {
      this.respawn();
    }

    // 6. Update Visual Transform
    this.updateTransform();
  }

  updateTransform() {
    this.group.position.copy(this.position);

    // Apply facing rotation around Y only - no bobbing, no tilting
    this.group.rotation.y = this.facingAngle;
  }

  respawn() {
    const spawnPos = this.world?.getSpawnPosition
      ? this.world.getSpawnPosition()
      : new THREE.Vector3(0, 1.0, 0);
    this.position.copy(spawnPos);
    this.velocity.set(0, 0, 0);
    this.facingAngle = 0;
    this.targetFacingAngle = 0;
    this.isGrounded = true;
  }

  lerpAngle(a, b, t) {
    const diff = (b - a + Math.PI) % (Math.PI * 2) - Math.PI;
    return a + (diff < -Math.PI ? diff + Math.PI * 2 : diff) * Math.min(1, Math.max(0, t));
  }

  getSpeed() {
    return Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
  }

  getFacingDegrees() {
    let deg = Math.round((this.facingAngle * 180) / Math.PI) % 360;
    if (deg < 0) deg += 360;
    return deg;
  }
}
