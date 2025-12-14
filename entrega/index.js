/**
 * Servidor TÂB - Tecnologias Web
 * Ficheiro principal que inicia o servidor HTTP
 */

const http = require('http');
const url = require('url');

// Importar rotas
const register = require('./routes/register');
const ranking = require('./routes/ranking');
const join = require('./routes/join');
const leave = require('./routes/leave');
const roll = require('./routes/roll');
const pass = require('./routes/pass');
const notify = require('./routes/notify');
const update = require('./routes/update');

// Importar utilidades
const { loadData, saveData } = require('./utils/storage');

// Configuração
const PORT = process.env.PORT || 8008;

// Estado global do servidor
global.serverState = {
  users: loadData('users') || {},
  games: loadData('games') || {},
  rankings: loadData('rankings') || {},
  waitingQueue: loadData('waitingQueue') || {},
  sseClients: {} // game -> { nick -> response }
};

// Guardar dados periodicamente
setInterval(() => {
  saveData('users', global.serverState.users);
  saveData('games', global.serverState.games);
  saveData('rankings', global.serverState.rankings);
  saveData('waitingQueue', global.serverState.waitingQueue);
}, 5000);

// Verificar timeouts (2 minutos)
setInterval(() => {
  const now = Date.now();
  const TIMEOUT = 2 * 60 * 1000; // 2 minutos
  
  for (const [gameId, game] of Object.entries(global.serverState.games)) {
    if (game.winner) continue; // jogo já terminou
    
    if (game.lastActivity && (now - game.lastActivity) > TIMEOUT) {
      // Timeout - jogador atual perde
      const loser = game.turn;
      const players = Object.keys(game.players);
      const winner = players.find(p => p !== loser);
      
      if (winner) {
        game.winner = winner;
        
        // Atualizar ranking
        const { updateRanking } = require('./utils/gameLogic');
        updateRanking(game.group, game.size, winner, loser);
        
        // Notificar via SSE
        const { broadcastToGame } = require('./routes/update');
        broadcastToGame(gameId, { winner, pieces: game.pieces });
      }
    }
  }
}, 10000);

// Criar servidor HTTP
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  try {
    // Routing
    if (req.method === 'POST') {
      // Ler body JSON
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }
      
      let data = {};
      if (body) {
        try {
          data = JSON.parse(body);
        } catch {
          sendError(res, 400, 'Invalid JSON');
          return;
        }
      }
      
      // Rotas POST
      switch (pathname) {
        case '/register':
          await register(req, res, data);
          break;
        case '/ranking':
          await ranking(req, res, data);
          break;
        case '/join':
          await join(req, res, data);
          break;
        case '/leave':
          await leave(req, res, data);
          break;
        case '/roll':
          await roll(req, res, data);
          break;
        case '/pass':
          await pass(req, res, data);
          break;
        case '/notify':
          await notify(req, res, data);
          break;
        default:
          sendError(res, 404, 'Unknown endpoint');
      }
    } else if (req.method === 'GET') {
      // Rotas GET
      if (pathname === '/update') {
        await update(req, res, parsedUrl.query);
      } else {
        sendError(res, 404, 'Unknown endpoint');
      }
    } else {
      sendError(res, 404, 'Method not allowed');
    }
  } catch (err) {
    console.error('Server error:', err);
    sendError(res, 500, 'Internal server error');
  }
});

// Helper para enviar erros
function sendError(res, statusCode, message) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: message }));
}

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`Servidor TÂB a correr na porta ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nA guardar dados...');
  saveData('users', global.serverState.users);
  saveData('games', global.serverState.games);
  saveData('rankings', global.serverState.rankings);
  saveData('waitingQueue', global.serverState.waitingQueue);
  process.exit(0);
});
