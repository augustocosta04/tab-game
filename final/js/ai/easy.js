// ai/easy.js
// IA Fácil: random com pitadas (+2 captura, +1 sair de peça virgem com steps===1)

function weightedChoice(items, weightFn) {
  const weights = items.map(weightFn);
  const sum = weights.reduce((a,b)=>a+b, 0);
  if (sum <= 0) return items[Math.floor(Math.random()*items.length)];
  let r = Math.random() * sum;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * @typedef {{from:[number,number], to:[number,number]}} Move
 *
 * @param {object} ctx
 * @param {any}    ctx.state           - Estado headless do tabuleiro (ou o que você quiser passar).
 * @param {number} ctx.steps           - Valor dos sticks já rolado.
 * @param {'azul'|'vermelho'} ctx.who  - Quem joga (as vermelhas serão IA).
 * @param {(state:any, steps:number, who:string)=>Move[]} ctx.listLegalMoves - Função que retorna TODAS as jogadas legais.
 * @param {(r:number,c:number)=>any} [ctx.getCell]       - (Opcional) lê uma célula do tabuleiro (para detectar captura).
 * @param {(r:number,c:number)=>boolean} [ctx.isVirgin]  - (Opcional) diz se a peça em (r,c) ainda é “virgem” (nunca moveu).
 * @returns {Move|null}
 */
export function pickMoveEasy(ctx) {
  const { state, steps, who, listLegalMoves, getCell, isVirgin } = ctx;
  const moves = listLegalMoves(state, steps, who);
  if (!moves || moves.length === 0) return null;

  const opponent = who === 'vermelho' ? 'azul' : 'vermelho';

  function isCapture(move) {
    if (!getCell) return false;
    const [tr, tc] = move.to;
    const cell = getCell(tr, tc);
    return cell && cell.player === opponent; // ajuste se tua célula usa outra chave
  }

  function leavesVirgin(move) {
    if (!isVirgin) return false;
    const [sr, sc] = move.from;
    return isVirgin(sr, sc) && steps === 1;
  }

  return weightedChoice(moves, (mv) => {
    let w = 1;
    if (isCapture(mv)) w += 2;
    if (leavesVirgin(mv)) w += 1;
    return w;
  });
}
