/**
 * HUD: Zero-thrash arcade interface for Lastleap.
 * Updates DOM textContent directly (0 innerHTML parsing per frame).
 */
export class HUD {
  constructor(gameManager) {
    this.gameManager = gameManager;

    this.container = null;
    this.scoreEl = null;
    this.distEl = null;
    this.multEl = null;
    this.bestEl = null;
    this.nearMissEl = null;
    this.readyPromptEl = null;
    this.gameOverEl = null;

    this.nearMissTimer = null;

    this.mount();
    this.setupListeners();
  }

  mount() {
    this.container = document.createElement('div');
    this.container.id = 'arcade-hud';

    this.container.innerHTML = `
      <!-- Top Stats Bar -->
      <div id="hud-top-bar">
        <div class="hud-stat-box">
          <span class="hud-label">SCORE</span>
          <span id="hud-score" class="hud-value">0</span>
        </div>
        <div class="hud-stat-box">
          <span class="hud-label">DEPTH</span>
          <span id="hud-depth" class="hud-value">0 m</span>
        </div>
        <div class="hud-stat-box">
          <span class="hud-label">MULTIPLIER</span>
          <span id="hud-mult" class="hud-value hud-mult-glide">1.0x GLIDE</span>
        </div>
        <div class="hud-stat-box">
          <span class="hud-label">BEST</span>
          <span id="hud-best" class="hud-value">${this.gameManager.highScore.toLocaleString()}</span>
        </div>
      </div>

      <!-- Near Miss Floating Combo Banner -->
      <div id="hud-nearmiss" class="hidden"></div>

      <!-- Ready State Prompt -->
      <div id="hud-ready-prompt">
        <div class="prompt-title">PRESS <span class="key-badge">SPACE</span> TO LEAP</div>
        <div class="prompt-sub">[WASD] Steer & Carve | [W / Shift] Dive (2.0x) | [S] Airbrake (0.5x)</div>
      </div>

      <!-- Game Over Modal Card -->
      <div id="hud-gameover" class="hidden">
        <div class="gameover-card">
          <div class="gameover-header">CRASHED</div>
          <div class="gameover-stats">
            <div class="go-row"><span>Final Score:</span><span id="go-score">0</span></div>
            <div class="go-row"><span>Depth Fallen:</span><span id="go-depth">0 m</span></div>
            <div class="go-row"><span>Near Misses:</span><span id="go-misses">0</span></div>
            <div class="go-row highlight"><span>High Score:</span><span id="go-best">0</span></div>
          </div>
          <button id="go-retry-btn">RETRY [SPACE / R]</button>
        </div>
      </div>
    `.trim();

    document.body.appendChild(this.container);

    // Cache elements for zero-thrash direct textContent updates
    this.scoreEl = document.getElementById('hud-score');
    this.distEl = document.getElementById('hud-depth');
    this.multEl = document.getElementById('hud-mult');
    this.bestEl = document.getElementById('hud-best');
    this.nearMissEl = document.getElementById('hud-nearmiss');
    this.readyPromptEl = document.getElementById('hud-ready-prompt');
    this.gameOverEl = document.getElementById('hud-gameover');

    this.goScoreEl = document.getElementById('go-score');
    this.goDepthEl = document.getElementById('go-depth');
    this.goMissesEl = document.getElementById('go-misses');
    this.goBestEl = document.getElementById('go-best');
  }

  setupListeners() {
    // Retry button click
    const retryBtn = document.getElementById('go-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.gameManager.restart();
      });
    }

    // Connect to GameManager hooks
    this.gameManager.onScoreUpdate = (data) => {
      this.updateScore(data);
    };

    this.gameManager.onStateChange = (state) => {
      this.handleStateChange(state);
    };

    this.gameManager.onNearMiss = (data) => {
      this.showNearMiss(data);
    };

    this.gameManager.onGameOver = (data) => {
      this.showGameOver(data);
    };
  }

  updateScore(data) {
    if (this.scoreEl) {
      this.scoreEl.textContent = data.score.toLocaleString();
    }
    if (this.distEl) {
      this.distEl.textContent = `${data.distance} m`;
    }
    if (this.multEl) {
      this.multEl.textContent = data.multiplierLabel;
      if (data.multiplier === 2.0) {
        this.multEl.className = 'hud-value hud-mult-dive';
      } else if (data.multiplier === 0.5) {
        this.multEl.className = 'hud-value hud-mult-brake';
      } else {
        this.multEl.className = 'hud-value hud-mult-glide';
      }
    }
    if (this.bestEl) {
      this.bestEl.textContent = data.highScore.toLocaleString();
    }
  }

  handleStateChange(state) {
    if (state === 'READY') {
      if (this.readyPromptEl) this.readyPromptEl.classList.remove('hidden');
      if (this.gameOverEl) this.gameOverEl.classList.add('hidden');
      if (this.nearMissEl) this.nearMissEl.classList.add('hidden');
    } else if (state === 'FALLING') {
      if (this.readyPromptEl) this.readyPromptEl.classList.add('hidden');
      if (this.gameOverEl) this.gameOverEl.classList.add('hidden');
    } else if (state === 'GAME_OVER') {
      if (this.readyPromptEl) this.readyPromptEl.classList.add('hidden');
    }
  }

  showNearMiss(data) {
    if (!this.nearMissEl) return;

    if (this.nearMissTimer) clearTimeout(this.nearMissTimer);

    this.nearMissEl.textContent = `+${data.bonus} NEAR MISS! (${data.combo}x)`;
    this.nearMissEl.classList.remove('hidden');
    this.nearMissEl.classList.remove('fade-out');

    this.nearMissTimer = setTimeout(() => {
      this.nearMissEl.classList.add('fade-out');
      setTimeout(() => {
        this.nearMissEl.classList.add('hidden');
      }, 400);
    }, 900);
  }

  showGameOver(data) {
    if (this.goScoreEl) this.goScoreEl.textContent = data.finalScore.toLocaleString();
    if (this.goDepthEl) this.goDepthEl.textContent = `${data.distance} m`;
    if (this.goMissesEl) this.goMissesEl.textContent = data.nearMisses.toString();
    if (this.goBestEl) {
      this.goBestEl.textContent = `${data.highScore.toLocaleString()} ${data.isNewHighScore ? '★ NEW BEST!' : ''}`;
    }

    if (this.gameOverEl) {
      this.gameOverEl.classList.remove('hidden');
    }
  }
}
