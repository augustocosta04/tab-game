/**
 * Módulo de jogo online multiplayer
 * Gere o estado e lógica do jogo quando jogando contra outro jogador
 */

import * as API from './api.js';

export class OnlineGame {
  /**
   * @param {object} opts
   * @param {import('./board.js').Board} opts.board
   * @param {import('./sticks.js').Sticks} opts.sticks
   * @param {HTMLElement} opts.msgListUL
   * @param {HTMLElement} opts.turnoSpan
   * @param {HTMLButtonElement} opts.btnLancar
   * @param {HTMLButtonElement} opts.btnPassar
   * @param {HTMLButtonElement} opts.btnDesistir
   * @param {function} opts.onFinish
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
    
    // Estado da sessão
    this.nick = null;
    this.password = null;
    this.group = null;
    this.gameId = null;
    this.size = 9;
    
    // Estado do jogo
    this.myColor = null;
    this.turn = null;
    this.step = 'from';
    this.pieces = [];
    this.selected = null;
    this.validMoves = [];
    this.dice = null;
    this.winner = null;
    this.players = {};
    
    // SSE
    this.sseSource = null;
    
    // Bind handlers
    this._onBoardClick = this._onBoardClick.bind(this);
    this._onRollClick = this._onRollClick.bind(this);
    this._onPassClick = this._onPassClick.bind(this);
    this._onLeaveClick = this._onLeaveClick.bind(this);
  }
  
  /**
   * Iniciar sessão (registar/login)
   */
  async login(nick, password) {
    try {
      await API.register(nick, password);
      this.nick = nick;
      this.password = password;
      this._msg(`Sessão iniciada como ${nick}`);
      return true;
    } catch (err) {
      this._msg(`Erro: ${err.message}`);
      return false;
    }
  }
  
  /**
   * Procurar jogo
   * @param {number} group
   * @param {number} size
   * @param {string} first - 'blue', 'red' ou 'random'
   */
  async findGame(group, size, first = 'blue') {
    if (!this.nick) {
      this._msg('Faça login primeiro');
      return false;
    }
    
    try {
      this.group = group;
      this.size = size;
      this.board.setSize(size);
      
      this._msg('A procurar adversário...');
      
      const result = await API.join(group, this.nick, this.password, size, first);
      this.gameId = result.game;
      
      this._msg(`Jogo encontrado: ${this.gameId.substring(0, 8)}...`);
      
      // Conectar SSE
      this._connectSSE();
      
      // Ativar listeners
      this._wire();
      
      return true;
    } catch (err) {
      this._msg(`Erro: ${err.message}`);
      return false;
    }
  }
  
  /**
   * Conectar ao servidor via SSE
   */
  _connectSSE() {
    this.sseSource = API.connectSSE(
      this.nick,
      this.gameId,
      (data) => this._handleSSE(data),
      (err) => this._msg('Conexão perdida')
    );
  }
  
  /**
   * Processar mensagem SSE
   */
  _handleSSE(data) {
    console.log('SSE recebido:', data);
    
    // Fim do jogo
    if (data.winner !== undefined) {
      this.winner = data.winner;
      if (data.pieces) {
        this.pieces = data.pieces;
        this._renderBoard();
      }
      this._clearHighlights();
      
      if (this.winner === null) {
        this._msg('Jogo cancelado');
      } else if (this.winner === this.nick) {
        this._msg('🎉 Vitória! Parabéns!');
      } else {
        this._msg(`${this.winner} venceu.`);
      }
      
      this._finish();
      return;
    }
    
    // Movimento concluído - limpar highlights e atualizar tabuleiro
    if (data.moveComplete) {
      this._clearHighlights();
      if (data.pieces) {
        this.pieces = data.pieces;
        this._renderBoard();
      }
      if (data.turn !== undefined) {
        this.turn = data.turn;
        this._updateTurnDisplay();
      }
      this._updateHUD();
      return;
    }
    
    // Peça desselecionada - voltar a mostrar peças movíveis
    if (data.deselected) {
      this._clearHighlights();
      if (data.movable && data.movable.length > 0 && this.turn === this.nick) {
        this._highlightMovablePieces(data.movable);
      }
      this._updateHUD();
      return;
    }
    
    // Início do jogo ou atualização de estado
    if (data.players) {
      this.players = data.players;
      this.myColor = data.players[this.nick];
      this._msg(`Tu és: ${this.myColor === 'Blue' ? 'Azuis' : 'Vermelhas'}`);
    }
    
    if (data.pieces) {
      this.pieces = data.pieces;
      this._renderBoard();
    }
    
    if (data.turn !== undefined) {
      this.turn = data.turn;
      this._updateTurnDisplay();
    }
    
    if (data.step !== undefined) {
      this.step = data.step;
    }
    
    // Limpar destaques antes de aplicar novos
    this._clearHighlights();
    
    if (data.dice) {
      this.dice = data.dice;
      this._renderDice(data.dice);
      
      if (data.dice.value) {
        const who = this.turn === this.nick ? 'Tu' : this.turn;
        this._msg(`${who} lançou: ${data.dice.value}${data.dice.keepPlaying ? ' (repete)' : ''}`);
      }
    }
    
    // Destacar peças que podem mover (enviado após roll)
    if (data.movable && data.movable.length > 0) {
      if (this.turn === this.nick) {
        this._highlightMovablePieces(data.movable);
      }
    }
    
    // Destacar peça selecionada e destinos válidos (enviado após notify)
    if (data.selected && data.selected.length > 0) {
      this._highlightSelectedAndTargets(data.selected);
    }
    
    if (data.mustPass) {
      if (data.mustPass === this.nick) {
        this._msg('Sem jogadas válidas - clica em "Passar"');
      }
    }
    
    this._updateHUD();
  }
  
