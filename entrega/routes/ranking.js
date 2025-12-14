/**
 * Rota POST /ranking
 * Retorna a tabela classificativa para um grupo e tamanho
 */

const { validateRanking } = require('../utils/validation');
const { getRanking } = require('../utils/gameLogic');

async function ranking(req, res, data) {
  // Validar argumentos
  const error = validateRanking(data);
  if (error) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error }));
    return;
  }
  
  const { group, size } = data;
  
  // Obter ranking
  const rankingList = getRanking(group, size);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ranking: rankingList }));
}

module.exports = ranking;
