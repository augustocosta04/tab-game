// ai/medium.js
// IA Média: greedy 1-ply — escolhe a jogada que maximiza ganho imediato
// (+5 se captura, +2 se avança mais no tabuleiro, +1 se liberta peça virgem)

export function pickMoveMedium(ctx) {
    const { state, steps, who, listLegalMoves, getCell, isVirgin } = ctx;
    const moves = listLegalMoves(state, steps, who);
    if (!moves || moves.length === 0) return null;

    const opponent = who === 'vermelho' ? 'azul' : 'vermelho';

    function isCapture(move) {
        if (!getCell) return false;
        const [tr, tc] = move.to;
        const cell = getCell(tr, tc);
        return cell && cell.player === opponent;
    }

    function leavesVirgin(move) {
        if (!isVirgin) return false;
        const [sr, sc] = move.from;
        return isVirgin(sr, sc);
    }

    // Função simples de avaliação
    function evaluateMove(move) {
        let score = 0;

        // Captura vale bastante
        if (isCapture(move)) score += 5;

        // Avançar no tabuleiro (quanto mais longe, melhor)
        const [sr, sc] = move.from;
        const [tr, tc] = move.to;
        const advance = who === 'vermelho' ? tr - sr : sr - tr;
        score += 2 * Math.max(0, advance);

        // Bónus por mexer peça virgem
        if (leavesVirgin(move) && steps > 0) score += 1;

        return score;
    }

    // Escolhe a jogada com maior score
    let bestMove = moves[0];
    let bestScore = evaluateMove(bestMove);

    for (let i = 1; i < moves.length; i++) {
        const sc = evaluateMove(moves[i]);
        if (sc > bestScore) {
            bestScore = sc;
            bestMove = moves[i];
        }
    }

    return bestMove;
}

