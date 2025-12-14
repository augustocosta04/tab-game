/**
 * Lógica do jogo TÂB
 * Implementa as regras do jogo egípcio
 */

/**
 * Criar estado inicial do tabuleiro
 * @param {number} size - número de colunas
 * @param {string} initialPlayer - nick do jogador inicial (Blue)
 * @returns {Array} array de peças (4 * size posições)
 */
function createInitialBoard(size) {
  // O tabuleiro é um array linear de 4 * size posições
  // Posição 0 = canto inferior direito (do ponto de vista do jogador inicial)
  // Linha 0 (inferior): posições 0 a size-1 (Blue - jogador inicial)
  // Linha 1: posições size a 2*size-1
  // Linha 2: posições 2*size a 3*size-1
  // Linha 3 (superior): posições 3*size a 4*size-1 (Red - adversário)
  
  const pieces = new Array(4 * size).fill(null);
  
  // Peças Blue na linha inferior (0 a size-1)
  for (let i = 0; i < size; i++) {
    pieces[i] = { color: 'Blue', inMotion: false, reachedLastRow: false };
  }
  
  // Peças Red na linha superior (3*size a 4*size-1)
  for (let i = 3 * size; i < 4 * size; i++) {
    pieces[i] = { color: 'Red', inMotion: false, reachedLastRow: false };
  }
  
  return pieces;
}

/**
 * Lançar o dado de paus
 * @returns {object} { stickValues, value, keepPlaying }
 */
function rollDice() {
  // 4 paus, cada um com 50% de chance de ser clara (true) ou escura (false)
  const stickValues = [
    Math.random() < 0.5,
    Math.random() < 0.5,
    Math.random() < 0.5,
    Math.random() < 0.5
  ];
  
  // Contar faces claras
  const claras = stickValues.filter(v => v).length;
  
  // Valor: 0 claras = 6, senão = número de claras
  const value = claras === 0 ? 6 : claras;
  
  // Repete a vez se tirar 1, 4 ou 6
  const keepPlaying = value === 1 || value === 4 || value === 6;
  
  return { stickValues, value, keepPlaying };
}

/**
 * Converter coordenadas (row, col) para índice linear
 * @param {number} row - linha (0-3)
 * @param {number} col - coluna (0 a size-1)
 * @param {number} size - número de colunas
 * @returns {number} índice no array
 */
function coordToIndex(row, col, size) {
  return row * size + col;
}

/**
 * Converter índice linear para coordenadas (row, col)
 * @param {number} index 
 * @param {number} size 
 * @returns {{row: number, col: number}}
 */
function indexToCoord(index, size) {
  return {
    row: Math.floor(index / size),
    col: index % size
  };
}

/**
 * Obter a linha inicial de uma cor
 * @param {string} color - 'Blue' ou 'Red'
 * @returns {number} linha (0 ou 3)
 */
function getInitialRow(color) {
  return color === 'Blue' ? 0 : 3;
}

/**
 * Obter a última linha do adversário
 * @param {string} color - 'Blue' ou 'Red'
 * @returns {number} linha (3 ou 0)
 */
function getOpponentLastRow(color) {
  return color === 'Blue' ? 3 : 0;
}

/**
 * Verificar se há peças na linha inicial
 * @param {Array} pieces 
 * @param {number} size 
 * @param {string} color 
 * @returns {boolean}
 */
function hasOwnPiecesOnInitialRow(pieces, size, color) {
  const row = getInitialRow(color);
  const start = row * size;
  const end = start + size;
  
  for (let i = start; i < end; i++) {
    if (pieces[i] && pieces[i].color === color) {
      return true;
    }
  }
  return false;
}

/**
 * Obter direção de movimento numa linha
 * @param {number} row 
 * @returns {number} -1 (esquerda) ou +1 (direita)
 */
function getRowDirection(row) {
  // Linhas 0 e 2 movem para a esquerda (direção -)
  // Linhas 1 e 3 movem para a direita (direção +)
  return (row === 0 || row === 2) ? -1 : 1;
}

