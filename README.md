# TÂB Game - Ancient Egyptian Board Game

A web-based implementation of TÂB (Game of Twenty Squares) with local and online multiplayer modes.

## Features

- **Local Mode**: Play against AI
- **Online Mode**: Multiplayer via university server
- **Canvas Graphics**: Interactive board and dice animations
- **Ranking System**: Track victories across sessions
- **Real-time Updates**: Server-Sent Events (SSE) for online play

## Quick Start

1. Open `index.html` in a modern web browser
2. Choose Local or Online mode
3. Click "Iniciar" to start playing

## Local Development

```bash
# Start a simple HTTP server
python3 -m http.server 8080

# Open in browser
# http://localhost:8080
```

## Online Mode

1. Check "Modo Online"
2. Enter your credentials:
   - **Utilizador**: Your username
   - **Senha**: Your password
   - **Grupo**: Game group identifier
3. Select board size (3x8 or 4x12)
4. Click "Iniciar" to connect

Server: http://twserver.alunos.dcc.fc.up.pt:8008

## Game Rules

- **Objective**: Eliminate all opponent pieces
- **Dice**: 4 binary sticks (sum determines movement, 0 = 6)
- **Movement**: Forward or backward by dice value
- **Capture**: Land adjacent to enemy piece

## Technology

- Pure JavaScript (ES6+)
- HTML5 Canvas
- Server-Sent Events (SSE)
- localStorage for persistence

## Documentation

See [IMPLEMENTATION.md](IMPLEMENTATION.md) for detailed documentation.

## License

Educational project for university coursework.