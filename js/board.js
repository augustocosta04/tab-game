// Board representation for TÂB game
class Board {
    constructor(size = 3) {
        this.size = size; // 3 rows or 4 rows
        this.cols = size === 3 ? 8 : 12;
        this.squares = this.initializeBoard();
        this.cellSize = 60;
        this.padding = 20;
    }

    initializeBoard() {
        const squares = [];
        for (let i = 0; i < this.size * this.cols; i++) {
            squares.push({
                index: i,
                piece: null, // null, 'red', or 'blue'
                row: Math.floor(i / this.cols),
                col: i % this.cols
            });
        }
        return squares;
    }

    getSquare(index) {
        return this.squares[index];
    }

    setPiece(index, piece) {
        if (index >= 0 && index < this.squares.length) {
            this.squares[index].piece = piece;
            return true;
        }
        return false;
    }

    removePiece(index) {
        if (index >= 0 && index < this.squares.length) {
            this.squares[index].piece = null;
            return true;
        }
        return false;
    }

    getPiece(index) {
        if (index >= 0 && index < this.squares.length) {
            return this.squares[index].piece;
        }
        return null;
    }

    isEmpty(index) {
        return this.getPiece(index) === null;
    }

    movePiece(from, to) {
        const piece = this.getPiece(from);
        if (piece && this.isEmpty(to)) {
            this.removePiece(from);
            this.setPiece(to, piece);
            return true;
        }
        return false;
    }

    capturePiece(attacker, target) {
        const attackerPiece = this.getPiece(attacker);
        const targetPiece = this.getPiece(target);
        
        if (attackerPiece && targetPiece && attackerPiece !== targetPiece) {
            this.removePiece(target);
            return true;
        }
        return false;
    }

    getValidMoves(position, steps) {
        const moves = [];
        const piece = this.getPiece(position);
        
        if (!piece) return moves;

        // Forward movement
        const forward = position + steps;
        if (forward < this.squares.length && this.isEmpty(forward)) {
            moves.push(forward);
        }

        // Backward movement
        const backward = position - steps;
        if (backward >= 0 && this.isEmpty(backward)) {
            moves.push(backward);
        }

        return moves;
    }

    getCaptureTargets(position) {
        const targets = [];
        const piece = this.getPiece(position);
        
        if (!piece) return targets;

        // Check adjacent squares for enemy pieces
        const adjacentPositions = [position - 1, position + 1];
        
        for (const adj of adjacentPositions) {
            if (adj >= 0 && adj < this.squares.length) {
                const adjPiece = this.getPiece(adj);
                if (adjPiece && adjPiece !== piece) {
                    targets.push(adj);
                }
            }
        }

        return targets;
    }

    reset() {
        this.squares = this.initializeBoard();
    }

    clone() {
        const newBoard = new Board(this.size);
        newBoard.squares = this.squares.map(sq => ({ ...sq }));
        return newBoard;
    }

    toState() {
        return {
            size: this.size,
            squares: this.squares.map(sq => sq.piece)
        };
    }

    fromState(state) {
        if (state && state.squares) {
            this.size = state.size || 3;
            this.cols = this.size === 3 ? 8 : 12;
            this.squares = this.initializeBoard();
            state.squares.forEach((piece, index) => {
                if (piece) {
                    this.setPiece(index, piece);
                }
            });
        }
    }

    draw(ctx) {
        const width = this.cols * this.cellSize + 2 * this.padding;
        const height = this.size * this.cellSize + 2 * this.padding;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw board grid
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.cols; col++) {
                const x = this.padding + col * this.cellSize;
                const y = this.padding + row * this.cellSize;

                // Draw square
                ctx.strokeStyle = '#2c3e50';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, this.cellSize, this.cellSize);

                // Draw piece if present
                const index = row * this.cols + col;
                const piece = this.getPiece(index);

                if (piece) {
                    ctx.fillStyle = piece === 'red' ? '#e74c3c' : '#3498db';
                    ctx.beginPath();
                    ctx.arc(
                        x + this.cellSize / 2,
                        y + this.cellSize / 2,
                        this.cellSize / 3,
                        0,
                        Math.PI * 2
                    );
                    ctx.fill();
                }
            }
        }
    }

    drawHighlight(ctx, index, color = 'yellow') {
        const square = this.getSquare(index);
        if (!square) return;

        const x = this.padding + square.col * this.cellSize;
        const y = this.padding + square.row * this.cellSize;

        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.strokeRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);
    }

    getSquareAtPosition(x, y) {
        const col = Math.floor((x - this.padding) / this.cellSize);
        const row = Math.floor((y - this.padding) / this.cellSize);

        if (col >= 0 && col < this.cols && row >= 0 && row < this.size) {
            return row * this.cols + col;
        }

        return -1;
    }

    getCanvasSize() {
        return {
            width: this.cols * this.cellSize + 2 * this.padding,
            height: this.size * this.cellSize + 2 * this.padding
        };
    }
}