  /**
   * Configurar event listeners
   */
  _wire() {
    this.board.root.addEventListener('click', this._onBoardClick);
    this.btnLancar.addEventListener('click', this._onRollClick);
    this.btnPassar.addEventListener('click', this._onPassClick);
    this.btnDesistir.addEventListener('click', this._onLeaveClick);
  }
  
  /**
   * Remover event listeners
   */
  _unwire() {
    this.board.root.removeEventListener('click', this._onBoardClick);
    this.btnLancar.removeEventListener('click', this._onRollClick);
    this.btnPassar.removeEventListener('click', this._onPassClick);
    this.btnDesistir.removeEventListener('click', this._onLeaveClick);
  }
  
  /**
   * Handler de clique no tabuleiro
   */
  async _onBoardClick(e) {
    if (this.winner) return;
    if (this.turn !== this.nick) return;
    
    const cell = e.target.closest('.cell');
    if (!cell) return;
    
    const row = Number(cell.dataset.r);
    const col = Number(cell.dataset.c);
    const index = row * this.size + col;
    
    try {
      await API.notify(this.nick, this.password, this.gameId, index);
    } catch (err) {
      this._msg(`Erro: ${err.message}`);
    }
  }
  
  /**
   * Handler de lançar dado
   */
  async _onRollClick() {
    if (this.winner) return;
    if (this.turn !== this.nick) return;
    
    try {
      await API.roll(this.nick, this.password, this.gameId);
    } catch (err) {
      this._msg(`Erro: ${err.message}`);
    }
  }
  
  /**
   * Handler de passar vez
   */
  async _onPassClick() {
    if (this.winner) return;
    if (this.turn !== this.nick) return;
    
    try {
      await API.pass(this.nick, this.password, this.gameId);
    } catch (err) {
      this._msg(`Erro: ${err.message}`);
    }
  }
  
  /**
   * Handler de desistir
   */
  async _onLeaveClick() {
    if (this.winner) return;
    
    try {
      await API.leave(this.nick, this.password, this.gameId);
      this._msg('Desististe do jogo');
    } catch (err) {
      this._msg(`Erro: ${err.message}`);
    }
  }
  
