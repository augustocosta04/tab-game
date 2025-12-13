# TÂB Game - Quick Start Guide

## Local Mode (Single Player vs AI)

1. Open `index.html` in your web browser
2. Ensure "Modo Online" checkbox is **unchecked**
3. Select board size from dropdown (3x8 or 4x12)
4. Click "Iniciar" button
5. Play as Red pieces - click the board to:
   - Roll dice (if not rolled yet)
   - Select your piece (click a red piece)
   - Move piece (click a valid destination square)
6. AI automatically plays as Blue

## Online Mode (Multiplayer)

1. Open `index.html` in your web browser
2. **Check** the "Modo Online" checkbox
3. Fill in credentials:
   - **Utilizador**: Your username
   - **Senha**: Your password
   - **Grupo**: Game group name (shared with opponent)
4. Select board size (both players must use same size)
5. Click "Iniciar" to connect to server
6. Wait for opponent to join
7. When it's your turn:
   - Click "Lançar Dados" to roll
   - Click your piece to select it
   - Click destination to move
   - Click "Passar" to skip turn
8. Click "Sair" to leave game

## Game Controls

- **Iniciar**: Start a new game
- **Classificação**: View rankings (local and online)
- **Lançar Dados**: Roll dice (online mode only)
- **Passar**: Pass your turn (online mode only)
- **Sair**: Leave current game (online mode only)

## Tips

- Yellow highlight = selected piece
- Green highlight = valid move destinations
- Capture enemy pieces by landing adjacent to them
- Win by eliminating all opponent pieces
- Rankings are saved automatically and persist across sessions

## Troubleshooting

### "Falha ao entrar no jogo"
- Check your internet connection
- Verify server is accessible: http://twserver.alunos.dcc.fc.up.pt:8008
- Ensure all fields are filled correctly
- Try a different group name

### "Conexão perdida com o servidor"
- Server may be temporarily down
- Check network connection
- Click "Iniciar" to try reconnecting

### Local mode not working
- Check JavaScript console for errors (F12 in most browsers)
- Ensure all files are present in correct locations
- Try refreshing the page

## Server Details

- **URL**: http://twserver.alunos.dcc.fc.up.pt:8008
- **Protocol**: HTTP with GET requests
- **Real-time**: Server-Sent Events (SSE)
- **Endpoints**: register, join, leave, roll, pass, notify, update, ranking

## Browser Requirements

- Canvas API support
- EventSource (SSE) support
- localStorage support
- JavaScript ES6+

Tested on: Chrome, Firefox, Edge, Safari

## Development Server

For local development:

```bash
# Python 3
python3 -m http.server 8080

# Node.js
npx http-server -p 8080

# PHP
php -S localhost:8080
```

Then open: http://localhost:8080

## File Structure

```
tab-game/
├── index.html          # Main page
├── style.css           # Styles
└── js/
    ├── board.js        # Board logic
    ├── game.js         # Game rules
    ├── net.js          # Network client
    └── main.js         # App controller
```

For detailed implementation information, see [IMPLEMENTATION.md](IMPLEMENTATION.md).
