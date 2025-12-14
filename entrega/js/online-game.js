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
   */
  async findGame(group, size) {
    if (!this.nick) {
      this._msg('Faça login primeiro');
      return false;
    }
    
    try {
      this.group = group;
      this.size = size;
      this.board.setSize(size);
      
      this._msg('A procurar adversário...');
      
      const result = await API.join(group, this.nick, this.password, size);
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
    console.log('SSE:', data);
    
    // Fim do jogo
    if (data.winner !== undefined) {
      this.winner = data.winner;
      if (data.pieces) {
        this.pieces = data.pieces;
        this._renderBoard();
      }
      
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
    
    if (data.dice) {
      this.dice = data.dice;
      this._renderDice(data.dice);
      
      if (data.dice.value) {
        const who = this.turn === this.nick ? 'Tu' : this.turn;
        this._msg(`${who} lançou: ${data.dice.value}${data.dice.keepPlaying ? ' (repete)' : ''}`);
      }
    }
    
    if (data.mustPass) {
      if (data.mustPass === this.nick) {
        this._msg('Sem jogadas válidas - clica em "Passar"');
      }
    }
    
    if (data.selected) {
      this.validMoves = data.selected;
      this._highlightCells(data.selected);
    }
    
    if (data.cell !== undefined) {
      // Movimento executado
      this.selected = null;
      this.validMoves = [];
      this._clearHighlights();
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
  _renderDice(dice) {
    if (!dice) {
      this.sticks.reset();
      return;
    }
    
    // Atualizar visual dos paus
    const stickEls = this.sticks.stickEls;
    dice.stickValues.forEach((isClara, i) => {
      if (stickEls[i]) {
        stickEls[i].setAttribute('data-face', isClara ? 'clara' : 'escura');
      }
    });
    
    // Atualizar valor
    if (this.sticks.outputEl) {
      this.sticks.outputEl.textContent = dice.value;
    }
  }
  
  /**
   * Destacar células
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