/**
 * Calcular próximas posições a partir de uma posição
 * @param {number} index - posição atual
 * @param {number} size - tamanho do tabuleiro
 * @returns {Array<number>} lista de índices adjacentes
 */
function getNextPositions(index, size) {
  const { row, col } = indexToCoord(index, size);
  const dir = getRowDirection(row);
  const nextCol = col + dir;
  const last = size - 1;
  const next = [];
  
  // Movimento normal na mesma linha
  if (nextCol >= 0 && nextCol <= last) {
    next.push(coordToIndex(row, nextCol, size));
  } else {
    // Bordas - transição entre linhas
    if (row === 0 && col === 0) {
      // (0,0) -> (1,0)
      next.push(coordToIndex(1, 0, size));
    } else if (row === 1 && col === last) {
      // (1,last) -> (2,last) ou (0,last)
      next.push(coordToIndex(2, last, size));
      next.push(coordToIndex(0, last, size));
    } else if (row === 2 && col === 0) {
      // (2,0) -> (1,0) ou (3,0)
      next.push(coordToIndex(1, 0, size));
      next.push(coordToIndex(3, 0, size));
    } else if (row === 3 && col === last) {
      // (3,last) -> (2,last)
      next.push(coordToIndex(2, last, size));
    }
  }
  
  return next;
}

/**
 * Calcular destinos válidos para uma peça
 * @param {Array} pieces - estado do tabuleiro
 * @param {number} fromIndex - posição da peça
 * @param {number} steps - valor do dado
 * @param {number} size - tamanho do tabuleiro
 * @param {string} playerColor - cor do jogador
 * @returns {Array<number>} lista de índices de destino válidos
 */
function getValidMoves(pieces, fromIndex, steps, size, playerColor) {
  const piece = pieces[fromIndex];
  if (!piece || piece.color !== playerColor) {
    return [];
  }
  
  // Primeira jogada de uma peça só com valor 1
  if (!piece.inMotion && steps !== 1) {
    return [];
  }
  
  // Peça na última linha do adversário só pode mover se não houver peças na linha inicial
  const { row } = indexToCoord(fromIndex, size);
  const opponentLastRow = getOpponentLastRow(playerColor);
  if (row === opponentLastRow && hasOwnPiecesOnInitialRow(pieces, size, playerColor)) {
    return [];
  }
  
  // BFS para encontrar destinos em exatamente 'steps' passos
  let frontier = new Set([fromIndex]);
  
  for (let k = 0; k < steps; k++) {
    const nextFrontier = new Set();
    
    for (const pos of frontier) {
      const nextPositions = getNextPositions(pos, size);
      
      for (const nextPos of nextPositions) {
        const isLastStep = (k === steps - 1);
        const occupant = pieces[nextPos];
        
        if (occupant) {
          // Casa ocupada
          if (isLastStep) {
            // Pode capturar inimigo no último passo
            if (occupant.color !== playerColor) {
              nextFrontier.add(nextPos);
            }
            // Não pode pousar em peça própria
          } else {
            // Pode atravessar qualquer peça no meio do caminho
            nextFrontier.add(nextPos);
          }
        } else {
          // Casa vazia
          nextFrontier.add(nextPos);
        }
      }
    }
    
    frontier = nextFrontier;
    if (frontier.size === 0) break;
  }
  
  // Filtrar destinos inválidos
  const validMoves = [];
  const initialRow = getInitialRow(playerColor);
  
  for (const destIndex of frontier) {
    const destCoord = indexToCoord(destIndex, size);
    
    // Não pode pousar na própria linha inicial vindo de outra linha
    if (destCoord.row === initialRow && row !== initialRow) {
      continue;
    }
    
    // Peça "abençoada" não pode REENTRAR na última linha do adversário
    // (só bloqueia se a peça NÃO está na última linha mas tenta ir para lá)
    if (piece.reachedLastRow && row !== opponentLastRow && destCoord.row === opponentLastRow) {
      continue;
    }
    
    // Não pode pousar em peça própria (já filtrado acima, mas por segurança)
    const occupant = pieces[destIndex];
    if (occupant && occupant.color === playerColor) {
      continue;
    }
    
    validMoves.push(destIndex);
  }
  
  return validMoves;
}

