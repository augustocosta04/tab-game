// js/game.js
/**
 * Motor principal do TÂB
 * Gere turnos, jogadas, captura e estados especiais.
 */
import { pickMoveEasy } from "./ai/easy.js";   // IA Fácil
import { pickMoveMedium } from "./ai/medium.js"; // ✅ IA Média (ativada)
import { pickMoveMCTS } from "./ai/hard.js";   // IA Difícil

export class Game {
  /**
   * @param {object} opts
   * @param {import('./board.js').Board} opts.board
   * @param {import('./sticks.js').Sticks} opts.sticks
   * @param {HTMLElement} opts.msgListUL
   * @param {HTMLElement} opts.turnoSpan
   * @param {HTMLButtonElement} opts.btnLancar
   * @param {HTMLButtonElement} opts.btnPassar
   * @param {HTMLButtonElement} opts.btnDesistir
   * @param {'azul'|'vermelho'} opts.primeiro
   * @param {(info:{winner?:string, reason:'win'|'resign'})=>void} [opts.onFinish]
   * @param {'easy'|'medium'|'hard'} [opts.aiLevel]
   */
  constructor(opts) {
    this.board = opts.board;
    this.sticks = opts.sticks;
    this.msgList = opts.msgListUL;
    this.turnoSpan = opts.turnoSpan;
    this.btnLancar = opts.btnLancar;
    this.btnPassar = opts.btnPassar;
    this.btnDesistir = opts.btnDesistir;
    this.onFinish = opts.onFinish || null;

    this.aiLevel = opts.aiLevel || "easy";
    // Delay fixo para a IA (em milissegundos)
    this.aiDelay = 1000;

    this.cols = this.board.cols;
    this.rows = 4;

    this.current = opts.primeiro; // 'azul' | 'vermelho'
    this.rolled = 0;
    this.mustRoll = true;
    this.gameOver = false;

    this.graph = this._buildTrackGraph(this.cols);

    this._wire();
    this._updateHUD();

    // Se começar nas vermelhas, dispara a IA (com delay)
    setTimeout(() => this._maybeRunAI(), this.aiDelay);
  }

  /* ---------- util do grafo ---------- */
  _id(r, c) { return `${r}:${c}`; }
  _parse(id) { const [r, c] = id.split(":").map(Number); return [r, c]; }

