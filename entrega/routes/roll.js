/**
 * Rota POST /roll
 * Lança o dado de paus
 */

const { validateGameAction } = require('../utils/validation');
const { verifyPassword } = require('../utils/crypto');
const { rollDice, hasValidMoves } = require('../utils/gameLogic');
const { broadcastToGame } = require('./update');

async function roll(req, res, data) {
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
  
  // Verificar se já lançou o dado neste turno
  if (gameData.dice !== null) {
    // Verificar se pode lançar novamente (keepPlaying e não tem jogadas válidas ou já fez uma jogada)
    if (gameData.dice.keepPlaying && gameData.step === 'from' && !gameData.dice.used) {
      // Pode relançar se não há jogadas válidas
      const playerColor = gameData.players[nick];
      const canMove = hasValidMoves(gameData.pieces, gameData.dice.value, gameData.size, playerColor);
      
      if (canMove) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'You already rolled the dice and have valid moves' }));
        return;
      }
      // Pode relançar - continua abaixo
    } else if (!gameData.dice.keepPlaying || gameData.dice.used) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'You already rolled the dice but can roll it again' }));
      return;
    }
  }
  
  // Lançar dado
  const diceResult = rollDice();
  gameData.dice = {
    ...diceResult,
    used: false
  };
  gameData.step = 'from';
  gameData.selected = null;
  gameData.validMoves = [];
  gameData.lastActivity = Date.now();
  
  // Verificar se há jogadas válidas
  const playerColor = gameData.players[nick];
  const canMove = hasValidMoves(gameData.pieces, diceResult.value, gameData.size, playerColor);
  
  // Preparar resposta SSE
  const updateData = {
    dice: {
      stickValues: diceResult.stickValues,
      value: diceResult.value,
      keepPlaying: diceResult.keepPlaying
    },
    turn: nick,
    mustPass: canMove ? null : nick
  };
  
  // Notificar todos os jogadores
  broadcastToGame(game, updateData);
  
  // Responder ao pedido
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({}));
}

module.exports = roll;
