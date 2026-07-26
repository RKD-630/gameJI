// ====================================================
//  CHESS ENGINE — Full rules: castling, en passant,
//  promotion, check/checkmate/stalemate, AI (minimax)
// ====================================================

// --- Piece Icons ---
const ICONS = {
  K:'♔', Q:'♕', R:'♖', B:'♗', N:'♘', P:'♙',
  k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟'
};

// --- Piece Values ---
const VAL = { p:100, n:320, b:330, r:500, q:900, k:20000 };

// --- Position Score Tables (white's perspective, row 0 = rank 8) ---
const PST = {
  p:[ [0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],
      [5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],
      [5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0] ],
  n:[ [-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],
      [-30,0,10,15,15,10,0,-30],[-30,5,15,20,20,15,5,-30],
      [-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],
      [-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50] ],
  b:[ [-20,-10,-10,-10,-10,-10,-10,-20],[-10,0,0,0,0,0,0,-10],
      [-10,0,5,10,10,5,0,-10],[-10,5,5,10,10,5,5,-10],
      [-10,0,10,10,10,10,0,-10],[-10,10,10,10,10,10,10,-10],
      [-10,5,0,0,0,0,5,-10],[-20,-10,-10,-10,-10,-10,-10,-20] ],
  r:[ [0,0,0,0,0,0,0,0],[5,10,10,10,10,10,10,5],[-5,0,0,0,0,0,0,-5],
      [-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],
      [-5,0,0,0,0,0,0,-5],[0,0,0,5,5,0,0,0] ],
  q:[ [-20,-10,-10,-5,-5,-10,-10,-20],[-10,0,0,0,0,0,0,-10],
      [-10,0,5,5,5,5,0,-10],[-5,0,5,5,5,5,0,-5],
      [0,0,5,5,5,5,0,-5],[-10,5,5,5,5,5,0,-10],
      [-10,0,5,0,0,0,0,-10],[-20,-10,-10,-5,-5,-10,-10,-20] ],
  k:[ [-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],
      [-20,-30,-30,-40,-40,-30,-30,-20],[-10,-20,-20,-20,-20,-20,-20,-10],
      [20,20,0,0,0,0,20,20],[20,30,10,0,0,10,30,20] ]
};

// --- Initial Board ---
const INIT = [
  ['r','n','b','q','k','b','n','r'],
  ['p','p','p','p','p','p','p','p'],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  ['P','P','P','P','P','P','P','P'],
  ['R','N','B','Q','K','B','N','R']
];

const FILES_STR = 'abcdefgh';

// =====================  HELPERS  =====================
const isW   = p => !!(p && p === p.toUpperCase() && p.trim());
const isB   = p => !!(p && p === p.toLowerCase());
const enemy = (p, wTurn) => wTurn ? isB(p) : isW(p);
const ally  = (p, wTurn) => wTurn ? isW(p) : isB(p);
const ok    = (r,c) => r>=0&&r<8&&c>=0&&c<8;
const dup   = b => b.map(r=>[...r]);
const toAN  = (r,c) => FILES_STR[c] + (8-r);

