/**
 * Módulo de comunicação com o servidor TÂB
 * Gere todas as chamadas à API REST e SSE
 */

// URL base do servidor backend
// O servidor Node.js sempre roda na porta 8008
const API_BASE = 'http://localhost:8008';

/**
 * Fazer pedido POST ao servidor
 * @param {string} endpoint - nome da rota (sem /)
 * @param {object} data - dados a enviar
 * @returns {Promise<object>} resposta do servidor
 */
async function post(endpoint, data) {
  try {
    const response = await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }
    
    return result;
  } catch (err) {
    console.error(`API ${endpoint} error:`, err);
    throw err;
  }
}

/**
 * Registar ou autenticar utilizador
 * @param {string} nick 
 * @param {string} password 
 * @returns {Promise<object>}
 */
export function register(nick, password) {
  return post('register', { nick, password });
}

/**
 * Entrar na fila para um jogo
 * @param {number} group 
 * @param {string} nick 
 * @param {string} password 
 * @param {number} size 
 * @param {string} first - 'blue', 'red' ou 'random'
 * @returns {Promise<{game: string}>}
 */
export function join(group, nick, password, size, first = 'blue') {
  return post('join', { group, nick, password, size, first });
}

/**
 * Abandonar/desistir de um jogo
 * @param {string} nick 
 * @param {string} password 
 * @param {string} game 
 * @returns {Promise<object>}
 */
export function leave(nick, password, game) {
  return post('leave', { nick, password, game });
}

/**
 * Lançar o dado
 * @param {string} nick 
 * @param {string} password 
 * @param {string} game 
 * @returns {Promise<object>}
 */
export function roll(nick, password, game) {
  return post('roll', { nick, password, game });
}

/**
 * Passar a vez
 * @param {string} nick 
 * @param {string} password 
 * @param {string} game 
 * @returns {Promise<object>}
 */
export function pass(nick, password, game) {
  return post('pass', { nick, password, game });
}

/**
 * Notificar jogada (selecionar peça ou destino)
 * @param {string} nick 
 * @param {string} password 
 * @param {string} game 
 * @param {number} cell - índice da célula
 * @returns {Promise<object>}
 */
export function notify(nick, password, game, cell) {
  return post('notify', { nick, password, game, cell });
}

/**
 * Obter ranking
 * @param {number} group 
 * @param {number} size 
 * @returns {Promise<{ranking: Array}>}
 */
export function ranking(group, size) {
  return post('ranking', { group, size });
}

/**
 * Conectar ao servidor via SSE para receber atualizações
 * @param {string} nick 
 * @param {string} game 
 * @param {function} onMessage - callback para mensagens
 * @param {function} onError - callback para erros
 * @returns {EventSource}
 */
export function connectSSE(nick, game, onMessage, onError) {
  const url = `${API_BASE}/update?nick=${encodeURIComponent(nick)}&game=${encodeURIComponent(game)}`;
  const source = new EventSource(url);
  
  source.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (err) {
      console.error('SSE parse error:', err);
    }
  };
  
  source.onerror = (err) => {
    console.error('SSE error:', err);
    if (onError) onError(err);
  };
  
  return source;
}

/**
 * Fechar conexão SSE
 * @param {EventSource} source 
 */
export function closeSSE(source) {
  if (source) {
    source.close();
  }
}

// Exportar API_BASE para configuração
export { API_BASE };
