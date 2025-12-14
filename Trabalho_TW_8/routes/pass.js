/**
 * Rota POST /pass
 * Passa a vez quando não há jogadas válidas
 */

const { validateGameAction } = require('../utils/validation');
const { verifyPassword } = require('../utils/crypto');
const { hasValidMoves } = require('../utils/gameLogic');
const { broadcastToGame } = require('./update');

async function pass(req, res, data) {
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
  
  // Verificar se pode lançar novamente (keepPlaying)
  if (gameData.dice.keepPlaying && !gameData.dice.used) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'You can roll again' }));
    return;
  }
  
  // Verificar se existem jogadas válidas
  const playerColor = gameData.players[nick];
  const canMove = hasValidMoves(gameData.pieces, gameData.dice.value, gameData.size, playerColor);
  
  if (canMove) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'You have valid moves' }));
    return;
  }
  
  // Passar a vez
  const players = Object.keys(gameData.players);
  const opponent = players.find(p => p !== nick);
  
  gameData.turn = opponent;
  gameData.dice = null;
  gameData.step = 'from';
  gameData.selected = null;
  gameData.validMoves = [];
  gameData.lastActivity = Date.now();
  
  // Notificar todos os jogadores
  broadcastToGame(game, {
    turn: opponent,
    pieces: gameData.pieces
  });
  
  // Responder ao pedido
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({}));
}

module.exports = pass;