// =====================  MOVE GENERATION  =====================
// Returns [[toR, toC, flag], ...] — pseudo-legal (doesn't verify check)
// flags: '' normal, 'dp' double pawn, 'ep' en-passant, 'ck' castle-K, 'cq' castle-Q
function pseudo(b, r, c, epSq, cast, skipCastle=false) {
  const p = b[r][c]; if(!p) return [];
  const w = isW(p), t = p.toLowerCase(), mv = [];

  if (t==='p') {
    const d = w?-1:1, sr = w?6:1;
    if (ok(r+d,c) && !b[r+d][c]) {
      mv.push([r+d,c,'']);
      if (r===sr && !b[r+2*d][c]) mv.push([r+2*d,c,'dp']);
    }
    for (const dc of [-1,1]) {
      if (!ok(r+d,c+dc)) continue;
      if (b[r+d][c+dc] && enemy(b[r+d][c+dc],w)) mv.push([r+d,c+dc,'']);
      if (epSq && epSq[0]===r+d && epSq[1]===c+dc)   mv.push([r+d,c+dc,'ep']);
    }
  }

  if (t==='n') {
    for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      const nr=r+dr, nc=c+dc;
      if (ok(nr,nc) && !ally(b[nr][nc],w)) mv.push([nr,nc,'']);
    }
  }

  const slide = dirs => {
    for (const [dr,dc] of dirs) {
      let nr=r+dr, nc=c+dc;
      while (ok(nr,nc)) {
        if (b[nr][nc]) { if(enemy(b[nr][nc],w)) mv.push([nr,nc,'']); break; }
        mv.push([nr,nc,'']); nr+=dr; nc+=dc;
      }
    }
  };
  if (t==='b'||t==='q') slide([[-1,-1],[-1,1],[1,-1],[1,1]]);
  if (t==='r'||t==='q') slide([[-1,0],[1,0],[0,-1],[0,1]]);

  if (t==='k') {
    for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
      const nr=r+dr, nc=c+dc;
      if (ok(nr,nc) && !ally(b[nr][nc],w)) mv.push([nr,nc,'']);
    }
    if (!skipCastle && cast) {
      const rk = w?7:0;
      if (r===rk && c===4) {
        const kk = w?'wK':'bK', qk = w?'wQ':'bQ';
        // King-side
        if (cast[kk] && !b[rk][5] && !b[rk][6] &&
            !attacked(b,rk,4,!w) && !attacked(b,rk,5,!w) && !attacked(b,rk,6,!w))
          mv.push([rk,6,'ck']);
        // Queen-side
        if (cast[qk] && !b[rk][1] && !b[rk][2] && !b[rk][3] &&
            !attacked(b,rk,4,!w) && !attacked(b,rk,3,!w) && !attacked(b,rk,2,!w))
          mv.push([rk,2,'cq']);
      }
    }
  }
  return mv;
}

// Is square (r,c) attacked by pieces of side byW?
function attacked(b, r, c, byW) {
  for (let fr=0;fr<8;fr++) for (let fc=0;fc<8;fc++) {
    const p=b[fr][fc]; if(!p) continue;
    if (byW ? !isW(p) : !isB(p)) continue;
    const ms = pseudo(b,fr,fc,null,null,true);
    if (ms.some(([mr,mc])=>mr===r&&mc===c)) return true;
  }
  return false;
}

function kingPos(b, white) {
  const k = white?'K':'k';
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) if(b[r][c]===k) return [r,c];
  return null;
}

function inCheck(b, white) {
  const kp = kingPos(b, white);
  return kp ? attacked(b, kp[0], kp[1], !white) : false;
}

// Apply a move — returns [newBoard, capturedPiece, newEP, newCast]
function applyMove(b, fr, fc, tr, tc, flag, cast, epSq) {
  const nb = dup(b);
  const piece = nb[fr][fc], w = isW(piece);
  let cap = nb[tr][tc];
  const nc = {...cast};
  nb[tr][tc] = piece; nb[fr][fc] = null;

  if (flag==='ep') {
    const capR = w ? tr+1 : tr-1;
    cap = nb[capR][tc]; nb[capR][tc] = null;
  }
  if (flag==='ck') { const rk=w?7:0; nb[rk][5]=nb[rk][7]; nb[rk][7]=null; }
  if (flag==='cq') { const rk=w?7:0; nb[rk][3]=nb[rk][0]; nb[rk][0]=null; }

  const newEP = (flag==='dp') ? [(fr+tr)/2, tc] : null;

  // Update castling rights
  if (piece==='K') { nc.wK=false; nc.wQ=false; }
  if (piece==='k') { nc.bK=false; nc.bQ=false; }
  if (fr===7&&fc===7||tr===7&&tc===7) nc.wK=false;
  if (fr===7&&fc===0||tr===7&&tc===0) nc.wQ=false;
  if (fr===0&&fc===7||tr===0&&tc===7) nc.bK=false;
  if (fr===0&&fc===0||tr===0&&tc===0) nc.bQ=false;

  return [nb, cap, newEP, nc];
}

