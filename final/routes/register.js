/**
 * Rota POST /register
 * Regista um novo utilizador ou verifica credenciais existentes
 */

const { validateAuth } = require('../utils/validation');
const { hashPassword, verifyPassword } = require('../utils/crypto');

async function register(req, res, data) {
  // Validar argumentos
  const error = validateAuth(data);
  if (error) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error }));
    return;
  }
  
  const { nick, password } = data;
  const users = global.serverState.users;
  
  // Verificar se utilizador já existe
  if (users[nick]) {
    // Verificar password
    if (verifyPassword(password, users[nick].passwordHash)) {
      // Login bem sucedido
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({}));
    } else {
      // Password errada
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'User registered with a different password' }));
    }
  } else {
    // Novo registo
    users[nick] = {
      passwordHash: hashPassword(password)
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({}));
  }
}

module.exports = register;
