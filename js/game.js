// Game logic for TÂB
class Game {
    constructor(size = 3, isOnline = false) {
        this.board = new Board(size);
        this.isOnline = isOnline;
        this.currentPlayer = 'red'; // 'red' or 'blue'
        this.gameState = 'setup'; // 'setup', 'playing', 'finished'
        this.lastRoll = null;
        this.selectedPiece = null;
        this.redPieces = size === 3 ? 5 : 7;
        this.bluePieces = size === 3 ? 5 : 7;
        this.winner = null;
        this.moveCallback = null; // For online mode
        this.ai = null; // AI player for local mode
        
        this.initializeGame();
    }

    initializeGame() {
        // Place initial pieces
        // Red starts at beginning, Blue at end
        const totalSquares = this.board.size * this.board.cols;
        
        // Place red pieces
        for (let i = 0; i < this.redPieces; i++) {
            this.board.setPiece(i, 'red');
        }

        // Place blue pieces
        for (let i = 0; i < this.bluePieces; i++) {
            this.board.setPiece(totalSquares - 1 - i, 'blue');
        }

        this.gameState = 'playing';
    }

    setMoveCallback(callback) {
        this.moveCallback = callback;
    }

    setAI(ai) {
        this.ai = ai;
    }

    rollDice() {
        // TÂB uses 4 sticks (binary dice)
        // Each stick has 2 sides - flat (0) or round (1)
        // Result is sum of round sides (0-4)
        const sticks = [];
        for (let i = 0; i < 4; i++) {
            sticks.push(Math.random() < 0.5 ? 0 : 1);
        }
        
        const sum = sticks.reduce((a, b) => a + b, 0);
        
        // Special rule: 0 counts as 6
        this.lastRoll = {
            sticks: sticks,
            value: sum === 0 ? 6 : sum
        };

        return this.lastRoll;
    }

    setRoll(sticks, value) {
        // For online mode - server provides the roll
        this.lastRoll = {
            sticks: sticks || [0, 0, 0, 0],
            value: value
        };
        return this.lastRoll;
    }

    selectPiece(index) {
        const piece = this.board.getPiece(index);
        
        if (this.gameState !== 'playing') return false;
        if (!piece || piece !== this.currentPlayer) return false;
        
        this.selectedPiece = index;
        return true;
    }

    getValidMovesForSelected() {
        if (this.selectedPiece === null || !this.lastRoll) return [];
        return this.board.getValidMoves(this.selectedPiece, this.lastRoll.value);
    }

    movePiece(from, to) {
        if (this.gameState !== 'playing') return false;
        if (!this.lastRoll) return false;

        const piece = this.board.getPiece(from);
        if (!piece || piece !== this.currentPlayer) return false;

        const validMoves = this.board.getValidMoves(from, this.lastRoll.value);
        if (!validMoves.includes(to)) return false;

        // Execute move
        this.board.movePiece(from, to);

        // Check for captures
        const captureTargets = this.board.getCaptureTargets(to);
        captureTargets.forEach(target => {
            this.board.capturePiece(to, target);
        });

        // Clear selection and roll
        this.selectedPiece = null;
        this.lastRoll = null;

        // Check win condition
        if (this.checkWinCondition()) {
            this.gameState = 'finished';
            this.winner = this.currentPlayer;
            return { moved: true, gameOver: true, winner: this.winner };
        }

        // Switch player
        this.switchPlayer();

        return { moved: true, gameOver: false };
    }

    applyMove(from, to) {
        // For online mode - apply server-provided move without validation
        this.board.movePiece(from, to);
        
        // Check for captures
        const captureTargets = this.board.getCaptureTargets(to);
        captureTargets.forEach(target => {
            this.board.capturePiece(to, target);
        });

        this.selectedPiece = null;
        this.lastRoll = null;
    }

    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'red' ? 'blue' : 'red';
        
        // In local mode, trigger AI if it's AI's turn
        if (!this.isOnline && this.ai && this.currentPlayer === this.ai.player) {
            setTimeout(() => {
                if (this.gameState === 'playing') {
                    this.ai.makeMove(this);
                }
            }, 1000);
        }
    }

    setCurrentPlayer(player) {
        this.currentPlayer = player;
    }

    passTurn() {
        if (this.gameState !== 'playing') return false;
        
        this.selectedPiece = null;
        this.lastRoll = null;
        this.switchPlayer();
        
        return true;
    }

    checkWinCondition() {
        // Win if opponent has no pieces left or cannot move
        const opponent = this.currentPlayer === 'red' ? 'blue' : 'red';
        let opponentPieces = 0;

        for (let i = 0; i < this.board.squares.length; i++) {
            if (this.board.getPiece(i) === opponent) {
                opponentPieces++;
            }
        }

        return opponentPieces === 0;
    }

    canMove() {
        if (!this.lastRoll) return false;

        for (let i = 0; i < this.board.squares.length; i++) {
            if (this.board.getPiece(i) === this.currentPlayer) {
                const moves = this.board.getValidMoves(i, this.lastRoll.value);
                if (moves.length > 0) return true;
            }
        }

        return false;
    }

    reset(size) {
        this.board = new Board(size || this.board.size);
        this.currentPlayer = 'red';
        this.gameState = 'setup';
        this.lastRoll = null;
        this.selectedPiece = null;
        this.winner = null;
        this.redPieces = (size || this.board.size) === 3 ? 5 : 7;
        this.bluePieces = (size || this.board.size) === 3 ? 5 : 7;
        this.initializeGame();
    }

    getState() {
        return {
            board: this.board.toState(),
            currentPlayer: this.currentPlayer,
            gameState: this.gameState,
            lastRoll: this.lastRoll,
            winner: this.winner
        };
    }

    setState(state) {
        if (state.board) {
            this.board.fromState(state.board);
        }
        if (state.currentPlayer) {
            this.currentPlayer = state.currentPlayer;
        }
        if (state.gameState) {
            this.gameState = state.gameState;
        }
        if (state.winner) {
            this.winner = state.winner;
        }
    }
}

// Simple AI for local mode
class SimpleAI {
    constructor(player) {
        this.player = player; // 'red' or 'blue'
    }

    makeMove(game) {
        // Roll dice
        game.rollDice();

        // Find all pieces and valid moves
        const moves = [];
        for (let i = 0; i < game.board.squares.length; i++) {
            if (game.board.getPiece(i) === this.player) {
                const validMoves = game.board.getValidMoves(i, game.lastRoll.value);
                validMoves.forEach(to => {
                    moves.push({ from: i, to: to });
                });
            }
        }

        // If no moves available, pass
        if (moves.length === 0) {
            game.passTurn();
            return;
        }

        // Choose random move
        const move = moves[Math.floor(Math.random() * moves.length)];
        game.movePiece(move.from, move.to);
    }
}