/**
 * Verificar se existem jogadas válidas para um jogador
 * @param {Array} pieces 
 * @param {number} steps 
 * @param {number} size 
 * @param {string} playerColor 
 * @returns {boolean}
 */
function hasValidMoves(pieces, steps, size, playerColor) {
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i];
    if (piece && piece.color === playerColor) {
      const moves = getValidMoves(pieces, i, steps, size, playerColor);
      if (moves.length > 0) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Executar um movimento
 * @param {Array} pieces - estado do tabuleiro (será modificado)
 * @param {number} fromIndex 
 * @param {number} toIndex 
 * @param {number} size 
 * @returns {{captured: boolean, piece: object}}
 */
function executeMove(pieces, fromIndex, toIndex, size) {
  const piece = pieces[fromIndex];
  const captured = pieces[toIndex] !== null;
  
  // Mover peça
  pieces[toIndex] = piece;
  pieces[fromIndex] = null;
  
  // Marcar como movida
  piece.inMotion = true;
  
  // Verificar se chegou à última linha do adversário
  const { row } = indexToCoord(toIndex, size);
  const opponentLastRow = getOpponentLastRow(piece.color);
  if (row === opponentLastRow) {
    piece.reachedLastRow = true;
  }
  
  return { captured, piece };
}

/**
 * Verificar se o jogo terminou
 * @param {Array} pieces 
 * @returns {{finished: boolean, winner: string|null}}
 */
function checkGameOver(pieces) {
  let blueCount = 0;
  let redCount = 0;
  
  for (const piece of pieces) {
    if (piece) {
      if (piece.color === 'Blue') blueCount++;
      else redCount++;
    }
  }
  
  if (blueCount === 0) {
    return { finished: true, winnerColor: 'Red' };
  }
  if (redCount === 0) {
    return { finished: true, winnerColor: 'Blue' };
  }
  
  return { finished: false, winnerColor: null };
}

/**
 * Atualizar ranking
 * @param {number} group 
 * @param {number} size 
 * @param {string} winnerNick 
 * @param {string} loserNick 
 */
function updateRanking(group, size, winnerNick, loserNick) {
  const rankings = global.serverState.rankings;
  
  if (!rankings[group]) {
    rankings[group] = {};
  }
  if (!rankings[group][size]) {
    rankings[group][size] = {};
  }
  
  const sizeRanking = rankings[group][size];
  
  // Inicializar jogadores se não existirem
  if (!sizeRanking[winnerNick]) {
    sizeRanking[winnerNick] = { games: 0, victories: 0 };
  }
  if (!sizeRanking[loserNick]) {
    sizeRanking[loserNick] = { games: 0, victories: 0 };
  }
  
  // Atualizar estatísticas
  sizeRanking[winnerNick].games++;
  sizeRanking[winnerNick].victories++;
  sizeRanking[loserNick].games++;
}

/**
 * Obter ranking formatado
 * @param {number} group 
 * @param {number} size 
 * @returns {Array} top 10 jogadores ordenados por vitórias
 */
function getRanking(group, size) {
  const rankings = global.serverState.rankings;
  
  if (!rankings[group] || !rankings[group][size]) {
    return [];
  }
  
  const sizeRanking = rankings[group][size];
  
  // Converter para array e ordenar
  const sorted = Object.entries(sizeRanking)
    .map(([nick, stats]) => ({
      nick,
      games: stats.games,
      victories: stats.victories
    }))
    .sort((a, b) => b.victories - a.victories)
    .slice(0, 10);
  
  return sorted;
}

module.exports = {
  createInitialBoard,
  rollDice,
  coordToIndex,
  indexToCoord,
  getInitialRow,
  getOpponentLastRow,
  hasOwnPiecesOnInitialRow,
  getRowDirection,
  getNextPositions,
  getValidMoves,
  hasValidMoves,
  executeMove,
  checkGameOver,
  updateRanking,
  getRanking
};
