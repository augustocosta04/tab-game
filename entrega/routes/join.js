/**
 * Rota POST /join
 * Emparelha jogadores para iniciar um jogo
 */

const { validateJoin } = require('../utils/validation');
const { verifyPassword, generateGameId } = require('../utils/crypto');
const { createInitialBoard } = require('../utils/gameLogic');
const { broadcastToGame } = require('./update');

async function join(req, res, data) {
  // Validar argumentos
  const error = validateJoin(data);
  if (error) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error }));
    return;
  }
  
  const { group, nick, password, size } = data;
  const users = global.serverState.users;
  const games = global.serverState.games;
  const waitingQueue = global.serverState.waitingQueue;
  
  // Verificar autenticação
  if (!users[nick]) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'User not registered' }));
    return;
  }
  
  if (!verifyPassword(password, users[nick].passwordHash)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid password' }));
    return;
  }
  
  // Chave para a fila de espera (group + size)
  const queueKey = `${group}-${size}`;
  
  // Verificar se há alguém à espera com mesmo group e size
  if (waitingQueue[queueKey] && waitingQueue[queueKey].nick !== nick) {
    // Emparelhar!
    const waiting = waitingQueue[queueKey];
    const gameId = waiting.game;
    
    // Remover da fila
    delete waitingQueue[queueKey];
    
    // Atualizar jogo com segundo jogador
    const game = games[gameId];
    game.players[nick] = 'Red';
    game.status = 'playing';
    game.lastActivity = Date.now();
    
    // Notificar ambos os jogadores via SSE
    const initialState = {
      pieces: game.pieces,
      initial: game.initial,
      turn: game.turn,
      step: game.step,
      players: game.players
    };
    
    broadcastToGame(gameId, initialState);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ game: gameId }));
  } else {
    // Criar novo jogo e entrar na fila
    const gameId = generateGameId(group, size, nick);
    
    // Criar jogo
    games[gameId] = {
      group,
      size,
      players: { [nick]: 'Blue' },
      initial: nick,
      turn: nick,
      step: 'from',
      pieces: createInitialBoard(size),
      dice: null,
      selected: null,
      validMoves: [],
      lastActivity: Date.now(),
      winner: null,
      status: 'waiting'
    };
    
    // Adicionar à fila de espera
    waitingQueue[queueKey] = {
      nick,
      game: gameId,
      since: Date.now()
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ game: gameId }));
  }
}

module.exports = join;
