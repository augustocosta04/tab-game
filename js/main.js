// Main application logic for TÂB game

let game = null;
let networkClient = null;
let canvas = null;
let ctx = null;
let diceCanvas = null;
let diceCtx = null;
let isOnlineMode = false;
let waitingForServer = false;
let isMyTurn = false;
let myColor = null;

// UI Elements
const onlineModeCheckbox = document.getElementById('onlineMode');
const utilizadorInput = document.getElementById('utilizador');
const senhaInput = document.getElementById('senha');
const grupoInput = document.getElementById('grupo');
const tamanhoSelect = document.getElementById('tamanho');
const btnIniciar = document.getElementById('btnIniciar');
const btnClassificacao = document.getElementById('btnClassificacao');
const btnRoll = document.getElementById('btnRoll');
const btnPass = document.getElementById('btnPass');
const btnLeave = document.getElementById('btnLeave');
const currentPlayerSpan = document.getElementById('currentPlayer');
const diceResultDiv = document.getElementById('diceResult');
const rankingModal = document.getElementById('rankingModal');
const messageModal = document.getElementById('messageModal');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    diceCanvas = document.getElementById('diceCanvas');
    diceCtx = diceCanvas.getContext('2d');

    setupEventListeners();
    loadRankingFromStorage();
});

function setupEventListeners() {
    onlineModeCheckbox.addEventListener('change', () => {
        isOnlineMode = onlineModeCheckbox.checked;
        document.body.classList.toggle('online-mode', isOnlineMode);
        updateUIForMode();
    });

    btnIniciar.addEventListener('click', handleIniciar);
    btnClassificacao.addEventListener('click', showRanking);
    btnRoll.addEventListener('click', handleRoll);
    btnPass.addEventListener('click', handlePass);
    btnLeave.addEventListener('click', handleLeave);

    canvas.addEventListener('click', handleCanvasClick);

    // Modal close buttons
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    document.getElementById('messageOk').addEventListener('click', () => {
        messageModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === rankingModal) {
            rankingModal.style.display = 'none';
        }
        if (event.target === messageModal) {
            messageModal.style.display = 'none';
        }
    });
}

function updateUIForMode() {
    if (isOnlineMode) {
        btnRoll.style.display = 'inline-block';
        btnPass.style.display = 'inline-block';
        btnLeave.style.display = 'inline-block';
    } else {
        btnRoll.style.display = 'none';
        btnPass.style.display = 'none';
        btnLeave.style.display = 'none';
    }
}

function cleanupPreviousGame() {
    // Clean up any previous game state
    if (networkClient && networkClient.gameId) {
        networkClient.disconnect();
    }
    game = null;
    networkClient = null;
    waitingForServer = false;
    isMyTurn = false;
    myColor = null;
}

async function handleIniciar() {
    const size = parseInt(tamanhoSelect.value);

    // Clean up any previous game
    cleanupPreviousGame();

    if (isOnlineMode) {
        await startOnlineGame(size);
    } else {
        startLocalGame(size);
    }
}

function startLocalGame(size) {
    game = new Game(size, false);
    
    // Set up AI for blue player
    const ai = new SimpleAI('blue');
    game.setAI(ai);

    setupCanvas(size);
    updateDisplay();
    showMessage('Jogo Local', 'Jogo iniciado! Sua vez (Vermelho).');
}