// Legal moves for a single piece (filters moves leaving king in check)
function legalFor(b, r, c, epSq, cast) {
  const p = b[r][c]; if(!p) return [];
  const w = isW(p);
  return pseudo(b,r,c,epSq,cast).filter(([tr,tc,flag]) => {
    const [nb] = applyMove(b,r,c,tr,tc,flag,cast,epSq);
    return !inCheck(nb, w);
  });
}

// All legal moves for a side
function allLegal(b, white, epSq, cast) {
  const res=[];
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    const p=b[r][c]; if(!p||isW(p)!==white) continue;
    legalFor(b,r,c,epSq,cast).forEach(([tr,tc,fl])=>res.push([r,c,tr,tc,fl]));
  }
  return res;
}

// Game state: 'playing' | 'check' | 'checkmate' | 'stalemate'
function getState(b, white, epSq, cast) {
  const moves = allLegal(b, white, epSq, cast);
  if (!moves.length) return inCheck(b,white) ? 'checkmate' : 'stalemate';
  return inCheck(b,white) ? 'check' : 'playing';
}

// =====================  EVALUATION  =====================
function evaluate(b) {
  let s=0;
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    const p=b[r][c]; if(!p) continue;
    const w=isW(p), t=p.toLowerCase();
    const tr = w ? 7-r : r;
    const pos = PST[t] ? PST[t][tr][c] : 0;
    s += w ? (VAL[t]+pos) : -(VAL[t]+pos);
  }
  return s;
}

// =====================  AI — MINIMAX + ALPHA-BETA  =====================
function minimax(b, depth, alpha, beta, maxWhite, epSq, cast) {
  if (depth===0) return evaluate(b);
  const moves = allLegal(b, maxWhite, epSq, cast);
  if (!moves.length) return inCheck(b,maxWhite) ? (maxWhite?-100000:100000) : 0;

  // Move ordering: captures first
  moves.sort(([,,,tr,tc,],) => b[tr][tc] ? -1 : 1);

  if (maxWhite) {
    let best=-Infinity;
    for (const [fr,fc,tr,tc,fl] of moves) {
      const [nb,,nep,ncast] = applyMove(b,fr,fc,tr,tc,fl,cast,epSq);
      if (nb[tr][tc]?.toLowerCase()==='p'&&(tr===0||tr===7)) nb[tr][tc]='Q';
      best = Math.max(best, minimax(nb,depth-1,alpha,beta,false,nep,ncast));
      alpha = Math.max(alpha,best); if (beta<=alpha) break;
    }
    return best;
  } else {
    let best=Infinity;
    for (const [fr,fc,tr,tc,fl] of moves) {
      const [nb,,nep,ncast] = applyMove(b,fr,fc,tr,tc,fl,cast,epSq);
      if (nb[tr][tc]?.toLowerCase()==='p'&&(tr===0||tr===7)) nb[tr][tc]='q';
      best = Math.min(best, minimax(nb,depth-1,alpha,beta,true,nep,ncast));
      beta = Math.min(beta,best); if (beta<=alpha) break;
    }
    return best;
  }
}

function getAIMove() {
  const moves = allLegal(board, false, epSq, castR); // AI = Black
  if (!moves.length) return null;

  if (aiLevel === 'normal' && Math.random() < 0.5) {
    return moves[Math.floor(Math.random() * moves.length)];
  } else if (aiLevel === 'medium' && Math.random() < 0.3) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  moves.sort(([,,,tr,tc,],) => board[tr][tc] ? -1 : 1); // captures first
  let bestScore=Infinity, bestMove=null;
  for (const [fr,fc,tr,tc,fl] of moves) {
    const [nb,,nep,ncast] = applyMove(board,fr,fc,tr,tc,fl,castR,epSq);
    if (nb[tr][tc]?.toLowerCase()==='p'&&tr===7) nb[tr][tc]='q';
    const score = minimax(nb,3,-Infinity,Infinity,true,nep,ncast);
    if (score < bestScore) { bestScore=score; bestMove=[fr,fc,tr,tc,fl]; }
  }
  return bestMove;
}

// =====================  GAME STATE VARIABLES  =====================
let board, turn, selSq, epSq, castR, capW, capB, moveHist, gameOver, scores, gameMode, aiThink, flipped, pendPromo, lastMove;
let aiLevel = 'high';

