/**
 * Módulo de validação de argumentos
 */

/**
 * Verificar se um valor é string não vazia
 */
function isValidString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Verificar se um valor é inteiro positivo
 */
function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

/**
 * Verificar se um valor é inteiro não negativo
 */
function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

/**
 * Verificar se size é válido (inteiro ímpar entre 5 e 15)
 */
function isValidSize(size) {
  return Number.isInteger(size) && size >= 5 && size <= 15 && size % 2 === 1;
}

/**
 * Validar argumentos de autenticação (nick + password)
 * @returns {string|null} mensagem de erro ou null se válido
 */
function validateAuth(data) {
  if (!isValidString(data.nick)) {
    return 'Missing or invalid nick';
  }
  if (!isValidString(data.password)) {
    return 'Missing or invalid password';
  }
  return null;
}

/**
 * Validar argumentos do join
 * @returns {string|null} mensagem de erro ou null se válido
 */
function validateJoin(data) {
  const authError = validateAuth(data);
  if (authError) return authError;
  
  if (!isPositiveInteger(data.group)) {
    return 'Undefined group';
  }
  if (data.size === undefined) {
    return 'Undefined size';
  }
  if (!isValidSize(data.size)) {
    return `Invalid size '${data.size}'`;
  }
  return null;
}

/**
 * Validar argumentos de jogo (nick + password + game)
 * @returns {string|null} mensagem de erro ou null se válido
 */
function validateGameAction(data) {
  const authError = validateAuth(data);
  if (authError) return authError;
  
  if (!isValidString(data.game)) {
    return 'Missing or invalid game';
  }
  return null;
}

/**
 * Validar argumentos do notify
 * @returns {string|null} mensagem de erro ou null se válido
 */
function validateNotify(data) {
  const gameError = validateGameAction(data);
  if (gameError) return gameError;
  
  if (data.cell === undefined) {
    return 'Missing cell';
  }
  if (!Number.isInteger(data.cell)) {
    return 'Cell is not an integer';
  }
  if (data.cell < 0) {
    return 'Cell is negative';
  }
  return null;
}

/**
 * Validar argumentos do ranking
 * @returns {string|null} mensagem de erro ou null se válido
 */
function validateRanking(data) {
  if (data.group === undefined) {
    return 'Undefined group';
  }
  if (!isPositiveInteger(data.group)) {
    return `Invalid group '${data.group}'`;
  }
  if (data.size === undefined) {
    return `Invalid size 'undefined'`;
  }
  if (!isValidSize(data.size)) {
    return `Invalid size '${data.size}'`;
  }
  return null;
}

module.exports = {
  isValidString,
  isPositiveInteger,
  isNonNegativeInteger,
  isValidSize,
  validateAuth,
  validateJoin,
  validateGameAction,
  validateNotify,
  validateRanking
};