async function startOnlineGame(size) {
    const nick = utilizadorInput.value.trim();
    const password = senhaInput.value.trim();
    const group = grupoInput.value.trim();

    if (!nick || !password || !group) {
        showMessage('Erro', 'Preencha todos os campos: Utilizador, Senha e Grupo.');
        return;
    }

    // Initialize network client
    networkClient = new NetworkClient();

    // Try to register (may already exist, that's ok)
    const registerResult = await networkClient.register(nick, password);
    
    // Join game
    const joinResult = await networkClient.join(group, nick, password, size);

    if (!joinResult.success) {
        showMessage('Erro', 'Falha ao entrar no jogo: ' + joinResult.error);
        return;
    }

    // Store player's color if provided by server
    if (joinResult.data && joinResult.data.color) {
        myColor = joinResult.data.color;
    }

    // Initialize game
    game = new Game(size, true);
    setupCanvas(size);

    // Subscribe to updates
    networkClient.subscribeToUpdates(
        joinResult.gameId,
        handleServerUpdate,
        handleServerError
    );

    waitingForServer = true;
    btnIniciar.disabled = true;
    btnLeave.disabled = false;

    showMessage('Jogo Online', 'Conectado! Aguardando início do jogo...');
}

function handleServerUpdate(data) {
    console.log('Server update:', data);

    // Update game state from server
    if (data.board) {
        game.board.fromState({ size: game.board.size, squares: data.board });
    }

    if (data.turn) {
        game.setCurrentPlayer(data.turn);
    }

    // Detect player's color if not set yet
    if (!myColor && data.stores) {
        // Try to determine color from stores or other data
        if (data.stores[networkClient.nick]) {
            myColor = data.stores[networkClient.nick].color || 'red';
        }
    }

    // Check if it's my turn
    const isMyNick = data.player && data.player === networkClient.nick;
    const isMyColor = myColor && data.turn === myColor;
    
    if (isMyNick || isMyColor) {
        isMyTurn = true;
        waitingForServer = false;
        
        if (data.roll !== undefined) {
            // Server provided dice roll
            game.setRoll(null, data.roll);
            animateDiceRoll(data.roll);
        }
    } else {
        isMyTurn = false;
        waitingForServer = true;
    }

    // Handle game over
    if (data.winner) {
        game.gameState = 'finished';
        game.winner = data.winner;
        
        // Save to ranking
        // Server may provide winner as color ('red'/'blue') or nick - check both
        const won = (data.winner === myColor) || (data.winner === networkClient.nick);
        saveGameToRanking(networkClient.nick, won, 'online');
        
        showMessage('Fim de Jogo', `Vencedor: ${data.winner}`);
    }

    updateDisplay();
}

function handleServerError(error) {
    console.error('Server error:', error);
    
    // Clean up on disconnect
    if (networkClient) {
        networkClient.disconnect();
    }
    
    btnIniciar.disabled = false;
    btnLeave.disabled = true;
    waitingForServer = false;
    isMyTurn = false;
    
    showMessage('Erro do Servidor', 'Conexão perdida com o servidor. Clique em "Iniciar" para começar um novo jogo.');
}

async function handleRoll() {
    if (!isOnlineMode || !networkClient || !isMyTurn) return;

    btnRoll.disabled = true;

    const result = await networkClient.roll(
        networkClient.nick,
        networkClient.password,
        networkClient.gameId
    );

    if (result.success) {
        const rollValue = result.roll;
        game.setRoll(null, rollValue);
        animateDiceRoll(rollValue);
        updateDisplay();
    } else {
        showMessage('Erro', 'Falha ao lançar dados: ' + result.error);
        btnRoll.disabled = false;
    }
}

async function handlePass() {
    if (!isOnlineMode || !networkClient || !isMyTurn) return;

    const result = await networkClient.pass(
        networkClient.nick,
        networkClient.password,
        networkClient.gameId
    );

    if (result.success) {
        game.passTurn();
        isMyTurn = false;
        waitingForServer = true;
        updateDisplay();
    } else {
        showMessage('Erro', 'Falha ao passar turno: ' + result.error);
    }
}

async function handleLeave() {
    if (!isOnlineMode || !networkClient) return;

    const result = await networkClient.leave(
        networkClient.nick,
        networkClient.password,
        networkClient.gameId
    );

    if (result.success) {
        networkClient.disconnect();
        game = null;
        btnIniciar.disabled = false;
        btnLeave.disabled = true;
        clearCanvas();
        showMessage('Jogo Terminado', 'Você saiu do jogo.');
    } else {
        showMessage('Erro', 'Falha ao sair: ' + result.error);
    }
}