// =====================  NOTATION  =====================
function notation(b, fr, fc, tr, tc, flag, piece) {
  if (flag==='ck') return 'O-O';
  if (flag==='cq') return 'O-O-O';
  const t = piece.toUpperCase();
  const cap = (b[tr][tc]||flag==='ep') ? 'x' : '';
  if (t==='P') return cap ? FILES_STR[fc]+'x'+toAN(tr,tc) : toAN(tr,tc);
  return t + cap + toAN(tr,tc);
}

// =====================  UI FUNCTIONS  =====================
function renderBoard() {
  const el = document.getElementById('chessBoard');
  el.innerHTML = '';
  const lMvs = selSq ? legalFor(board, selSq[0], selSq[1], epSq, castR) : [];
  const movSet = new Set(lMvs.map(([tr,tc])=>`${tr},${tc}`));
  const capSet = new Set(lMvs.filter(([tr,tc])=>board[tr][tc]||(epSq&&epSq[0]===tr&&epSq[1]===tc)).map(([tr,tc])=>`${tr},${tc}`));

  const inChk = inCheck(board, turn==='white');
  const kp = inChk ? kingPos(board, turn==='white') : null;

  for (let vi=0; vi<8; vi++) {
    for (let vj=0; vj<8; vj++) {
      const r = flipped ? 7-vi : vi;
      const c = flipped ? 7-vj : vj;
      const sq = document.createElement('div');
      const light = (r+c)%2===0;
      sq.className = `square ${light?'sq-light':'sq-dark'}`;
      sq.dataset.r = r; sq.dataset.c = c;

      // Highlights
      if (selSq && selSq[0]===r && selSq[1]===c) sq.classList.add('sq-selected');
      if (lastMove && ((lastMove[0]===r&&lastMove[1]===c)||(lastMove[2]===r&&lastMove[3]===c)))
        sq.classList.add('sq-lastmove');
      if (kp && kp[0]===r && kp[1]===c) sq.classList.add('sq-incheck');

      const key = `${r},${c}`;
      if (selSq && movSet.has(key)) sq.classList.add(capSet.has(key)?'capture-ring':'move-dot');

      // Piece
      const piece = board[r][c];
      if (piece) {
        const sp = document.createElement('span');
        sp.className = `piece ${isW(piece)?'piece-white':'piece-black'}`;
        sp.textContent = ICONS[piece];
        sq.appendChild(sp);
      }

      // Corner labels
      if (vj===0) { const s=document.createElement('span'); s.className='coord-rank'; s.textContent=8-r; sq.appendChild(s); }
      if (vi===7) { const s=document.createElement('span'); s.className='coord-file'; s.textContent=FILES_STR[c]; sq.appendChild(s); }

      sq.addEventListener('click', ()=>onSquareClick(r,c));
      el.appendChild(sq);
    }
  }
  updateRankFileLabels();
}

function updateRankFileLabels() {
  const rl = document.getElementById('rankLabels');
  const fl = document.getElementById('fileLabels');
  if (flipped) {
    rl.innerHTML = [1,2,3,4,5,6,7,8].map(n=>`<span>${n}</span>`).join('');
    fl.innerHTML = 'hgfedcba'.split('').map(f=>`<span>${f}</span>`).join('');
  } else {
    rl.innerHTML = [8,7,6,5,4,3,2,1].map(n=>`<span>${n}</span>`).join('');
    fl.innerHTML = 'abcdefgh'.split('').map(f=>`<span>${f}</span>`).join('');
  }
}

function onSquareClick(r, c) {
  if (gameOver || aiThink) return;
  if (gameMode==='ai' && turn==='black') return;

  const piece = board[r][c];

  // If a piece is already selected
  if (selSq) {
    const moves = legalFor(board, selSq[0], selSq[1], epSq, castR);
    const mov = moves.find(([tr,tc])=>tr===r&&tc===c);

    if (mov) {
      const [tr, tc, flag] = mov;
      const fromPiece = board[selSq[0]][selSq[1]];
      // Pawn promotion (human)
      if (fromPiece.toLowerCase()==='p' && (tr===0||tr===7) && turn==='white') {
        pendPromo = { fr:selSq[0], fc:selSq[1], tr, tc, flag };
        showPromoModal(); return;
      }
      doMove(selSq[0], selSq[1], tr, tc, flag); return;
    }

    // Click own piece → re-select
    if (piece && (turn==='white'?isW(piece):isB(piece))) { selSq=[r,c]; renderBoard(); return; }

    // Deselect
    selSq=null; renderBoard(); return;
  }

  // Select piece
  if (piece && (turn==='white'?isW(piece):isB(piece))) {
    selSq=[r,c]; renderBoard();
  }
}

