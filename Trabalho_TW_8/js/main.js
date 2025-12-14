// js/main.js
import { Board } from "./board.js";
import { Sticks } from "./sticks.js";
import { Game } from "./game.js";
import { OnlineGame } from "./online-game.js";

document.addEventListener("DOMContentLoaded", () => {
  // --- elementos de UI ---
  const boardRoot       = document.getElementById("board");
  const vezEl           = document.getElementById("vez-jogador");
  const sizeSelect      = document.getElementById("sel-tamanho");
  const primeiroSelect  = document.getElementById("sel-primeiro");
  const grupoInput      = document.getElementById("sel-grupo");

  const btnIniciar      = document.getElementById("btn-iniciar");
  const btnLancar       = document.getElementById("btn-lancar");
  const btnPassar       = document.getElementById("btn-passar");
  const btnDesistir     = document.getElementById("btn-desistir");

  const valorDado       = document.getElementById("valor-dado");
  const sticksView      = document.querySelector("#dado .sticks-view");
  const msgList         = document.getElementById("msg-list");

  // Autenticação
  const authUser        = document.getElementById("auth-user");
  const authPass        = document.getElementById("auth-pass");
  const btnAuth         = document.getElementById("btn-auth");
  const btnAuthSair     = document.getElementById("btn-auth-sair");
  const authStatus      = document.getElementById("auth-status");
  const authLabel       = document.getElementById("auth-label");

  // Modo de jogo
  const fieldGrupo      = document.getElementById("field-grupo");
  const fieldPrimeiro   = document.getElementById("field-primeiro");
  const fieldNivel      = document.getElementById("field-nivel");

  // Instruções
  const btnInstrucoes   = document.getElementById("btn-instrucoes");
  const dlgInstrucoes   = document.getElementById("dlg-instrucoes");

  // Classificações
  const btnClassif       = document.getElementById("btn-classificacoes");
  const dlgClassif       = document.getElementById("dlg-classificacoes");
  const tbodyRanking     = document.querySelector("#ranking tbody");
  const btnLimparRanking = document.getElementById("btn-limpar-ranking");
  const resumoBox        = document.getElementById("ranking-resumo");

  // --- persistência do ranking LOCAL ---
  const LS_KEY = "tab_ranking_v1";

  function loadRanking() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? []; }
    catch { return []; }
  }
  function saveRanking(list) {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  }
  function fmtDate(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function renderRankingTable() {
    const data = loadRanking();
    tbodyRanking.innerHTML = "";
    for (const it of data.slice().reverse()) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${it.date || "—"}</td>
        <td>${it.size || "—"}</td>
        <td>${it.winner || "—"}</td>
        <td>${it.moves ?? "—"}</td>
        <td>${it.duration ?? "—"}</td>
      `;
      tbodyRanking.appendChild(tr);
    }
  }
  function renderResumoPorTamanho() {
    const data = loadRanking();
    const tamanhos = [5, 7, 9, 11, 13, 15];
    const agg = {};
    for (const t of tamanhos) agg[t] = { wins: 0, losses: 0 };

    for (const it of data) {
      const sz = Number(it.size);
      if (!agg[sz]) continue;
      if (it.winner === "Azuis") agg[sz].wins++;
      else if (it.winner === "Vermelhas") agg[sz].losses++;
    }

    const table = document.createElement("table");
    table.className = "ranking";
    table.innerHTML = `
      <thead>
        <tr><th colspan="3">Resumo por tamanho (Jogador = Azuis)</th></tr>
        <tr><th>Tamanho</th><th>Vitórias</th><th>Derrotas</th></tr>
      </thead>
      <tbody>
        ${tamanhos.map(sz => `
          <tr>
            <td>${sz} × 4</td>
            <td>${agg[sz].wins}</td>
            <td>${agg[sz].losses}</td>
          </tr>
        `).join("")}
      </tbody>
    `;
    if (resumoBox) {
      resumoBox.innerHTML = "";
      resumoBox.appendChild(table);
    }
  }

  // --- estado de alto nível ---
  const appState = {
    size: parseInt(sizeSelect.value, 10),
    firstToPlay: primeiroSelect.value,
    aiLevel: getSelectedAILevel(),
    mode: getSelectedMode(),
    group: parseInt(grupoInput?.value || "99", 10),
    running: false,
    nick: null,
    password: null,
    _moves: 0,
    _t0: 0,
  };

  // --- instâncias OO ---
  const board = new Board(boardRoot, appState.size);
  const sticks = new Sticks(sticksView, valorDado);
  let game = null;
  let onlineGame = null;

  boardRoot.setAttribute("aria-rowcount", "4");
  boardRoot.setAttribute("aria-colcount", String(appState.size));

  function setConfigDisabled(disabled) {
    sizeSelect.disabled = disabled;
    primeiroSelect.disabled = disabled;
    if (grupoInput) grupoInput.disabled = disabled;

    const cfg = document.querySelector(".config");
    if (cfg) {
      cfg.querySelectorAll("select, input, button").forEach(el => {
        if (el === btnIniciar || el === btnLancar || el === btnPassar || el === btnDesistir) return;
        el.disabled = disabled;
      });
      cfg.classList.toggle("is-locked", disabled);
    }
  }

  function getSelectedMode() {
    const el = document.querySelector('input[name="modo"]:checked');
    return el?.value || 'local';
  }

  function updateModeUI() {
    const mode = getSelectedMode();
    appState.mode = mode;
    
    if (mode === 'online') {
      if (fieldGrupo) fieldGrupo.hidden = false;
      if (fieldPrimeiro) fieldPrimeiro.hidden = false; // Mostrar também no modo online
      if (fieldNivel) fieldNivel.hidden = true;
      btnIniciar.textContent = appState.nick ? "Procurar Jogo" : "Fazer Login";
    } else {
      if (fieldGrupo) fieldGrupo.hidden = true;
      if (fieldPrimeiro) fieldPrimeiro.hidden = false;
      if (fieldNivel) fieldNivel.hidden = false;
      btnIniciar.textContent = "Iniciar";
    }
  }

  document.querySelectorAll('input[name="modo"]').forEach(r => {
    r.addEventListener("change", updateModeUI);
  });

  sizeSelect.addEventListener("change", () => {
    const newSize = parseInt(sizeSelect.value, 10);
    appState.size = newSize;
    board.setSize(newSize);
    boardRoot.setAttribute("aria-colcount", String(newSize));
    if (appState.running && game) {
      game.onSizeChanged(newSize);
    }
  });

  primeiroSelect.addEventListener("change", () => {
    appState.firstToPlay = primeiroSelect.value;
  });

  if (grupoInput) {
    grupoInput.addEventListener("change", () => {
      appState.group = parseInt(grupoInput.value, 10) || 99;
    });
  }

  document.querySelectorAll('input[name="nivel"]').forEach(r => {
    r.addEventListener("change", () => {
      appState.aiLevel = getSelectedAILevel();
    });
  });

  // --- Autenticação ---
  btnAuth?.addEventListener("click", async () => {
    const nick = authUser.value.trim();
    const pass = authPass.value;
    
    if (!nick || !pass) {
      authStatus.textContent = "Preencha utilizador e senha.";
      return;
    }
    
    if (!onlineGame) {
      onlineGame = new OnlineGame({
        board, sticks,
        msgListUL: msgList,
        turnoSpan: vezEl,
        btnLancar, btnPassar, btnDesistir,
        onFinish: onOnlineFinish
      });
    }
    
    authStatus.textContent = "A autenticar...";
    const ok = await onlineGame.login(nick, pass);
    
    if (ok) {
      appState.nick = nick;
      appState.password = pass;
      authStatus.textContent = `Sessão: ${nick}`;
      authLabel.textContent = nick;
      btnAuth.hidden = true;
      btnAuthSair.hidden = false;
      // Fechar aba de login
      document.getElementById("identificacao")?.removeAttribute("open");
      updateModeUI();
    } else {
      authStatus.textContent = "Falha na autenticação.";
    }
  });

  btnAuthSair?.addEventListener("click", () => {
    appState.nick = null;
    appState.password = null;
    authStatus.textContent = "Sessão não autenticada.";
    authLabel.textContent = "Entrar";
    btnAuth.hidden = false;
    btnAuthSair.hidden = true;
    updateModeUI();
  });

  btnIniciar.addEventListener("click", () => {
    if (appState.mode === 'online') {
      startOnlineGame();
    } else {
      startLocalGame();
    }
  });

  function startLocalGame() {
    if (appState.running) return;
    appState.running = true;

    btnIniciar.disabled = true;
    setConfigDisabled(true);

    clearRows(board, 0, 3, appState.size);
    drawInitialPieces(board, appState.size);
    board.draw();

    appState._moves = 0;
    appState._t0 = Date.now();

    const first = computeFirst(appState.firstToPlay);
    vezEl.textContent = first.charAt(0).toUpperCase() + first.slice(1);

    sticks.reset();

    game = new Game({
      board,
      sticks,
      msgListUL: msgList,
      turnoSpan: vezEl,
      btnLancar,
      btnPassar,
      btnDesistir,
      primeiro: first,
      aiLevel: appState.aiLevel,
      onFinish: (info) => {
        appState.running = false;
        btnIniciar.disabled = false;
        setConfigDisabled(false);
        vezEl.textContent = "–";

        try {
          const list = loadRanking();
          const durMs = Date.now() - (appState._t0 || Date.now());
          const mm = Math.floor(durMs / 60000);
          const ss = Math.floor((durMs % 60000) / 1000);
          list.push({
            date: fmtDate(new Date()),
            size: appState.size,
            winner: normalizeWinner(info?.winner),
            moves: appState._moves || "—",
            duration: isFinite(mm) ? `${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}` : "—",
          });
          saveRanking(list);
        } catch {}

        clearRows(board, 0, 3, appState.size);
        drawInitialPieces(board, appState.size);
        board.draw();
        sticks.reset();
      },
    });

    const _origEndTurn = game._endTurn?.bind(game);
    if (_origEndTurn) {
      game._endTurn = (repeat) => {
        if (!repeat) appState._moves++;
        return _origEndTurn(repeat);
      };
    }
  }

  async function startOnlineGame() {
    if (appState.running) return;
    
    if (!appState.nick) {
      const nick = authUser.value.trim();
      const pass = authPass.value;
      
      if (!nick || !pass) {
        addMsg("Faça login primeiro (preencha utilizador e senha).");
        document.getElementById("identificacao")?.setAttribute("open", "");
        return;
      }
      
      if (!onlineGame) {
        onlineGame = new OnlineGame({
          board, sticks,
          msgListUL: msgList,
          turnoSpan: vezEl,
          btnLancar, btnPassar, btnDesistir,
          onFinish: onOnlineFinish
        });
      }
      
      const ok = await onlineGame.login(nick, pass);
      if (!ok) {
        addMsg("Falha no login.");
        return;
      }
      
      appState.nick = nick;
      appState.password = pass;
      authStatus.textContent = `Sessão: ${nick}`;
      authLabel.textContent = nick;
      btnAuth.hidden = true;
      btnAuthSair.hidden = false;
      // Fechar aba de login
      document.getElementById("identificacao")?.removeAttribute("open");
    }
    
    onlineGame = new OnlineGame({
      board, sticks,
      msgListUL: msgList,
      turnoSpan: vezEl,
      btnLancar, btnPassar, btnDesistir,
      onFinish: onOnlineFinish
    });
    
    onlineGame.nick = appState.nick;
    onlineGame.password = appState.password;
    
    appState.running = true;
    btnIniciar.disabled = true;
    btnIniciar.textContent = "A procurar...";
    setConfigDisabled(true);
    
    const size = parseInt(sizeSelect.value, 10);
    const group = parseInt(grupoInput?.value || "99", 10);
    const first = primeiroSelect?.value || "azul";
    
    // Converter para formato do servidor
    const firstParam = first === "azul" ? "blue" : first === "vermelho" ? "red" : "random";
    
    const ok = await onlineGame.findGame(group, size, firstParam);
    
    if (!ok) {
      appState.running = false;
      btnIniciar.disabled = false;
      btnIniciar.textContent = "Procurar Jogo";
      setConfigDisabled(false);
    }
  }

  function onOnlineFinish(info) {
    appState.running = false;
    btnIniciar.disabled = false;
    btnIniciar.textContent = "Procurar Jogo";
    setConfigDisabled(false);
    vezEl.textContent = "–";
  }

  btnClassif?.addEventListener("click", async () => {
    if (appState.mode === 'online' && onlineGame) {
      try {
        const ranking = await onlineGame.getRanking();
        renderOnlineRanking(ranking);
      } catch {
        renderResumoPorTamanho();
        renderRankingTable();
      }
    } else {
      renderResumoPorTamanho();
      renderRankingTable();
    }
    dlgClassif?.showModal();
  });

  function renderOnlineRanking(ranking) {
    if (resumoBox) {
      resumoBox.innerHTML = "<h3>Ranking Online</h3>";
    }
    
    tbodyRanking.innerHTML = "";
    for (const it of ranking) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${it.nick}</td>
        <td colspan="2">${it.victories} vitórias</td>
        <td colspan="2">${it.games} jogos</td>
      `;
      tbodyRanking.appendChild(tr);
    }
  }

  btnLimparRanking?.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.removeItem(LS_KEY);
    renderResumoPorTamanho();
    renderRankingTable();
  });

  function computeFirst(option) {
    if (option === "aleatorio") {
      return Math.random() < 0.5 ? "azul" : "vermelho";
    }
    return option;
  }

  function normalizeWinner(w) {
    if (!w) return "—";
    const s = String(w).toLowerCase();
    if (s.includes("azul")) return "Azuis";
    if (s.includes("vermelh")) return "Vermelhas";
    if (w === "Azuis" || w === "Vermelhas") return w;
    return "—";
  }

  function clearRows(board, rTop, rBottom, cols) {
    for (let c = 0; c < cols; c++) {
      board.clearCell(rTop, c);
      board.clearCell(rBottom, c);
    }
  }

  function drawInitialPieces(board, cols) {
    for (let c = 0; c < cols; c++) {
      board.placePiece(0, c, "vermelho");
      board.placePiece(3, c, "azul");
    }
  }

  function addMsg(text) {
    const li = document.createElement("li");
    li.textContent = text;
    msgList.prepend(li);
  }

  function getSelectedAILevel() {
    let el = document.querySelector('input[name="nivel"]:checked');
    if (el?.value) return el.value;
    return 'easy';
  }

  if (btnInstrucoes && dlgInstrucoes) {
    btnInstrucoes.addEventListener("click", () => {
      dlgInstrucoes.showModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    // Ignorar se está a escrever num input ou textarea
    const tag = e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    
    if (e.key.toLowerCase() === "i") {
      if (!dlgInstrucoes) return;
      dlgInstrucoes.open ? dlgInstrucoes.close() : dlgInstrucoes.showModal();
    }
  });

  updateModeUI();
});
