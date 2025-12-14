// js/ai/hard.js
// IA Difícil: avalia cada jogada com simulações rápidas (Monte Carlo).

const STICK_OUTCOMES = [
  { value: 1, p: 4 / 16 },
  { value: 2, p: 6 / 16 },
  { value: 3, p: 4 / 16 },
  { value: 4, p: 1 / 16 },
  { value: 6, p: 1 / 16 }, // 0 claras -> 6
];

function randomStickValue() {
  const r = Math.random();
  let acc = 0;
  for (const o of STICK_OUTCOMES) {
    acc += o.p;
    if (r <= acc) return o.value;
  }
  return 2;
}

// clona o estado pra não destruir o original
function cloneState(state) {
  const newGrid = state.grid.map(row =>
    row.map(cell => {
      if (!cell || cell === 0) return 0;
      return {
        color: cell.color,
        moved: cell.moved,
        visitedLast: cell.visitedLast,
      };
    })
  );
  return { grid: newGrid };
}

function countPieces(state) {
  let A = 0, V = 0;
  for (const row of state.grid) {
    for (const cell of row) {
      if (!cell || cell === 0) continue;
      if (cell.color === "A") A++; else V++;
    }
  }
  return { A, V };
}

function isTerminal(state) {
  const { A, V } = countPieces(state);
  return A === 0 || V === 0;
}

function applyMove(state, move, who) {
  const next = cloneState(state);
  const [sr, sc] = move.from;
  const [tr, tc] = move.to;
  const fromCell = next.grid[sr][sc];
  const toCell = next.grid[tr][tc];

  // captura
  if (toCell && toCell !== 0) next.grid[tr][tc] = 0;

  // tira da origem
  next.grid[sr][sc] = 0;

  const piece = {
    color: fromCell.color,
    moved: true,
    visitedLast: fromCell.visitedLast,
  };

  // marcar última fileira do oponente visitada
  const lastRowOpponent = piece.color === "V" ? 3 : 0;
  if (tr === lastRowOpponent) piece.visitedLast = true;

  // coloca na nova casa
  next.grid[tr][tc] = piece;
  return next;
}

// NOVO: checar se um movimento é captura (usado no rollout e na raiz)
function isCaptureMove(state, move) {
  const [tr, tc] = move.to;
  const target = state.grid[tr][tc];
  return !!target && target !== 0;
}

// avaliação do ponto de vista das VERMELHAS (IA)
function evaluate(state) {
  const { A, V } = countPieces(state);
  // vermelho bom, azul ruim
  let score = (V - A) * 20;

  for (let r = 0; r < state.grid.length; r++) {
    for (let c = 0; c < state.grid[0].length; c++) {
      const cell = state.grid[r][c];
      if (!cell || cell === 0) continue;

      if (cell.color === "V") {
        // avançar é bom
        score += r * 1.0;
        // peça que já foi na última fileira vale MUITO
        if (cell.visitedLast) score += 8;
      } else {
        // azul avançada ameaça a gente
        const dist = 3 - r;
        score -= dist * 0.6;
      }
    }
  }
  return score;
}

function otherPlayer(player) {
  return player === "vermelho" ? "azul" : "vermelho";
}

// simulação curta (rollout) com preferência por captura
function rollout(rootState, currentPlayer, listLegalMoves, depth = 0, maxDepth = 5) {
  let state = cloneState(rootState);
  let player = currentPlayer;

  for (let d = depth; d < maxDepth; d++) {
    if (isTerminal(state)) break;

    const roll = randomStickValue();
    const moves = listLegalMoves(state, roll, player);

    if (!moves || moves.length === 0) {
      // passa o turno
      player = otherPlayer(player);
      continue;
    }

    // preferência: capturar > qualquer outra
    const captureMoves = moves.filter(mv => isCaptureMove(state, mv));
    const chosen = (captureMoves.length > 0
      ? captureMoves[Math.floor(Math.random() * captureMoves.length)]
      : moves[Math.floor(Math.random() * moves.length)]
    );

    state = applyMove(state, chosen, player);

    // algumas jogadas repetem turno
    const repeats = (roll === 1 || roll === 4 || roll === 6);
    if (!repeats) player = otherPlayer(player);
  }
  return evaluate(state);
}

export function pickMoveMCTS(ctx) {
  const { state, steps, who, listLegalMoves } = ctx;
  const moves = listLegalMoves(state, steps, who);
  if (!moves || moves.length === 0) return null;

  const SIMS_PER_MOVE = 140; // se ficar lento, baixa pra 100
  const MAX_DEPTH = 5;

  let bestMove = null;
  let bestScore = -Infinity;

  for (const mv of moves) {
    const afterRoot = applyMove(state, mv, who);

    // vitória imediata tem prioridade
    if (isTerminal(afterRoot)) {
      return mv;
    }

    let total = 0;
    for (let i = 0; i < SIMS_PER_MOVE; i++) {
      const score = rollout(afterRoot, otherPlayer(who), listLegalMoves, 0, MAX_DEPTH);
      total += score;
    }
    let avg = total / SIMS_PER_MOVE;

    // pequeno bônus se for captura logo na raiz
    if (isCaptureMove(state, mv)) {
      avg += 15;
    }

    if (avg > bestScore) {
      bestScore = avg;
      bestMove = mv;
    }
  }
  return bestMove;
}