function doMove(fr, fc, tr, tc, flag, promoTo=null) {
  const piece = board[fr][fc];
  const note = notation(board, fr, fc, tr, tc, flag, piece);

  // Save for undo
  moveHist.push({ board:dup(board), castR:{...castR}, epSq, turn, capW:[...capW], capB:[...capB], lastMove:lastMove?[...lastMove]:null });

  const [nb, cap, newEP, newCast] = applyMove(board, fr, fc, tr, tc, flag, castR, epSq);
  board=nb; epSq=newEP; castR=newCast; lastMove=[fr,fc,tr,tc];

  // Handle promotion
  if (board[tr][tc].toLowerCase()==='p' && (tr===0||tr===7)) {
    board[tr][tc] = turn==='white' ? (promoTo||'Q').toUpperCase() : (promoTo||'q').toLowerCase();
  }

  if (cap) (turn==='white' ? capW : capB).push(cap);

  selSq=null; pendPromo=null;
  moveHist[moveHist.length-1].note = note; // attach notation to saved state

  turn = turn==='white' ? 'black' : 'white';

  renderBoard();
  updateCaptured();
  updateMoveHistory(note);

  const state = getState(board, turn==='white', epSq, castR);
  if (state==='checkmate') {
    const winner = turn==='black' ? 'White' : 'Black';
    scores[winner.toLowerCase()]++;
    updateScores();
    setTimeout(()=>showResult('♟', `${winner} Wins!`, 'Checkmate!'), 300);
    return;
  }
  if (state==='stalemate') {
    setTimeout(()=>showResult('🤝','Stalemate!','Nobody wins — draw!'), 300);
    return;
  }

  updateStatus(state==='check');

  // AI turn
  if (gameMode==='ai' && turn==='black' && !gameOver) {
    aiThink = true;
    setStatusAI();
    setTimeout(()=>{
      const mv = getAIMove();
      aiThink = false;
      if (mv) doMove(...mv);
      else updateStatus();
    }, 250);
  }
}

// =====================  UI HELPERS  =====================
function updateStatus(check=false) {
  const dot  = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  dot.className = 'status-dot ' + (turn==='white' ? 'dot-white' : 'dot-black');
  if (check) { dot.className='status-dot dot-check'; }
  const label = turn==='white' ? '♔ White' : '♚ Black';
  text.textContent = check ? `${label} is in Check!` : `${label}'s Turn`;
}
function setStatusAI() {
  document.getElementById('statusDot').className='status-dot dot-ai';
  document.getElementById('statusText').textContent='🤖 AI thinking…';
}

function updateCaptured() {
  const sortV = arr=>[...arr].sort((a,b)=>VAL[b.toLowerCase()]-VAL[a.toLowerCase()]);
  document.getElementById('capByWhite').innerHTML = sortV(capW).map(p=>`<span class="cap-piece">${ICONS[p]}</span>`).join('');
  document.getElementById('capByBlack').innerHTML = sortV(capB).map(p=>`<span class="cap-piece">${ICONS[p]}</span>`).join('');
}

let movesPrinted = 0;
function updateMoveHistory(note) {
  const el = document.getElementById('moveList');
  movesPrinted++;
  const mn = Math.ceil(movesPrinted/2);
  if (movesPrinted%2===1) {
    const row = document.createElement('div');
    row.className='move-row'; row.id=`mv-${mn}`;
    row.innerHTML=`<span class="move-num">${mn}.</span><span class="move-w">${note}</span><span class="move-b" id="mb-${mn}"></span>`;
    el.appendChild(row);
  } else {
    const blk = document.getElementById(`mb-${mn}`);
    if (blk) blk.textContent = note;
  }
  // Highlight last row
  el.querySelectorAll('.move-row').forEach(r=>r.classList.remove('current'));
  const last = el.lastElementChild; if(last) last.classList.add('current');
  el.scrollTop=el.scrollHeight;
}

