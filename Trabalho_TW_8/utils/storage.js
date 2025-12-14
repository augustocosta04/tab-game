/**
 * Módulo de persistência - guarda/carrega dados em ficheiros JSON
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Garantir que a pasta data existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Carregar dados de um ficheiro JSON
 * @param {string} filename - nome do ficheiro (sem extensão)
 * @returns {object} dados carregados ou objeto vazio
 */
function loadData(filename) {
  const filepath = path.join(DATA_DIR, `${filename}.json`);
  try {
    if (fs.existsSync(filepath)) {
      const content = fs.readFileSync(filepath, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error(`Erro ao carregar ${filename}:`, err.message);
  }
  return {};
}

/**
 * Guardar dados num ficheiro JSON
 * @param {string} filename - nome do ficheiro (sem extensão)
 * @param {object} data - dados a guardar
 */
function saveData(filename, data) {
  const filepath = path.join(DATA_DIR, `${filename}.json`);
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Erro ao guardar ${filename}:`, err.message);
  }
}

module.exports = { loadData, saveData };
