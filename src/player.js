import * as THREE from 'three';

// Static scratch vectors to guarantee 0 heap allocation per frame
const _inputDir = new THREE.Vector3();
const _worldMoveDir = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

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

    // States: 'GROUNDED', 'FREEFALL'
    this.state = 'GROUNDED';
    this.isDiving = false;
    this.isBraking = false;
    this.fallDistance = 0; // Accumulated meters fallen on treadmill

    // Ground movement parameters
    this.walkSpeed = 6.0;
    this.sprintSpeed = 10.0;
    this.acceleration = 35.0;
    this.friction = 12.0;
    this.turnSpeed = 14.0;
    this.jumpForce = 8.5;
    this.gravity = -26.0;
    this.isGrounded = true;

    // Air steering & Freefall parameters
    this.airMaxSpeed = 16.0;          // max lateral drift speed
    this.airDiveSpeed = 22.0;         // max lateral speed while diving
    this.airBrakeSpeed = 10.0;        // max lateral speed while braking
    this.airAcceleration = 22.0;      // responsiveness of lateral air controls
    this.airDrag = 2.0;               // aerodynamic air drift momentum decay
    this.terminalVelocityBase = -45.0;// normal fall terminal velocity
    this.terminalVelocityDive = -75.0;// dive terminal velocity
    this.terminalVelocityBrake = -26.0;// airbrake terminal velocity
    this.currentTerminalVelocity = -45.0;

    // Body Tilt Angles (for aerodynamic dive & roll bank)
    this.pitchAngle = 0;
    this.rollAngle = 0;
    this.targetPitchAngle = 0;
    this.targetRollAngle = 0;

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
    this.headingGroup = new THREE.Group();
    this.headingGroup.position.set(0, -this.halfHeight + 0.02, 0);

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
    this.headingGroup.add(ring);

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
    this.headingGroup.add(groundArrow);

    this.group.add(this.headingGroup);

    // Set initial position
    this.updateTransform();
  }

  update(dt, input, cameraAngleY) {
    // 1. Calculate Camera-Relative Movement Vector from WASD/Arrows (Zero allocations)
    _inputDir.set(0, 0, 0);
    if (input.forward) _inputDir.z += 1;
    if (input.backward) _inputDir.z -= 1;
    if (input.left) _inputDir.x += 1;
    if (input.right) _inputDir.x -= 1;

    const hasInput = _inputDir.lengthSq() > 0.001;
    _worldMoveDir.set(0, 0, 0);

    if (hasInput) {
      _inputDir.normalize();
      _worldMoveDir.copy(_inputDir).applyAxisAngle(_upAxis, cameraAngleY);
    }

    // 2. Branch: Grounded vs Free-Fall
    if (this.isGrounded) {
      this.state = 'GROUNDED';
      this.isDiving = false;
      this.isBraking = false;
      this.targetPitchAngle = 0;
      this.targetRollAngle = 0;
      this.currentTerminalVelocity = this.terminalVelocityBase;

      // Ground movement
      if (hasInput) {
        this.targetFacingAngle = Math.atan2(_worldMoveDir.x, _worldMoveDir.z);
        this.facingAngle = this.lerpAngle(
          this.facingAngle,
          this.targetFacingAngle,
          this.turnSpeed * dt
        );

        const currentSpeed = input.sprint ? this.sprintSpeed : this.walkSpeed;
        const targetVelX = _worldMoveDir.x * currentSpeed;
        const targetVelZ = _worldMoveDir.z * currentSpeed;

        this.velocity.x += (targetVelX - this.velocity.x) * Math.min(this.acceleration * dt, 1);
        this.velocity.z += (targetVelZ - this.velocity.z) * Math.min(this.acceleration * dt, 1);
      } else {
        const frictionFactor = Math.max(0, 1 - this.friction * dt);
        this.velocity.x *= frictionFactor;
        this.velocity.z *= frictionFactor;
      }

      // Jump input
      if (input.jump) {
        this.velocity.y = this.jumpForce;
        this.isGrounded = false;
        this.state = 'FREEFALL';
      }
    } else {
      // In mid-air / free-falling down the cliff chasm
      this.state = 'FREEFALL';

      // Check diving (Forward or Sprint) vs braking (Backward)
      this.isDiving = Boolean(input.forward || input.sprint);
      this.isBraking = Boolean(input.backward && !input.forward);

      // Terminal Velocity target
      let targetTerminal = this.terminalVelocityBase;
      if (this.isDiving) targetTerminal = this.terminalVelocityDive;
      else if (this.isBraking) targetTerminal = this.terminalVelocityBrake;

      this.currentTerminalVelocity += (targetTerminal - this.currentTerminalVelocity) * Math.min(3.5 * dt, 1);

      // Vertical Gravity & Air Drag limiting to terminal velocity
      this.velocity.y += this.gravity * dt;
      if (this.velocity.y < this.currentTerminalVelocity) {
        this.velocity.y += (this.currentTerminalVelocity - this.velocity.y) * Math.min(5.0 * dt, 1);
      }

      // Lateral Air Steering (Air Drift & Carving)
      const maxAirSpeed = this.isDiving
        ? this.airDiveSpeed
        : (this.isBraking ? this.airBrakeSpeed : this.airMaxSpeed);

      if (hasInput) {
        const targetVelX = _worldMoveDir.x * maxAirSpeed;
        const targetVelZ = _worldMoveDir.z * maxAirSpeed;

        this.velocity.x += (targetVelX - this.velocity.x) * Math.min(this.airAcceleration * dt, 1);
        this.velocity.z += (targetVelZ - this.velocity.z) * Math.min(this.airAcceleration * dt, 1);

        // Turn player facing direction smoothly toward drift
        this.targetFacingAngle = Math.atan2(_worldMoveDir.x, _worldMoveDir.z);
        this.facingAngle = this.lerpAngle(
          this.facingAngle,
          this.targetFacingAngle,
          this.turnSpeed * 0.7 * dt
        );
      } else {
        // Aerodynamic air drag decay (retains satisfying air momentum)
        const dragFactor = Math.max(0, 1 - this.airDrag * dt);
        this.velocity.x *= dragFactor;
        this.velocity.z *= dragFactor;
      }

      // Aerodynamic Body Tilt: Pitch (nose dive) & Roll (bank turn)
      if (this.isDiving) {
        this.targetPitchAngle = 0.85; // ~48° forward dive
      } else if (this.isBraking) {
        this.targetPitchAngle = -0.2; // ~-11° slight spread/brake tilt back
      } else {
        this.targetPitchAngle = 0.25; // ~14° neutral forward glide angle
      }

      // Roll bank when strafing left/right
      if (input.left && !input.right) {
        this.targetRollAngle = 0.35; // bank left
      } else if (input.right && !input.left) {
        this.targetRollAngle = -0.35; // bank right
      } else {
        this.targetRollAngle = 0;
      }
    }

    // 3. Smooth Body Tilt Interpolation
    this.pitchAngle += (this.targetPitchAngle - this.pitchAngle) * Math.min(8.0 * dt, 1);
    this.rollAngle += (this.targetRollAngle - this.rollAngle) * Math.min(8.0 * dt, 1);

    // 4. Position Integration & Treadmill Anchor
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    if (this.isGrounded) {
      this.position.y += this.velocity.y * dt;

      // Check if still on the starting cliff platform
      const playerFeetY = this.position.y - this.halfHeight;
      const surfaceY = this.world?.getSurfaceElevation
        ? this.world.getSurfaceElevation(this.position.x, this.position.z, this.position.y)
        : null;

      if (surfaceY !== null && playerFeetY <= surfaceY) {
        this.position.y = surfaceY + this.halfHeight;
        this.velocity.y = 0;
        this.isGrounded = true;
        this.state = 'GROUNDED';
      } else {
        // Stepped off cliff edge into freefall
        this.isGrounded = false;
        this.state = 'FREEFALL';
      }
    } else {
      // In FREEFALL: Player Y remains stationary at halfHeight (Treadmill approach A)
      this.state = 'FREEFALL';
      this.position.y = this.halfHeight;

      // Accumulate distance fallen
      const scrollSpeed = Math.max(0, -this.velocity.y);
      this.fallDistance += scrollSpeed * dt;

      // Constrain player lateral movement inside canyon boundaries
      const canyonBound = 16.0;
      this.position.x = Math.max(-canyonBound, Math.min(canyonBound, this.position.x));
      this.position.z = Math.max(-canyonBound, Math.min(canyonBound, this.position.z));
    }

    // 5. Update Visual Transform
    this.updateTransform();
  }

  updateTransform() {
    this.group.position.copy(this.position);

    // Apply pitch, yaw, roll rotation in YXZ order
    this.group.rotation.order = 'YXZ';
    this.group.rotation.set(this.pitchAngle, this.facingAngle, this.rollAngle);

    if (this.headingGroup) {
      this.headingGroup.visible = this.isGrounded;
    }
  }

  respawn() {
    this.world?.reset();
    const spawnPos = this.world?.getSpawnPosition
      ? this.world.getSpawnPosition()
      : new THREE.Vector3(0, 1.0, -6);
    this.position.copy(spawnPos);
    this.velocity.set(0, 0, 0);
    this.fallDistance = 0;
    this.facingAngle = 0;
    this.targetFacingAngle = 0;
    this.pitchAngle = 0;
    this.rollAngle = 0;
    this.targetPitchAngle = 0;
    this.targetRollAngle = 0;
    this.currentTerminalVelocity = this.terminalVelocityBase;
    this.isDiving = false;
    this.isBraking = false;
    this.isGrounded = true;
    this.state = 'GROUNDED';
    this.updateTransform();
  }

  getScrollSpeed() {
    return this.state === 'FREEFALL' ? Math.max(0, -this.velocity.y) : 0;
  }

  getFallSpeed() {
    return -this.velocity.y;
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
