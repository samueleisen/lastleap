/**
 * GameManager: Central state machine, scoring engine, and collision arbiter for Lastleap.
 * States:
 * - 'READY': Player on launch platform.
 * - 'FALLING': Active freefall descent, accumulating score, multiplier & near-misses.
 * - 'GAME_OVER': Collided with hazard, summary displayed, ready for retry.
 */
export class GameManager {
  constructor(game) {
    this.game = game;

    // States
    this.state = 'READY';

    // Scoring metrics
    this.score = 0;
    this.distance = 0;
    this.multiplier = 1.0;
    this.combo = 0;
    this.nearMissCount = 0;
    this.isNewHighScore = false;

    // Retrieve high score from localStorage
    this.highScore = parseInt(localStorage.getItem('lastleap_highscore') || '0', 10);

    // Callbacks for UI updates
    this.onStateChange = null;
    this.onScoreUpdate = null;
    this.onNearMiss = null;
    this.onGameOver = null;
  }

  startRun() {
    if (this.state === 'FALLING') return;

    this.state = 'FALLING';
    this.score = 0;
    this.distance = 0;
    this.multiplier = 1.0;
    this.combo = 0;
    this.nearMissCount = 0;
    this.isNewHighScore = false;

    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }

  update(dt) {
    const player = this.game.player;
    const world = this.game.world;

    // Auto-detect free-fall start from launch platform
    if (this.state === 'READY' && player.state === 'FREEFALL') {
      this.startRun();
    }

    if (this.state !== 'FALLING') return;

    // 1. Calculate dynamic speed multiplier
    if (player.isDiving) {
      this.multiplier = 2.0; // Dive bonus!
    } else if (player.isBraking) {
      this.multiplier = 0.5; // Slower descent penalty
    } else {
      this.multiplier = 1.0;
    }

    // 2. Accumulate base distance and score
    const scrollSpeed = player.getScrollSpeed();
    const deltaMeters = scrollSpeed * dt;
    this.distance += deltaMeters;

    // Base score: 1.2 points per meter fallen multiplied by current speed stance
    this.score += deltaMeters * 1.2 * this.multiplier;

    // Check if new high score
    if (Math.floor(this.score) > this.highScore) {
      this.highScore = Math.floor(this.score);
      this.isNewHighScore = true;
    }

    // 3. Check Hazard Collisions & Near-Misses against Pooled Obstacles
    this.checkObstacles(player, world);

    // 4. Emit live score update
    if (this.onScoreUpdate) {
      this.onScoreUpdate({
        score: Math.floor(this.score),
        distance: Math.floor(this.distance),
        multiplier: this.multiplier,
        multiplierLabel: player.isDiving ? '2.0x DIVE' : (player.isBraking ? '0.5x BRAKE' : '1.0x GLIDE'),
        highScore: this.highScore,
        isNewHighScore: this.isNewHighScore,
        speed: scrollSpeed,
      });
    }
  }

  checkObstacles(player, world) {
    const obstacles = world.obstaclePool;
    if (!obstacles || obstacles.length === 0) return;

    const px = player.position.x;
    const pz = player.position.z;
    const py = player.position.y; // 1.0

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      const dy = Math.abs(obs.position.y - py);

      // Check when obstacle slices through player horizontal plane
      if (dy < 1.6) {
        const dx = px - obs.position.x;
        const dz = pz - obs.position.z;
        const distSq = dx * dx + dz * dz;

        // Collision Hitbox: radius 3.3m
        if (distSq < 10.89) { // 3.3^2 = 10.89
          this.triggerGameOver();
          return;
        }

        // Near-Miss Proximity: between 3.3m and 5.8m
        if (distSq < 33.64 && !obs.userData.nearMissScored) { // 5.8^2 = 33.64
          obs.userData.nearMissScored = true;
          this.triggerNearMissBonus();
        }
      } else if (obs.position.y > 4.0) {
        // Reset flag once safely past
        obs.userData.nearMissScored = false;
      }
    }
  }

  triggerNearMissBonus() {
    this.combo += 1;
    this.nearMissCount += 1;

    // Combo points: 150 * combo
    const bonus = 150 * Math.min(this.combo, 5);
    this.score += bonus;

    if (this.onNearMiss) {
      this.onNearMiss({
        bonus,
        combo: this.combo,
      });
    }
  }

  triggerGameOver() {
    if (this.state === 'GAME_OVER') return;

    this.state = 'GAME_OVER';

    // Persist high score
    const finalScore = Math.floor(this.score);
    if (finalScore > this.highScore) {
      this.highScore = finalScore;
      this.isNewHighScore = true;
    }
    localStorage.setItem('lastleap_highscore', this.highScore.toString());

    if (this.onGameOver) {
      this.onGameOver({
        finalScore,
        distance: Math.floor(this.distance),
        nearMisses: this.nearMissCount,
        highScore: this.highScore,
        isNewHighScore: this.isNewHighScore,
      });
    }

    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }

  restart() {
    this.state = 'READY';
    this.score = 0;
    this.distance = 0;
    this.multiplier = 1.0;
    this.combo = 0;
    this.nearMissCount = 0;
    this.isNewHighScore = false;

    // Reset player, world, and camera
    this.game.player.respawn();
    this.game.cameraController?.reset();

    if (this.onStateChange) {
      this.onStateChange(this.state);
    }

    if (this.onScoreUpdate) {
      this.onScoreUpdate({
        score: 0,
        distance: 0,
        multiplier: 1.0,
        multiplierLabel: '1.0x GLIDE',
        highScore: this.highScore,
        isNewHighScore: false,
        speed: 0,
      });
    }
  }
}