function handleCanvasClick(event) {
    if (!game || game.gameState !== 'playing') return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const squareIndex = game.board.getSquareAtPosition(x, y);

    if (squareIndex === -1) return;

    if (isOnlineMode) {
        handleOnlineClick(squareIndex);
    } else {
        handleLocalClick(squareIndex);
    }
}

function handleLocalClick(squareIndex) {
    // In local mode, human plays red
    if (game.currentPlayer !== 'red') return;

    if (!game.lastRoll) {
        // Need to roll first
        game.rollDice();
        animateDiceRoll(game.lastRoll.value);
        updateDisplay();
        return;
    }

    // Try to select piece or move
    if (game.selectedPiece === null) {
        // Select piece
        if (game.selectPiece(squareIndex)) {
            updateDisplay();
        }
    } else {
        // Try to move
        const result = game.movePiece(game.selectedPiece, squareIndex);
        if (result && result.moved) {
            if (result.gameOver) {
                saveGameToRanking(utilizadorInput.value || 'Player', true, 'local');
                showMessage('Fim de Jogo', `Vencedor: ${result.winner}`);
            }
            updateDisplay();
        } else {
            // Invalid move, deselect
            game.selectedPiece = null;
            updateDisplay();
        }
    }
}

async function handleOnlineClick(squareIndex) {
    if (!isMyTurn || !game.lastRoll) return;

    if (game.selectedPiece === null) {
        // Select piece
        if (game.selectPiece(squareIndex)) {
            updateDisplay();
        }
    } else {
        // Try to move
        const from = game.selectedPiece;
        const to = squareIndex;

        // Validate move locally first
        const validMoves = game.getValidMovesForSelected();
        if (!validMoves.includes(to)) {
            game.selectedPiece = null;
            updateDisplay();
            return;
        }

        // Send move to server
        const move = { from: from, to: to };
        const result = await networkClient.notify(
            networkClient.nick,
            networkClient.password,
            networkClient.gameId,
            move
        );

        if (result.success) {
            game.applyMove(from, to);
            isMyTurn = false;
            waitingForServer = true;
            updateDisplay();
        } else {
            showMessage('Erro', 'Movimento inválido: ' + result.error);
            game.selectedPiece = null;
            updateDisplay();
        }
    }
}

function setupCanvas(size) {
    const canvasSize = game.board.getCanvasSize();
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
}