  /**
   * Renderizar tabuleiro com peças do servidor
   */
  _renderBoard() {
    // Limpar tabuleiro
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < this.size; c++) {
        this.board.clearCell(r, c);
      }
    }
    
    // Colocar peças
    for (let i = 0; i < this.pieces.length; i++) {
      const piece = this.pieces[i];
      if (piece) {
        const row = Math.floor(i / this.size);
        const col = i % this.size;
        const color = piece.color === 'Blue' ? 'azul' : 'vermelho';
        this.board.placePiece(row, col, color, piece.inMotion, piece.reachedLastRow);
      }
    }
    
    this.board.draw();
  }
  
  /**
   * Renderizar dado
   */
  /**
   * Mostrar resultado do dado
   */
  _renderDice(dice, animate = true) {
    if (!dice) {
      this.sticks.reset();
      return;
    }
    
    // Usar o novo método com animação Canvas
    this.sticks.setFromServer(dice.stickValues, dice.value, dice.keepPlaying, animate);
  }
  
  /**
   * Destacar células (peça selecionada + destinos)
   */
  _highlightCells(indices) {
    this._clearHighlights();
    
    for (const idx of indices) {
      const row = Math.floor(idx / this.size);
      const col = idx % this.size;
      const el = this.board.getCellEl(row, col);
      if (el) {
        // Primeira célula é a selecionada
        if (idx === indices[0]) {
          el.classList.add('selectable');
        } else {
          // Verificar se é captura
          const piece = this.pieces[idx];
          if (piece && piece.color !== this.myColor) {
            el.classList.add('enemy');
          } else {
            el.classList.add('target');
          }
        }
      }
    }
  }
  
  /**
   * Destacar peças que podem mover (recebe array de índices do servidor)
   */
  _highlightMovablePieces(movableIndices) {
    console.log('Destacando peças movíveis:', movableIndices);
    
    for (const idx of movableIndices) {
      const row = Math.floor(idx / this.size);
      const col = idx % this.size;
      const el = this.board.getCellEl(row, col);
      
      if (el) {
        el.classList.add('selectable');
        console.log(`Peça ${idx} destacada (row=${row}, col=${col})`);
      }
    }
  }
  
  /**
   * Destacar peça selecionada e destinos válidos
   */
  _highlightSelectedAndTargets(selectedArray) {
    console.log('Destacando selecionada + destinos:', selectedArray);
    
    if (selectedArray.length === 0) return;
    
    // Primeiro índice é a peça selecionada
    const selectedIdx = selectedArray[0];
    const selectedRow = Math.floor(selectedIdx / this.size);
    const selectedCol = selectedIdx % this.size;
    const selectedEl = this.board.getCellEl(selectedRow, selectedCol);
    
    if (selectedEl) {
      selectedEl.classList.add('selectable');
    }
    
    // Restantes são os destinos válidos
    for (let i = 1; i < selectedArray.length; i++) {
      const idx = selectedArray[i];
      const row = Math.floor(idx / this.size);
      const col = idx % this.size;
      const el = this.board.getCellEl(row, col);
      
      if (el) {
        // Verificar se é captura (há peça inimiga)
        const piece = this.pieces[idx];
        if (piece && piece.color !== this.myColor) {
          el.classList.add('enemy');
        } else {
          el.classList.add('target');
        }
      }
    }
  }
  
  /**
   * Limpar destaques
   */
  _clearHighlights() {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < this.size; c++) {
        const el = this.board.getCellEl(r, c);
        if (el) {
          el.classList.remove('selectable', 'target', 'enemy');
        }
      }
    }
  }
  
  /**
   * Atualizar display do turno
   */
  _updateTurnDisplay() {
    if (this.turn === this.nick) {
      this.turnoSpan.textContent = `Tu (${this.myColor === 'Blue' ? 'Azuis' : 'Vermelhas'})`;
    } else {
      const color = this.players[this.turn];
      this.turnoSpan.textContent = `${this.turn} (${color === 'Blue' ? 'Azuis' : 'Vermelhas'})`;
    }
  }
  
  /**
   * Atualizar HUD (botões)
   */
  _updateHUD() {
    const isMyTurn = this.turn === this.nick;
    const gameOver = this.winner !== null;
    
    this.btnLancar.disabled = gameOver || !isMyTurn;
    this.btnPassar.disabled = gameOver || !isMyTurn;
    this.btnDesistir.disabled = gameOver;
  }
  
  /**
   * Adicionar mensagem
   */
  _msg(text) {
    if (!this.msgList) return;
    const li = document.createElement('li');
    li.textContent = text;
    this.msgList.prepend(li);
  }
  
  /**
   * Finalizar jogo
   */
  _finish() {
    // Fechar SSE
    if (this.sseSource) {
      this.sseSource.close();
      this.sseSource = null;
    }
    
    // Remover listeners
    this._unwire();
    
    // Atualizar HUD
    this.btnLancar.disabled = true;
    this.btnPassar.disabled = true;
    this.btnDesistir.disabled = true;
    
    // Callback
    if (this.onFinish) {
      this.onFinish({ winner: this.winner });
    }
  }
  
  /**
   * Obter ranking do servidor
   */
  async getRanking() {
    try {
      const result = await API.ranking(this.group || 99, this.size);
      return result.ranking;
    } catch (err) {
      console.error('Erro ao obter ranking:', err);
      return [];
    }
  }
  
  /**
   * Cancelar procura de jogo
   */
  async cancelSearch() {
    if (this.gameId && !this.winner) {
      try {
        await API.leave(this.nick, this.password, this.gameId);
      } catch {}
    }
    
    if (this.sseSource) {
      this.sseSource.close();
      this.sseSource = null;
    }
  }
}
