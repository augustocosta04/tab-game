# TÂB - Jogo de Tabuleiro Egípcio

## 📋 Requisitos

- **Node.js** (versão 14 ou superior) - https://nodejs.org/

---

## 🚀 Como Executar

### 1. Iniciar o Servidor

Abra um terminal na pasta do projeto e execute:

```bash
node index.js
```

Deve aparecer:
```
Servidor TÂB a correr na porta 8008
http://localhost:8008
```

**Mantenha este terminal aberto!**

---

### 2. Abrir o Cliente (Escolha uma opção)

#### Opção A: VS Code com Live Server (Recomendado)

1. Abra a pasta no VS Code
2. Clique com botão direito em `index.html`
3. Selecione "Open with Live Server"
4. Abre automaticamente em `http://127.0.0.1:5500`

#### Opção B: Servidor HTTP simples

Abra **outro** terminal e execute:

```bash
npx serve .
```

Depois acesse: `http://localhost:3000`

#### Opção C: Abrir diretamente

Dê duplo-clique em `index.html`

⚠️ O modo online pode não funcionar por restrições de segurança do navegador.

---

## 🎮 Como Jogar

### Modo Local (vs Computador)

1. Mantenha "vs Computador" selecionado
2. Escolha o tamanho do tabuleiro e nível da IA
3. Clique em "Iniciar"
4. Jogue!

### Modo Online (vs Jogador)

Precisa de **2 janelas/abas** do navegador:

| Jogador 1 | Jogador 2 |
|-----------|-----------|
| Abre o jogo | Abre o jogo |
| Clica "Entrar" (topo) | Clica "Entrar" (topo) |
| Utilizador: `joao` | Utilizador: `maria` |
| Senha: `123` | Senha: `456` |
| Clica "Entrar" | Clica "Entrar" |
| Seleciona "vs Jogador Online" | Seleciona "vs Jogador Online" |
| Tamanho: 9×4, Grupo: 99 | **Mesmo** tamanho e grupo |
| Clica "Procurar Jogo" | Clica "Procurar Jogo" |
| Aguarda... | Jogo começa! |

---

## 📁 Estrutura do Projeto

```
entrega/
├── index.js          # Servidor Node.js (entrada principal)
├── index.html        # Cliente web
├── style.css         # Estilos
├── package.json      # Configuração do projeto
├── routes/           # Rotas da API
│   ├── register.js   # POST /register
│   ├── ranking.js    # POST /ranking
│   ├── join.js       # POST /join
│   ├── leave.js      # POST /leave
│   ├── roll.js       # POST /roll
│   ├── pass.js       # POST /pass
│   ├── notify.js     # POST /notify
│   └── update.js     # GET /update (SSE)
├── utils/            # Utilitários
│   ├── crypto.js     # Hash MD5
│   ├── validation.js # Validação de argumentos
│   ├── gameLogic.js  # Regras do jogo
│   └── storage.js    # Persistência JSON
├── data/             # Dados persistidos
│   ├── users.json
│   ├── games.json
│   ├── rankings.json
│   └── waitingQueue.json
└── js/               # JavaScript do cliente
    ├── main.js
    ├── api.js
    ├── online-game.js
    ├── game.js
    ├── board.js
    ├── sticks.js
    └── ai/
```

---

## 🔧 API do Servidor

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /register | Registar/Login utilizador |
| POST | /ranking | Obter classificações |
| POST | /join | Entrar na fila de jogo |
| POST | /leave | Abandonar jogo |
| POST | /roll | Lançar dado |
| POST | /pass | Passar a vez |
| POST | /notify | Notificar jogada |
| GET | /update | Server-Sent Events |

---

## 📝 Notas

- O servidor guarda dados em ficheiros JSON na pasta `data/`
- Rankings são separados por grupo e tamanho de tabuleiro
- Timeout de 2 minutos: se um jogador não jogar, perde automaticamente
- Passwords são cifradas com MD5
