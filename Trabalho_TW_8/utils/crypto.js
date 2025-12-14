/**
 * Módulo de criptografia - hash MD5 para passwords e game IDs
 */

const crypto = require('crypto');

/**
 * Criar hash MD5 de um valor
 * @param {string} value - valor a cifrar
 * @returns {string} hash em hexadecimal
 */
function md5(value) {
  return crypto
    .createHash('md5')
    .update(String(value))
    .digest('hex');
}

/**
 * Cifrar password
 * @param {string} password 
 * @returns {string} hash da password
 */
function hashPassword(password) {
  return md5(password);
}

/**
 * Verificar password
 * @param {string} password - password em texto
 * @param {string} hash - hash guardado
 * @returns {boolean}
 */
function verifyPassword(password, hash) {
  return md5(password) === hash;
}

/**
 * Gerar ID único para um jogo
 * @param {number} group 
 * @param {number} size 
 * @param {string} nick1 
 * @param {string} nick2 
 * @returns {string} hash único
 */
function generateGameId(group, size, nick1, nick2 = '') {
  const data = `${group}-${size}-${nick1}-${nick2}-${Date.now()}-${Math.random()}`;
  return md5(data);
}

module.exports = { md5, hashPassword, verifyPassword, generateGameId };
