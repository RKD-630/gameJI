// =============================================
//  TIC TAC TOE — Game Logic
// =============================================

// --- State ---
let board = Array(9).fill(null);
let currentPlayer = 'X';
let gameActive = true;
let scores = { X: 0, O: 0, D: 0 };
let mode = '2player'; // '2player' or 'ai'
let isAiThinking = false;
let aiLevel = 'high'; // 'normal', 'medium', 'high'

// Winning combinations
const WIN_COMBOS = [
  [0,1,2],[3,4,5],[6,7,8], // rows
  [0,3,6],[1,4,7],[2,5,8], // cols
  [0,4,8],[2,4,6]          // diags
];

// Symbol mapping
const SYMBOLS = { X: '✕', O: '○' };

// =============================================
//  Mode Selection
// =============================================
function setMode(newMode) {
  mode = newMode;
  document.getElementById('btn2P').classList.toggle('active', mode === '2player');
  document.getElementById('btnAI').classList.toggle('active', mode === 'ai');
  document.getElementById('labelO').textContent = mode === 'ai' ? 'AI 🤖' : 'Player O';
  document.getElementById('levelSelector').style.display = mode === 'ai' ? 'flex' : 'none';
  clearScores();
}

function setAiLevel(level) {
  aiLevel = level;
  document.getElementById('btnNormal').classList.toggle('active', level === 'normal');
  document.getElementById('btnMedium').classList.toggle('active', level === 'medium');
  document.getElementById('btnHigh').classList.toggle('active', level === 'high');
  clearScores();
}

// =============================================
//  Click Handler
// =============================================
function handleClick(index) {
  if (!gameActive || board[index] || isAiThinking) return;

  makeMove(index, currentPlayer);

  if (!gameActive) return;

  // AI turn
  if (mode === 'ai' && currentPlayer === 'O') {
    isAiThinking = true;
    setTurnIndicator('thinking');
    setTimeout(() => {
      const aiIndex = getBestMove();
      isAiThinking = false;
      if (aiIndex !== -1) makeMove(aiIndex, 'O');
    }, 500);
  }
}

// =============================================
//  Make a Move
// =============================================
function makeMove(index, player) {
  board[index] = player;

  const cell = document.getElementById(`cell-${index}`);
  cell.classList.add(`${player.toLowerCase()}-cell`, 'taken');
  cell.innerHTML = `<span class="cell-content">${SYMBOLS[player]}</span>`;

  const result = checkResult();

  if (result) {
    endGame(result);
  } else {
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    setTurnIndicator('normal');
  }
}

// =============================================
//  Check Result
// =============================================
function checkResult() {
  return checkResultForBoard(board);
}

function checkResultForBoard(b) {
  for (const combo of WIN_COMBOS) {
    const [i, j, k] = combo;
    if (b[i] && b[i] === b[j] && b[i] === b[k]) {
      return { type: 'win', player: b[i], combo };
    }
  }
  if (b.every(cell => cell !== null)) {
    return { type: 'draw' };
  }
  return null;
}

// =============================================
//  End Game
// =============================================
function endGame(result) {
  gameActive = false;

  if (result.type === 'win') {
    // Highlight winning cells
    result.combo.forEach(i => {
      document.getElementById(`cell-${i}`).classList.add('winner');
    });

    scores[result.player]++;
    updateScores();

    // Show overlay
    const playerName = result.player === 'O' && mode === 'ai' ? 'AI 🤖' :
                       `Player ${result.player}`;
    showOverlay(
      result.player === 'X' ? '🎉' : (mode === 'ai' ? '🤖' : '🎊'),
      `${playerName} Wins!`,
      result.player === 'O' && mode === 'ai' ? 'Better luck next time!' : 'Excellent play!'
    );

    setTimeout(() => launchConfetti(), 300);

  } else {
    scores.D++;
    updateScores();
    showOverlay('🤝', "It's a Draw!", 'Well played by both sides!');
  }
}

