/**
 * Rota POST /notify
 * Notifica o servidor de uma jogada (selecionar peça ou destino)
 */

const { validateNotify } = require('../utils/validation');
const { verifyPassword } = require('../utils/crypto');
const { getValidMoves, executeMove, checkGameOver, updateRanking, indexToCoord } = require('../utils/gameLogic');
const { broadcastToGame } = require('./update');

async function notify(req, res, data) {
  // Validar argumentos
  const error = validateNotify(data);
  if (error) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error }));
    return;
  }
  
  const { nick, password, game, cell } = data;
  const users = global.serverState.users;
  const games = global.serverState.games;
  
  // Verificar autenticação
  if (!users[nick] || !verifyPassword(password, users[nick].passwordHash)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid credentials' }));
    return;
  }
  
  // Verificar se jogo existe
  if (!games[game]) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid game reference' }));
    return;
  }
  
  const gameData = games[game];
  
  // Verificar se jogador pertence ao jogo
  if (!gameData.players[nick]) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Player not in this game' }));
    return;
  }
  
  // Verificar se jogo já terminou
  if (gameData.winner) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Game already finished' }));
    return;
  }
  
  // Verificar se é a vez do jogador
  if (gameData.turn !== nick) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not your turn to play' }));
    return;
  }
  
  // Verificar se já lançou o dado
  if (gameData.dice === null) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'You need to roll the dice first' }));
    return;
  }
  
  // Verificar se cell é válido
  const maxCell = 4 * gameData.size - 1;
  if (cell > maxCell) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid cell' }));
    return;
  }
  
  const playerColor = gameData.players[nick];
  const piece = gameData.pieces[cell];
  
  gameData.lastActivity = Date.now();
  
  // Lógica depende do step atual
  if (gameData.step === 'from') {
    // Selecionar peça a mover
    
    // Verificar se é a mesma célula (desselecionar)
    if (gameData.selected === cell) {
      gameData.selected = null;
      gameData.validMoves = [];
      
      broadcastToGame(game, {
        cell,
        selected: [cell],
        step: 'from',
        turn: nick,
        dice: null,
        initial: gameData.initial,
        pieces: gameData.pieces
      });
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({}));
      return;
    }
    
    // Verificar se há peça do jogador nesta célula
    if (!piece || piece.color !== playerColor) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No valid piece at this cell' }));
      return;
    }
    
    // Calcular movimentos válidos
    const validMoves = getValidMoves(gameData.pieces, cell, gameData.dice.value, gameData.size, playerColor);
    
    if (validMoves.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'This piece has no valid moves' }));
      return;
    }
    
    // Selecionar peça
    gameData.selected = cell;
    gameData.validMoves = validMoves;
    gameData.step = 'to';
    
    // Notificar com destinos válidos
    broadcastToGame(game, {
      cell,
      selected: [cell, ...validMoves],
      step: 'from',
      turn: nick,
      dice: null,
      initial: gameData.initial,
      pieces: gameData.pieces
    });
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({}));
    
  } else if (gameData.step === 'to') {
    // Escolher destino
    
    // Verificar se clicou na peça selecionada (desselecionar)
    if (cell === gameData.selected) {
      gameData.selected = null;
      gameData.validMoves = [];
      gameData.step = 'from';
      
      // Recalcular peças que podem mover
      const movablePieces = [];
      for (let i = 0; i < gameData.pieces.length; i++) {
        const p = gameData.pieces[i];
        if (p && p.color === playerColor) {
          const moves = getValidMoves(gameData.pieces, i, gameData.dice.value, gameData.size, playerColor);
          if (moves.length > 0) {
            movablePieces.push(i);
          }
        }
      }
      
      broadcastToGame(game, {
        deselected: true,
        movable: movablePieces,
        turn: nick,
        pieces: gameData.pieces
      });
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({}));
      return;
    }
    
    // Verificar se destino é válido
    if (!gameData.validMoves.includes(cell)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid move: must play the dice\'s value' }));
      return;
    }
    
    // Verificar se não está a capturar peça própria
    if (piece && piece.color === playerColor) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Cannot capture your own piece' }));
      return;
    }
    
    // Executar movimento
    const fromCell = gameData.selected;
    const { captured } = executeMove(gameData.pieces, fromCell, cell, gameData.size);
    
    // Marcar dado como usado
    gameData.dice.used = true;
    
    // Verificar fim do jogo
    const { finished, winnerColor } = checkGameOver(gameData.pieces);
    
    if (finished) {
      // Encontrar nick do vencedor
      const winner = Object.entries(gameData.players).find(([n, c]) => c === winnerColor)?.[0];
      const loser = Object.entries(gameData.players).find(([n, c]) => c !== winnerColor)?.[0];
      
      gameData.winner = winner;
      
      // Atualizar ranking
      updateRanking(gameData.group, gameData.size, winner, loser);
      
      // Notificar fim do jogo
      broadcastToGame(game, {
        winner,
        pieces: gameData.pieces
      });
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({}));
      return;
    }
    
    // Preparar para próximo turno
    const players = Object.keys(gameData.players);
    const opponent = players.find(p => p !== nick);
    
    // Verificar se repete a vez (keepPlaying)
    let nextTurn = opponent;
    if (gameData.dice.keepPlaying) {
      nextTurn = nick;
      gameData.dice = null; // Precisa lançar novamente
    } else {
      gameData.dice = null;
    }
    
    gameData.turn = nextTurn;
    gameData.step = 'from';
    gameData.selected = null;
    gameData.validMoves = [];
    
    // Criar objeto cell para resposta
    const cellCoord = indexToCoord(cell, gameData.size);
    const cellObj = {
      square: cell,
      position: cellCoord.col
    };
    
    // Notificar movimento
    broadcastToGame(game, {
      moveComplete: true,  // Indica que movimento foi concluído - limpar highlights
      cell: cellObj,       // Formato: {square, position}
      from: fromCell,
      to: cell,
      turn: nextTurn,
      step: 'from',
      initial: gameData.initial,
      pieces: gameData.pieces
    });
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({}));
  }
}

module.exports = notify;