function updateScores() {
  document.getElementById('whiteScore').textContent = scores.white;
  document.getElementById('blackScore').textContent = scores.black;
}

function showPromoModal() {
  const modal = document.getElementById('promotionModal');
  const choices = document.getElementById('promoChoices');
  const pieces = turn==='white' ? ['Q','R','B','N'] : ['q','r','b','n'];
  choices.innerHTML = pieces.map(pp=>`<button class="promo-btn" onclick="completePromo('${pp}')">${ICONS[pp]}</button>`).join('');
  modal.classList.add('show');
}

function completePromo(pp) {
  document.getElementById('promotionModal').classList.remove('show');
  if (!pendPromo) return;
  const {fr,fc,tr,tc,flag} = pendPromo;
  doMove(fr,fc,tr,tc,flag,pp);
}

function showResult(emoji, title, sub) {
  gameOver=true;
  document.getElementById('resultEmoji').textContent=emoji;
  document.getElementById('resultTitle').textContent=title;
  document.getElementById('resultSub').textContent=sub;
  document.getElementById('overlay').classList.add('show');
}

function undoMove() {
  if (!moveHist.length || aiThink) return;
  const count = (gameMode==='ai' && moveHist.length>=2) ? 2 : 1;
  for (let i=0;i<count;i++) {
    if (!moveHist.length) break;
    const s = moveHist.pop();
    board=s.board; castR=s.castR; epSq=s.epSq;
    turn=s.turn; capW=s.capW; capB=s.capB; lastMove=s.lastMove;
    movesPrinted--;
  }
  selSq=null; gameOver=false; aiThink=false;
  document.getElementById('overlay').classList.remove('show');

  // Rebuild move list display
  const el = document.getElementById('moveList');
  // Remove last row if odd move was removed, or remove last black entry
  if (count===2) { if(el.lastElementChild) el.removeChild(el.lastElementChild); movesPrinted--; }
  else {
    const lastRow = el.lastElementChild;
    if (lastRow) {
      if (movesPrinted%2===0) {
        // remove black half
        const blk = lastRow.querySelector('.move-b'); if(blk) blk.textContent='';
      } else {
        el.removeChild(lastRow); movesPrinted--;
      }
    }
  }

  renderBoard(); updateCaptured(); updateStatus();
}

function flipBoard() {
  flipped=!flipped; renderBoard();
}

function setMode(mode) {
  gameMode=mode;
  document.getElementById('btn2P').classList.toggle('active', mode==='2player');
  document.getElementById('btnAI').classList.toggle('active', mode==='ai');
  document.getElementById('levelSelector').style.display = mode === 'ai' ? 'flex' : 'none';
  initGame();
}

function setAiLevel(level) {
  aiLevel = level;
  document.getElementById('radNormal').checked = (level === 'normal');
  document.getElementById('radMedium').checked = (level === 'medium');
  document.getElementById('radHigh').checked = (level === 'high');
  initGame();
}

// =====================  INIT  =====================
function initGame() {
  board = dup(INIT);
  turn = 'white';
  selSq = null;
  epSq = null;
  castR = { wK:true, wQ:true, bK:true, bQ:true };
  capW = []; capB = [];
  moveHist = [];
  gameOver = false;
  aiThink = false;
  pendPromo = null;
  lastMove = null;
  movesPrinted = 0;

  document.getElementById('overlay').classList.remove('show');
  document.getElementById('promotionModal').classList.remove('show');
  document.getElementById('moveList').innerHTML='';
  document.getElementById('capByWhite').innerHTML='';
  document.getElementById('capByBlack').innerHTML='';

  renderBoard();
  updateStatus();
  updateScores();
}

// =====================  BOOTSTRAP  =====================
scores = { white:0, black:0 };
gameMode = '2player';
flipped = false;
initGame();
