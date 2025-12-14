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
  // first pode ser 'blue', 'red' ou 'random'
  const first = data.first || 'blue';
  
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
  
  // Verificar se jogador já está num jogo ativo
  for (const [gameId, game] of Object.entries(games)) {
    if (game.players[nick] && !game.winner && game.status === 'playing') {
      // Já está num jogo - retornar esse jogo
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ game: gameId }));
      return;
    }
  }
  
  // Limpar entradas antigas na fila (mais de 2 minutos)
  const now = Date.now();
  const QUEUE_TIMEOUT = 2 * 60 * 1000; // 2 minutos
  for (const [key, entry] of Object.entries(waitingQueue)) {
    if (now - entry.since > QUEUE_TIMEOUT) {
      // Remover jogo associado se ainda estiver à espera
      if (games[entry.game] && games[entry.game].status === 'waiting') {
        delete games[entry.game];
      }
      delete waitingQueue[key];
    }
  }
  
  // Remover jogador da fila se já estiver (para permitir reentrada)
  for (const [key, entry] of Object.entries(waitingQueue)) {
    if (entry.nick === nick) {
      // Remover jogo antigo
      if (games[entry.game] && games[entry.game].status === 'waiting') {
        delete games[entry.game];
      }
      delete waitingQueue[key];
    }
  }
  
  // Chave para a fila de espera (group + size + first)
  // Assim só emparelha jogadores com a mesma escolha de quem começa
  const queueKey = `${group}-${size}-${first}`;
  
  // Verificar se há alguém à espera com mesmo group, size e first
  if (waitingQueue[queueKey] && waitingQueue[queueKey].nick !== nick) {
    // Emparelhar!
    const waiting = waitingQueue[queueKey];
    const gameId = waiting.game;
    
    // Verificar se o jogo ainda existe
    if (!games[gameId]) {
      // Jogo foi removido, limpar fila
      delete waitingQueue[queueKey];
    } else {
      // Remover da fila
      delete waitingQueue[queueKey];
      
      // Atualizar jogo com segundo jogador
      const game = games[gameId];
      game.players[nick] = 'Red';
      game.status = 'playing';
      game.lastActivity = Date.now();
      
      // Determinar quem começa baseado no first
      const blueNick = waiting.nick;
      const redNick = nick;
      
      if (first === 'blue') {
        game.turn = blueNick;
      } else if (first === 'red') {
        game.turn = redNick;
      } else {
        // random
        game.turn = Math.random() < 0.5 ? blueNick : redNick;
      }
      
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
      return;
    }
  }
  
  // Criar novo jogo e entrar na fila
  const gameId = generateGameId(group, size, nick);
  
  // Criar jogo - turn será definido quando segundo jogador entrar
  games[gameId] = {
    group,
    size,
    first, // Guardar a escolha de quem começa
    players: { [nick]: 'Blue' },
    initial: nick, // Quem criou o jogo (Blue)
    turn: nick, // Temporário, será ajustado quando Red entrar
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
    first,
    since: Date.now()
  };
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ game: gameId }));
}

module.exports = join;
