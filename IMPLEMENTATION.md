# TÂB Game - Implementation Documentation

## Overview
This implementation provides a complete TÂB (ancient Egyptian board game) with both local and online multiplayer modes.

## Features Implemented

### 1. Networking Module (`js/net.js`)
- **NetworkClient class** with methods for all server endpoints:
  - `register(nick, password)` - Register a new user
  - `join(group, nick, password, size)` - Join a game
  - `leave(nick, password, game)` - Leave current game
  - `roll(nick, password, game)` - Roll dice
  - `pass(nick, password, game)` - Pass turn
  - `notify(nick, password, game, move)` - Send move to server
  - `ranking(group, size)` - Get ranking data
  - `subscribeToUpdates(game, onUpdate, onError)` - SSE client for real-time updates
- All methods use GET requests with URL-encoded parameters
- JSON response parsing with error handling
- SSE connection management (open/close)

### 2. UI Integration (`index.html`, `style.css`)
- **Mode Toggle**: Checkbox to switch between local and online modes
- **Authentication**: Utilizador (username) and Senha (password) inputs
- **Group Field**: Additional field for online mode (hidden in local mode)
- **Board Size**: Selector for 3x8 or 4x12 board layouts
- **Game Controls**: Iniciar (Start), Classificação (Ranking), Roll, Pass, Leave buttons
- **HUD Display**: Turn info, dice canvas animation, result display
- **Game Board**: Canvas-based rendering with visual feedback
- **Modals**: Ranking display and message dialogs

### 3. Game Logic (`js/game.js`, `js/board.js`)
- **Board class**: 
  - Square-based representation
  - Piece placement and movement
  - Valid move calculation
  - Capture mechanics
  - Canvas rendering
- **Game class**:
  - Local and online mode support
  - Turn management
  - Dice rolling (4 sticks, binary system)
  - Move validation
  - Win condition checking
  - State serialization
- **SimpleAI class**: Basic AI opponent for local mode

### 4. Main Application (`js/main.js`)
- **Mode Management**: 
  - Local mode: Human (Red) vs AI (Blue)
  - Online mode: Multiplayer via server
- **Network Integration**:
  - Auto-registration on join
  - SSE subscription for game updates
  - Turn synchronization with server
  - Move notification to server
- **UI State Management**:
  - Button enable/disable based on game state
  - Visual feedback for selections
  - Turn indication
- **Event Handling**:
  - Canvas click for piece selection and movement
  - Button clicks for game actions
  - Modal interactions

### 5. WebStorage Persistence
- **Ranking System**:
  - Stores game results in localStorage
  - Tracks victories per player
  - Separate tracking for "local" and "online" sources
  - Persistent across page reloads
  - Sorted by victories

### 6. Canvas Animation
- **Dice Roll Animation**:
  - 200x60 canvas for stick display
  - 4 sticks (binary dice) representation
  - Flicker effect during animation (20 frames)
  - Color-coded: red for round side (1), dark for flat side (0)
  - Visual highlight effects
  - Final result display

## Game Rules (TÂB)

1. **Board**: 3 rows x 8 columns (or 4 rows x 12 columns)
2. **Pieces**: 5 (or 7) pieces per player - Red starts at beginning, Blue at end
3. **Dice**: 4 binary sticks (0 or 1), sum determines movement (0=6 special rule)
4. **Movement**: Forward or backward by dice value
5. **Capture**: Landing adjacent to enemy piece captures it
6. **Victory**: Eliminate all opponent pieces

## Server Integration

- **Base URL**: http://twserver.alunos.dcc.fc.up.pt:8008
- **Protocol**: GET requests with URL-encoded parameters
- **Real-time**: Server-Sent Events (SSE) for game state updates
- **Turn Management**: Server dictates whose turn it is
- **Move Validation**: Server validates and broadcasts moves

## Usage

### Local Mode
1. Ensure "Modo Online" is unchecked
2. Select board size (3x8 or 4x12)
3. Click "Iniciar"
4. Click board to roll dice and make moves
5. AI will automatically play as Blue

### Online Mode
1. Check "Modo Online"
2. Enter Utilizador, Senha, and Grupo
3. Select board size
4. Click "Iniciar"
5. Wait for opponent
6. Use "Lançar Dados" button to roll
7. Click pieces to select and move
8. Use "Passar" to skip turn or "Sair" to leave

### Ranking
- Click "Classificação" to view rankings
- Shows victories for both local and online games
- Color-coded entries (green for online, yellow for local)

## File Structure

```
tab-game/
├── index.html          # Main HTML interface
├── style.css           # Styling and layout
├── js/
│   ├── board.js        # Board representation and rendering
│   ├── game.js         # Game logic and AI
│   ├── net.js          # Network client and SSE
│   └── main.js         # Application controller
└── README.md           # Project readme
```

## Browser Compatibility

- Modern browsers with Canvas API support
- EventSource API for SSE (all modern browsers)
- localStorage API for persistence

## Future Enhancements

- More sophisticated AI algorithms
- Replay functionality
- Game history tracking
- Enhanced animations
- Sound effects
- Mobile responsive design
- Tournament mode
