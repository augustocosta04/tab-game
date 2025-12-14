// js/board.js
// Representa o estado lógico do tabuleiro e mapeia para o HTML existente.
// grid[r][c] guarda:
//   0 -> vazio
//   { color: 'A'|'V', moved: boolean, visitedLast: boolean } -> peça

export class Board {
  /**
   * @param {HTMLElement} root  - <div id="board">
   * @param {number} cols       - 7 | 9 | 11 | 13 | 15
   */
  constructor(root, cols = 9) {
    this.root = root;
    this.rows = 4;
    this.cols = cols;
    this.grid = this._createGridArray(this.rows, this.cols); // dados lógicos
    this.cellRefs = this._collectCellRefs();                 // referências DOM
    this.setSize(cols);                                      // aplica classe cols-X e setas
  }

  _createGridArray(rows, cols) {
    return Array.from({ length: rows }, () => Array(cols).fill(0));
  }

  _collectCellRefs() {
    // Mapa: cellRefs[row][col] -> HTMLElement (até 15 por linha no HTML)
    const rows = Array.from(this.root.querySelectorAll('.row'));
    return rows.map((rowEl, r) =>
      Array.from(rowEl.querySelectorAll('.cell')).slice(0, 15).map((cellEl, c) => {
        // ✅ adiciona coordenadas para que o Game reconheça cliques
        cellEl.dataset.r = r;
        cellEl.dataset.c = c;
        return cellEl;
      })
    );
  }

  setSize(cols) {
    this.cols = cols;
    this.root.classList.remove('cols-5','cols-7','cols-9','cols-11','cols-13','cols-15');
    this.root.classList.add(`cols-${cols}`);

    // reajusta grade de dados (mantendo o que couber)
    this.grid = this.grid.map(r => r.slice(0, cols));
    if (this.grid[0].length < cols) {
      // crescer (ex.: 7 -> 9)
      this.grid = this.grid.map(r => r.concat(Array(cols - r.length).fill(0)));
    }

    // (re)define direções visuais das células conforme o tamanho atual
    this.setDefaultDirections();

    this.draw();
  }

  /**
   * Coloca/actualiza uma peça
   * @param {number} row
   * @param {number} col
   * @param {'azul'|'vermelho'} color
   * @param {boolean} moved       já se moveu alguma vez?
   * @param {boolean} visitedLast já esteve na 4ª linha do adversário?
   */
  placePiece(row, col, color, moved = false, visitedLast = false) {
    if (!this._inBounds(row, col)) return false;
    this.grid[row][col] = {
      color: color === 'azul' ? 'A' : 'V',
      moved: !!moved,
      visitedLast: !!visitedLast,
    };
    return true;
  }

  clearCell(row, col) {
    if (!this._inBounds(row, col)) return false;
    this.grid[row][col] = 0;
    return true;
  }

  /** marca a peça como "já se moveu" (mostra o sol) */
  markMoved(row, col) {
    if (!this._inBounds(row, col)) return;
    const v = this.grid[row][col];
    if (!v || v === 0) return;
    v.moved = true;
    this.drawCell(row, col);
  }

  /** marca peça como “visitou 4ª linha” (mostra Ankh e sobrepõe o sol) */
  markVisitedIfOpponentLastRow(row, col) {
    if (!this._inBounds(row, col)) return;
    const v = this.grid[row][col];
    if (!v || v === 0) return;

    if (this._isOpponentLastRow(row, v.color)) {
      v.moved = true;        // se visitou a última, certamente já moveu
      v.visitedLast = true;  // agora é “abençoada”
      this.drawCell(row, col);
    }
  }

  draw() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.drawCell(r, c);
      }
    }
  }

  /** redesenha apenas uma célula (optimização leve) */
  drawCell(row, col) {
    if (!this._inBounds(row, col)) return;
    const cellEl = this.cellRefs[row][col];
    cellEl.innerHTML = '';
    const v = this.grid[row][col];

    if (v && v !== 0) {
      // prioridade: blessed (ankh) > moved (sol) > none
      const stateClass = v.visitedLast ? ' blessed' : (v.moved ? ' moved' : '');
      const el = document.createElement('div');
      el.className = `piece ${v.color === 'A' ? 'azul' : 'vermelho'}${stateClass}`;
      el.setAttribute('draggable', 'false');
      cellEl.appendChild(el);
    }
  }

  _isOpponentLastRow(row, colorAorV) {
    // 'A' (azul) começa na linha 3 -> última linha do adversário é a 0
    // 'V' (vermelho) começa na linha 0 -> última linha do adversário é a 3
    if (colorAorV === 'A') return row === 0;
    return row === 3;
  }

  _inBounds(r, c) {
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
  }

  getCellEl(row, col) {
    return this.cellRefs[row]?.[col] ?? null;
  }

  /**
   * Direções das setas conforme as tiras de borda enviadas.
   * data-dir aceita: → ← ↑ ↓ ↗ ↘ ↙ ↖
   * Pode haver duas setas separadas por espaço, ex.: "↗ ↘" (empilhadas via CSS).
   */
  setDefaultDirections() {
    const last = this.cols - 1;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        // base: ziguezague do slide (miolo)
        let dir = (r === 0 || r === 2) ? "←" : "→";

        // ---- borda ESQUERDA (coluna 0)
        if (c === 0) {
          if (r === 0)      dir = "↙";
          else if (r === 1) dir = "↘ ↗"; // duas diagonais (↘ em cima / ↗ em baixo)
          else if (r === 2) dir = "↖";
          else if (r === 3) dir = "→";
        }

        // ---- borda DIREITA (coluna last)
        if (c === last) {
          if (r === 0)      dir = "↖";
          else if (r === 1) dir = "↗ ↘";
          else if (r === 2) dir = "↙ ↖";
          else if (r === 3) dir = "↗";
        }

        this.cellRefs[r][c].setAttribute("data-dir", dir);
      }
    }
  }
}
