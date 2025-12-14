/**
 * Rota POST /leave
 * Abandonar um jogo (desistir)
 */

const { validateGameAction } = require('../utils/validation');
const { verifyPassword } = require('../utils/crypto');
const { updateRanking } = require('../utils/gameLogic');
const { broadcastToGame, closeGameConnections } = require('./update');

async function leave(req, res, data) {
  // Validar argumentos
  const error = validateGameAction(data);
  if (error) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error }));
    return;
  }
  
  const { nick, password, game } = data;
  const users = global.serverState.users;
  const games = global.serverState.games;
  const waitingQueue = global.serverState.waitingQueue;
  
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
  
  const players = Object.keys(gameData.players);
  
  // Caso 1: Jogo ainda em espera (só 1 jogador)
  if (gameData.status === 'waiting' || players.length === 1) {
    // Remover da fila de espera
    const queueKey = `${gameData.group}-${gameData.size}`;
    if (waitingQueue[queueKey] && waitingQueue[queueKey].game === game) {
      delete waitingQueue[queueKey];
    }
    
    // Marcar jogo como terminado sem vencedor
    gameData.winner = null;
    gameData.status = 'finished';
    
    // Notificar (se houver conexão SSE)
    broadcastToGame(game, { winner: null });
    
    // Fechar conexões
    closeGameConnections(game);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({}));
    return;
  }
  
  // Caso 2: Jogo em curso - adversário ganha
  const opponent = players.find(p => p !== nick);
  
  gameData.winner = opponent;
  gameData.status = 'finished';
  
  // Atualizar ranking
  updateRanking(gameData.group, gameData.size, opponent, nick);
  
  // Notificar todos
  broadcastToGame(game, {
    winner: opponent,
    pieces: gameData.pieces
  });
  
  // Fechar conexões SSE
  closeGameConnections(game);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({}));
}

module.exports = leave;