function clearCanvas() {
    if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function updateDisplay() {
    if (!game) return;

    // Draw board
    game.board.draw(ctx);

    // Highlight selected piece
    if (game.selectedPiece !== null) {
        game.board.drawHighlight(ctx, game.selectedPiece, '#ffd700');

        // Highlight valid moves
        const validMoves = game.getValidMovesForSelected();
        validMoves.forEach(index => {
            game.board.drawHighlight(ctx, index, '#90ee90');
        });
    }

    // Update turn info
    let turnText = `Turno: ${game.currentPlayer === 'red' ? 'Vermelho' : 'Azul'}`;
    
    if (isOnlineMode) {
        if (isMyTurn) {
            turnText += ' (Sua vez)';
        } else if (waitingForServer) {
            turnText += ' (Aguardando...)';
        }
    }

    currentPlayerSpan.textContent = turnText;

    // Update dice result
    if (game.lastRoll) {
        diceResultDiv.textContent = `Resultado: ${game.lastRoll.value}`;
    } else {
        diceResultDiv.textContent = 'Clique para lançar';
    }

    // Update button states
    updateButtonStates();
}

function updateButtonStates() {
    if (isOnlineMode) {
        btnRoll.disabled = !isMyTurn || waitingForServer || game.lastRoll !== null;
        btnPass.disabled = !isMyTurn || waitingForServer;
        btnLeave.disabled = !game;
    }
}

function animateDiceRoll(value) {
    if (!diceCtx || !diceCanvas) return;
    
    // Animation constants
    const MAX_FRAMES = 20;
    const FRAME_DELAY_MS = 50;
    const FLICKER_PROBABILITY = 0.3;
    
    // Simple canvas animation for dice roll
    let frame = 0;

    const animate = () => {
        diceCtx.clearRect(0, 0, diceCanvas.width, diceCanvas.height);

        // Draw 4 sticks
        const stickWidth = 40;
        const stickHeight = 10;
        const spacing = 10;
        const startX = (diceCanvas.width - (4 * stickWidth + 3 * spacing)) / 2;
        const startY = diceCanvas.height / 2 - stickHeight / 2;

        // Generate random appearance during animation, final result at end
        const sticks = [];
        if (frame < MAX_FRAMES - 1) {
            for (let i = 0; i < 4; i++) {
                sticks.push(Math.random() < 0.5 ? 0 : 1);
            }
        } else {
            // Final frame - show actual result
            const roundSides = value === 6 ? 0 : value;
            for (let i = 0; i < 4; i++) {
                sticks.push(i < roundSides ? 1 : 0);
            }
        }

        for (let i = 0; i < 4; i++) {
            const x = startX + i * (stickWidth + spacing);
            
            // Draw stick
            diceCtx.fillStyle = sticks[i] === 1 ? '#e74c3c' : '#34495e';
            diceCtx.fillRect(x, startY, stickWidth, stickHeight);
            
            // Add flicker effect during animation
            if (frame < MAX_FRAMES - 1 && Math.random() < FLICKER_PROBABILITY) {
                diceCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                diceCtx.fillRect(x, startY, stickWidth, stickHeight);
            }
        }

        frame++;
        if (frame < MAX_FRAMES) {
            setTimeout(animate, FRAME_DELAY_MS);
        }
    };

    animate();
}

function showMessage(title, text) {
    document.getElementById('messageTitle').textContent = title;
    document.getElementById('messageText').textContent = text;
    messageModal.style.display = 'block';
}

function showRanking() {
    const rankings = loadRankingFromStorage();
    
    const rankingContent = document.getElementById('rankingContent');
    rankingContent.innerHTML = '';

    if (rankings.length === 0) {
        rankingContent.innerHTML = '<p>Nenhum jogo registrado ainda.</p>';
    } else {
        rankings.forEach((entry, index) => {
            const div = document.createElement('div');
            div.className = `ranking-entry ${entry.source}`;
            div.innerHTML = `
                <span>#${index + 1} ${entry.nick} - ${entry.victories} vitórias</span>
                <span>${entry.source === 'online' ? '🌐 Online' : '🏠 Local'}</span>
            `;
            rankingContent.appendChild(div);
        });
    }

    rankingModal.style.display = 'block';
}

function loadRankingFromStorage() {
    const stored = localStorage.getItem('tabRanking');
    return stored ? JSON.parse(stored) : [];
}

function saveRankingToStorage(rankings) {
    localStorage.setItem('tabRanking', JSON.stringify(rankings));
}

function saveGameToRanking(nick, won, source) {
    if (!won || !nick) return;

    const rankings = loadRankingFromStorage();
    
    // Find existing entry
    let entry = rankings.find(e => e.nick === nick && e.source === source);
    
    if (entry) {
        entry.victories++;
        entry.lastPlayed = new Date().toISOString();
    } else {
        rankings.push({
            nick: nick,
            victories: 1,
            source: source,
            lastPlayed: new Date().toISOString()
        });
    }

    // Sort by victories
    rankings.sort((a, b) => b.victories - a.victories);

    saveRankingToStorage(rankings);
}

// Initialize UI
updateUIForMode();