  /**
   * Circuito:
   *  - 0/2 andam ← ; 1/3 andam →
   *  - bordas: (0,0)->(1,0) | (1,last)->(2,last) e (0,last)
   *            (2,0)->(1,0) e (3,0) | (3,last)->(2,last)
   */
  _buildTrackGraph(cols) {
    const last = cols - 1;
    const g = new Map();
    const add = (r, c, nr, nc) => {
      const f = this._id(r, c), t = this._id(nr, nc);
      if (!g.has(f)) g.set(f, new Set());
      g.get(f).add(t);
    };

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dir = (r === 0 || r === 2) ? -1 : +1;
        const nc = c + dir;
        if (nc >= 0 && nc <= last) {
          add(r, c, r, nc);
        } else {
          if (r === 0 && c === 0)               add(0, 0, 1, 0);
          else if (r === 1 && c === last)      { add(1, last, 2, last); add(1, last, 0, last); }
          else if (r === 2 && c === 0)         { add(2, 0, 1, 0); add(2, 0, 3, 0); }
          else if (r === 3 && c === last)      add(3, last, 2, last);
        }
      }
    }
    return g;
  }

  /* ---------- UI / fluxo ---------- */
  _wire() {
    // Lançar dado (humano = azuis)
    this.btnLancar.addEventListener("click", () => {
      if (this.gameOver || !this.mustRoll) return;
      if (this.current === "vermelho") return; // IA

      const { value } = this.sticks.roll();
      this.rolled = value;
      this.mustRoll = false;

      if (!this._existsAnyMoveFor(value)) {
        this._msg(`Dado lançado: ${value}. Sem jogadas válidas — clique em "Passar".`);
      } else {
        this._msg(`Lançou: ${value}`);
        this._highlightMovables();
      }
      this._updateHUD();
    });

    // Passar vez (humano)
    this.btnPassar.addEventListener("click", () => {
      if (this.gameOver || this.mustRoll) return;
      if (this.current === "vermelho") return; // IA
      if (this._existsAnyMoveFor(this.rolled)) {
        this._msg("Há jogada válida; não pode passar.");
        return;
      }
      this._msg("Passou a vez.");
      this._endTurn(false);
    });

    // Desistir
    this.btnDesistir?.addEventListener("click", () => {
      if (this.gameOver) return;
      const desistiu = this.current;
      const vencedor = desistiu === "azul" ? "Vermelhas" : "Azuis";
      this._msg(`As ${this._teamLabel(desistiu)} desistiram. Vitória das ${vencedor}!`);
      this._finish({ winner: vencedor, reason: "resign" });
    });

    // Seleção/movimento (humano/azul)
    this.board.root.addEventListener("click", (e) => {
      if (this.gameOver) return;
      if (this.current === "vermelho") return; // IA

      const cell = e.target.closest(".cell");
      if (!cell) return;

      const r = Number(cell.dataset.r);
      const c = Number(cell.dataset.c);

      // destino escolhido?
      if (this._selected) {
        const key = this._id(r, c);
        if (this._targets?.has(key)) {
          const [sr, sc] = this._selected;
          this._move(sr, sc, r, c);
          return;
        }
      }

      // seleção de origem
      const piece = this.board.grid[r][c];
      if (!piece || piece === 0) return;
      const isMine =
        (this.current === "azul" && piece.color === "A") ||
        (this.current === "vermelho" && piece.color === "V");
      if (!isMine) return;

      if (this.mustRoll) { this._msg("Lance o dado."); return; }

      const targets = this._reachableTargets(r, c, this.rolled, this.current);
      this._paintSelectable(r, c, targets);
      this._selected = [r, c];
      this._targets = targets;
    });
  }

  _updateHUD() {
    this.turnoSpan.textContent = this._teamLabel(this.current);
    const iaTurn = (this.current === "vermelho");
    this.btnLancar.disabled  = this.gameOver ? true : (iaTurn ? true : !this.mustRoll);
    this.btnPassar.disabled  = this.gameOver ? true : (iaTurn ? true : this.mustRoll);
    if (this.btnDesistir) this.btnDesistir.disabled = this.gameOver;

    // ⬇️ novo: agenda a IA com delay
    if (!this.gameOver) {
      setTimeout(() => this._maybeRunAI(), this.aiDelay);
    }
  }

  _teamLabel(who) { return who === "azul" ? "Azuis" : "Vermelhas"; }

  _msg(text) {
    if (!this.msgList) return;
    const li = document.createElement("li");
    li.textContent = text;
    this.msgList.prepend(li);
  }

  /* ---------- Destaques ---------- */
  _clearHighlights() {
    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) {
        const el = this.board.getCellEl(r, c);
        el.classList.remove("selectable", "target", "enemy");
      }
    }
    this._selected = null;
    this._targets = null;
  }

  _paintSelectable(sr, sc, targets) {
    this._clearHighlights();
    this.board.getCellEl(sr, sc).classList.add("selectable");
    for (const id of targets) {
      const [r, c] = this._parse(id);
      const el = this.board.getCellEl(r, c);
      const occ = this.board.grid[r][c];
      if (occ && occ !== 0) {
        const enemy =
          (this.current === "azul" && occ.color === "V") ||
          (this.current === "vermelho" && occ.color === "A");
        if (enemy) el.classList.add("enemy");
      } else {
        el.classList.add("target");
      }
    }
  }

  _highlightMovables() {
    this._clearHighlights();
    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) {
        const v = this.board.grid[r][c];
        if (!v || v === 0) continue;
        const mine =
          (this.current === "azul" && v.color === "A") ||
          (this.current === "vermelho" && v.color === "V");
        if (!mine) continue;

        const t = this._reachableTargets(r, c, this.rolled, this.current);
        if (t.size) this.board.getCellEl(r, c).classList.add("selectable");
      }
    }
  }

  /* ---------- Movimento / regras ---------- */

  _hasFreshPieces(playerColor) {
    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) {
        const v = this.board.grid[r][c];
        if (!v || v === 0) continue;
        const mine =
          (playerColor === "azul" && v.color === "A") ||
          (playerColor === "vermelho" && v.color === "V");
        if (mine && !v.moved) return true;
      }
    }
    return false;
  }

  _existsAnyMoveFor(steps) {
    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) {
        const v = this.board.grid[r][c];
        if (!v || v === 0) continue;
        const mine =
          (this.current === "azul" && v.color === "A") ||
          (this.current === "vermelho" && v.color === "V");
        if (!mine) continue;
        if (this._reachableTargets(r, c, steps, this.current).size) return true;
      }
    }
    return false;
  }

  _hasOwnOnInitialRow(playerColor) {
    const row = (playerColor === "azul") ? 3 : 0;
    const char = (playerColor === "azul") ? "A" : "V";
    for (let c = 0; c < this.board.cols; c++) {
      const v = this.board.grid[row][c];
      if (v && v !== 0 && v.color === char) return true;
    }
    return false;
  }

  _isOnOpponentLastRow(r, colorChar) {
    return colorChar === "A" ? (r === 0) : (r === 3);
  }

  _canLand(sr, sc, r, c, playerColor) {
    // 1) Não pode regressar à linha inicial do próprio jogador
    const initialRow = (playerColor === "azul") ? 3 : 0;
    if (r === initialRow && sr !== initialRow) return false;

    // 2) Se a peça já é blessed, ela só NÃO pode REENTRAR na última do adversário.
    //    Mover DENTRO dessa linha continua válido.
    const piece = this.board.grid[sr][sc];
    if (piece && piece !== 0 && piece.visitedLast) {
      const oppLastRow = (piece.color === "A") ? 0 : 3;
      if (r === oppLastRow && sr !== oppLastRow) return false; // ⬅️ patch
    }
    return true;
  }

  /**
   * Destinos atingíveis em `steps` passos.
   * - primeira jogada **por peça** só com 1
   * - peça na última linha do adversário só move se a linha inicial estiver vazia
   * - passos intermediários podem atravessar peças; destino não pode ter aliada
   */
  _reachableTargets(sr, sc, steps, playerColor) {
    const piece = this.board.grid[sr][sc];

    // primeira jogada por peça só com 1
    if (piece && piece !== 0 && !piece.moved && steps !== 1) return new Set();

    // peça na última do adversário só pode mexer se linha inicial estiver vazia
    if (piece && piece !== 0) {
      const ownChar = piece.color; // 'A' | 'V'
      const side = ownChar === "A" ? "azul" : "vermelho";
      if (this._isOnOpponentLastRow(sr, ownChar) && this._hasOwnOnInitialRow(side)) {
        return new Set();
      }
    }

    const start = this._id(sr, sc);
    let frontier = new Set([start]);

    for (let k = 0; k < steps; k++) {
      const next = new Set();

      for (const id of frontier) {
        const neigh = this.graph.get(id) ?? new Set();

        for (const nid of neigh) {
          const [nr, nc] = this._parse(nid);
          const occ = this.board.grid[nr][nc];
          const isLast = (k === steps - 1);

          if (occ && occ !== 0) {
            const same =
              (playerColor === "azul" && occ.color === "A") ||
              (playerColor === "vermelho" && occ.color === "V");

            if (isLast) {
              if (!same) next.add(nid);       // pode capturar
            } else {
              next.add(nid);                   // atravessa peças
            }
          } else {
            next.add(nid);
          }
        }
      }

      frontier = next;
      if (!frontier.size) break;
    }

    // filtro final de pouso
    const filtered = new Set();
    for (const id of frontier) {
      const [r, c] = this._parse(id);
      if (this._canLand(sr, sc, r, c, playerColor)) filtered.add(id);
    }
    return filtered;
  }

  _move(sr, sc, tr, tc) {
    const from = this.board.grid[sr][sc];
    const to = this.board.grid[tr][tc];

    // captura automática
    if (to && to !== 0) {
      this.board.clearCell(tr, tc);
      this._msg("Captura!");
    }

    // move (marca moved=true) preservando a cor da própria peça
    this.board.clearCell(sr, sc);
    const playerColor = (from.color === "A") ? "azul" : "vermelho";
    this.board.placePiece(tr, tc, playerColor, true, from.visitedLast);
    this.board.markVisitedIfOpponentLastRow(tr, tc);

    this.board.draw();
    this._clearHighlights();

    if (this._isGameOver()) return;

    const repeat = [1, 4, 6].includes(this.rolled);
    this._endTurn(repeat);
  }

  _isGameOver() {
    let A = 0, V = 0;
    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) {
        const v = this.board.grid[r][c];
        if (!v || v === 0) continue;
        if (v.color === "A") A++; else V++;
      }
    }
    if (A === 0 || V === 0) {
      const winner = (A > 0) ? "Azuis" : "Vermelhas";
      this._msg(`Fim do jogo — vencem as ${winner}.`);
      this._finish({ winner, reason: "win" });
      return true;
    }
    return false;
  }

  /** Limpa o tabuleiro e repõe as peças iniciais (linha 0 vermelhas, linha 3 azuis) */
  _resetBoardToInitial() {
    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) {
        this.board.clearCell(r, c);
      }
    }
    for (let c = 0; c < this.board.cols; c++) {
      this.board.placePiece(0, c, "vermelho");
      this.board.placePiece(3, c, "azul");
    }
    this.board.draw();
  }

  _finish(info = { winner: undefined, reason: "win" }) {
    this.gameOver = true;

    // trava jogadas
    this.btnLancar.disabled = true;
    this.btnPassar.disabled = true;
    if (this.btnDesistir) this.btnDesistir.disabled = true;

    // limpa seleções / dado
    this.mustRoll = true;
    this.rolled = 0;
    this._clearHighlights();
    this.sticks.reset();

    // repõe tabuleiro “zerado”
    this._resetBoardToInitial();
    this.turnoSpan.textContent = "–";

    // avisa a UI (destrava config, ranking, etc.)
    try { this.onFinish?.(info); } catch {}
  }

  _endTurn(repeat) {
    if (!repeat) {
      this.current = (this.current === "azul") ? "vermelho" : "azul";
      this._msg(`Vez de: ${this._teamLabel(this.current)}.`);
    } else {
      this._msg("Repete a vez (1, 4 ou 6).");
    }
    this.mustRoll = true;
    this.rolled = 0;
    this._clearHighlights();
    this.sticks.reset();
    this._updateHUD();
  }

  /* ---------- API ---------- */
  resetForNewMatch() {
    this.gameOver = false;
    this.mustRoll = true;
    this.rolled = 0;
    this._clearHighlights();
    this.sticks.reset();
    this._updateHUD();
  }

  onSizeChanged(newCols) {
    this.cols = newCols;
    this.graph = this._buildTrackGraph(newCols);
    this.resetForNewMatch();
  }

  /* ---------- Helpers expostos para IA ---------- */
  getLegalMovesFor(steps, who) {
    const moves = [];
    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) {
        const cell = this.board.grid[r][c];
        if (!cell || cell === 0) continue;
        const mine =
          (who === "azul" && cell.color === "A") ||
          (who === "vermelho" && cell.color === "V");
        if (!mine) continue;

        const targets = this._reachableTargets(r, c, steps, who);
        for (const id of targets) {
          const [tr, tc] = this._parse(id);
          moves.push({ from: [r, c], to: [tr, tc] });
        }
      }
    }
    return moves;
  }

  getCell(r, c) {
    return this.board?.grid?.[r]?.[c] || null;
  }

  isVirgin(r, c) {
    const cell = this.getCell(r, c);
    return !!cell && cell.moved === false;
  }

  /* ---------- Seletor/loop da IA ---------- */
  _pickMoveByLevel(ctx) {
    switch (this.aiLevel) {
      case "hard":
        return pickMoveMCTS(ctx);
      case "medium":
        return pickMoveMedium(ctx);
      case "easy":
      default:
        return pickMoveEasy(ctx);
    }
  }

  _maybeRunAI() {
    if (this.gameOver) return;
    if (this.current !== "vermelho") return;

    // 1) rolar, se necessário
    if (this.mustRoll) {
      const { value } = this.sticks.roll();
      this.rolled = value;
      this.mustRoll = false;

      if (!this._existsAnyMoveFor(value)) {
        this._msg(`Vermelhas lançaram: ${value}. Sem jogadas — passam a vez.`);
        this._endTurn(false);
        return;
      } else {
        this._msg(`Vermelhas lançaram: ${value}`);
      }
    }

    // 2) decidir jogada
    const move = this._pickMoveByLevel({
      state: { grid: this.board.grid },
      steps: this.rolled,
      who: "vermelho",
      listLegalMoves: (state, steps, who) => this.getLegalMovesFor(steps, who),
      getCell: (r, c) => this.getCell(r, c),
      isVirgin: (r, c) => this.isVirgin(r, c),
    });

    // 3) executar (ou passar)
    if (move) {
      const [[sr, sc], [tr, tc]] = [move.from, move.to];
      setTimeout(() => this._move(sr, sc, tr, tc), 250);
    } else {
      this._msg("Vermelhas passam (nenhuma jogada).");
      this._endTurn(false);
    }
  }
}