// =============================================
//  Turn Indicator
// =============================================
function setTurnIndicator(state) {
  const badge = document.querySelector('.turn-badge');
  const text = document.getElementById('turnText');
  const symbol = document.getElementById('turnSymbol');

  badge.classList.remove('x-turn', 'o-turn', 'thinking');

  if (state === 'thinking') {
    badge.classList.add('thinking', 'o-turn');
    text.textContent = 'AI is thinking';
    symbol.textContent = '🤖';
  } else {
    const name = currentPlayer === 'O' && mode === 'ai' ? 'AI' : `Player ${currentPlayer}`;
    text.textContent = `${name}'s Turn`;
    symbol.textContent = SYMBOLS[currentPlayer];
    badge.classList.add(currentPlayer === 'X' ? 'x-turn' : 'o-turn');
  }

  // Highlight score cards
  document.getElementById('scoreX').classList.toggle('active-turn', currentPlayer === 'X');
  document.getElementById('scoreO').classList.toggle('active-turn', currentPlayer === 'O');
}

// =============================================
//  Update Scores
// =============================================
function updateScores() {
  document.getElementById('scoreXVal').textContent = scores.X;
  document.getElementById('scoreOVal').textContent = scores.O;
  document.getElementById('scoreDrawVal').textContent = scores.D;
}

// =============================================
//  Reset Game (keep scores)
// =============================================
function resetGame() {
  board = Array(9).fill(null);
  currentPlayer = 'X';
  gameActive = true;
  isAiThinking = false;

  document.querySelectorAll('.cell').forEach(cell => {
    cell.className = 'cell';
    cell.innerHTML = '';
    // Re-add onclick (they might be removed; they're inline so fine)
  });

  hideOverlay();
  setTurnIndicator('normal');
}

// =============================================
//  Clear Scores
// =============================================
function clearScores() {
  scores = { X: 0, O: 0, D: 0 };
  updateScores();
  resetGame();
}

// =============================================
//  Overlay
// =============================================
function showOverlay(emoji, title, sub) {
  document.getElementById('resultEmoji').textContent = emoji;
  document.getElementById('resultTitle').textContent = title;
  document.getElementById('resultSub').textContent = sub;
  document.getElementById('overlay').classList.add('show');
}

function hideOverlay() {
  document.getElementById('overlay').classList.remove('show');
}

// =============================================
//  AI - Minimax
// =============================================
function getBestMove() {
  const emptyIndices = board.map((val, idx) => val === null ? idx : null).filter(val => val !== null);
  
  if (aiLevel === 'normal') {
    if (Math.random() < 0.7) {
      return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    }
  } else if (aiLevel === 'medium') {
    if (Math.random() < 0.3) {
      return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    }
  }

  let bestScore = -Infinity;
  let bestIndex = -1;

  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = 'O';
      const score = minimax(board, 0, false, -Infinity, Infinity);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
  }
  return bestIndex;
}

function minimax(b, depth, isMax, alpha, beta) {
  const result = checkResultForBoard(b);
  if (result) {
    if (result.type === 'win') return result.player === 'O' ? 10 - depth : depth - 10;
    return 0; // draw
  }

  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        b[i] = 'O';
        best = Math.max(best, minimax(b, depth + 1, false, alpha, beta));
        b[i] = null;
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        b[i] = 'X';
        best = Math.min(best, minimax(b, depth + 1, true, alpha, beta));
        b[i] = null;
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
    }
    return best;
  }
}

// =============================================
//  Confetti
// =============================================
function launchConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#f87c7c','#7eb8f7','#c084fc','#facc15','#34d399','#fb923c'];
  const particles = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: -20,
    r: Math.random() * 8 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    speed: Math.random() * 4 + 2,
    angle: Math.random() * 360,
    spin: (Math.random() - 0.5) * 8,
    swing: Math.random() * 3,
    swingOffset: Math.random() * 100,
    opacity: 1
  }));

  let frame = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frame++;
    let alive = false;

    particles.forEach(p => {
      if (p.y < canvas.height + 20) {
        alive = true;
        p.y += p.speed;
        p.x += Math.sin((frame + p.swingOffset) * 0.05) * p.swing;
        p.angle += p.spin;
        if (p.y > canvas.height * 0.7) p.opacity -= 0.015;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.angle * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.roundRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6, 2);
        ctx.fill();
        ctx.restore();
      }
    });

    if (alive) requestAnimationFrame(animate);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  animate();
}

// =============================================
//  Init
// =============================================
setTurnIndicator('normal');
