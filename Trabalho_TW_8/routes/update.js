/**
 * Rota GET /update
 * Server-Sent Events para notificações em tempo real
 */

const { isValidString } = require('../utils/validation');

// Clientes SSE conectados: game -> { nick -> response }
const sseClients = {};

/**
 * Handler da rota GET /update
 */
async function update(req, res, query) {
  const { nick, game } = query;
  
  // Validar argumentos
  if (!isValidString(nick) || !isValidString(game)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid game reference' }));
    return;
  }
  
  const games = global.serverState.games;
  
  // Verificar se jogo existe
  if (!games[game]) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid game reference' }));
    return;
  }
  
  // Verificar se jogador pertence ao jogo
  const gameData = games[game];
  if (!gameData.players[nick]) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Player not in this game' }));
    return;
  }
  
  // Configurar SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  
  // Registar cliente
  if (!sseClients[game]) {
    sseClients[game] = {};
  }
  sseClients[game][nick] = res;
  
  // Enviar estado atual se o jogo já começou
  if (gameData.status === 'playing') {
    const initialState = {
      pieces: gameData.pieces,
      initial: gameData.initial,
      turn: gameData.turn,
      step: gameData.step,
      players: gameData.players
    };
    
    if (gameData.dice) {
      initialState.dice = gameData.dice;
    }
    if (gameData.selected !== null) {
      initialState.selected = gameData.validMoves;
      initialState.cell = gameData.selected;
    }
    
    sendSSE(res, initialState);
  }
  
  // Cleanup quando conexão fecha
  req.on('close', () => {
    if (sseClients[game]) {
      delete sseClients[game][nick];
      if (Object.keys(sseClients[game]).length === 0) {
        delete sseClients[game];
      }
    }
  });
}

/**
 * Enviar evento SSE para um cliente
 * @param {Response} res 
 * @param {object} data 
 */
function sendSSE(res, data) {
  try {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch (err) {
    // Cliente desconectado
  }
}

/**
 * Enviar evento para todos os jogadores de um jogo
 * @param {string} gameId 
 * @param {object} data 
 */
function broadcastToGame(gameId, data) {
  if (!sseClients[gameId]) return;
  
  for (const [nick, res] of Object.entries(sseClients[gameId])) {
    sendSSE(res, data);
  }
}

/**
 * Enviar evento para um jogador específico
 * @param {string} gameId 
 * @param {string} nick 
 * @param {object} data 
 */
function sendToPlayer(gameId, nick, data) {
  if (!sseClients[gameId] || !sseClients[gameId][nick]) return;
  sendSSE(sseClients[gameId][nick], data);
}

/**
 * Fechar conexões SSE de um jogo
 * @param {string} gameId 
 */
function closeGameConnections(gameId) {
  if (!sseClients[gameId]) return;
  
  for (const res of Object.values(sseClients[gameId])) {
    try {
      res.end();
    } catch {}
  }
  
  delete sseClients[gameId];
}

module.exports = update;
module.exports.broadcastToGame = broadcastToGame;
module.exports.sendToPlayer = sendToPlayer;
module.exports.closeGameConnections = closeGameConnections;
module.exports.sendSSE = sendSSE;
