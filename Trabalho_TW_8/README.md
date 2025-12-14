# TÂB - Jogo de Tabuleiro Egípcio

**Tecnologias Web - 2ª e 3ª Entrega**

## Autores

| Nome | Número |
|------|--------|
| Cauã Pinheiro | up202302423 |
| Augusto Costa | up202300654 |
| João Mário | - |

---

## Descrição

TÂB é um jogo de tabuleiro tradicional egípcio implementado como aplicação web multiplayer. O projeto consiste num servidor Node.js que fornece uma API REST + Server-Sent Events (SSE) e um cliente web interativo.

### Funcionalidades

- **Jogo Local**: Jogar contra o computador com 3 níveis de dificuldade (Fácil, Médio, Difícil)
- **Jogo Online**: Partidas multiplayer em tempo real via servidor
- **Rankings**: Tabela classificativa por grupo e tamanho de tabuleiro
- **Persistência**: Dados guardados localmente (localStorage) e no servidor (JSON)
- **Animações**: Dado de paus animado com Canvas HTML5

---

## Como Executar

### Pré-requisitos

- Node.js (v14 ou superior)
- Python 3 (para servir o frontend)

### 1. Iniciar o Servidor (Backend)

```bash
# Instalar dependências
npm install

# Iniciar o servidor na porta 8008
node index.js
```

O servidor estará disponível em `http://localhost:8008`

### 2. Iniciar o Cliente (Frontend)

Numa **nova janela do terminal**, na mesma pasta do projeto:

```bash
# Servir os ficheiros estáticos com Python
python -m http.server 8080
```

Ou em Python 2:
```bash
python -m SimpleHTTPServer 8080
```

### 3. Aceder ao Jogo

Abrir o navegador em: **http://localhost:8080**

---

## Estrutura do Projeto

```
├── index.js              # Servidor Node.js principal
├── package.json          # Dependências do projeto
├── index.html            # Página principal do cliente
├── style.css             # Estilos CSS
│
├── js/                   # JavaScript do cliente
│   ├── api.js            # Comunicação com o servidor (REST + SSE)
│   ├── main.js           # Inicialização e UI
│   ├── game.js           # Lógica do jogo local
│   ├── online-game.js    # Lógica do jogo online
│   ├── board.js          # Renderização do tabuleiro
│   ├── sticks.js         # Dado de paus com animação Canvas
│   └── ai/               # Inteligência artificial
│       ├── easy.js
│       ├── medium.js
│       └── hard.js
│
├── routes/               # Rotas do servidor
│   ├── register.js       # Registo de utilizadores
│   ├── join.js           # Emparelhamento de jogadores
│   ├── leave.js          # Abandonar jogo
│   ├── roll.js           # Lançar dado
│   ├── pass.js           # Passar a vez
│   ├── notify.js         # Notificar jogada
│   ├── update.js         # SSE para atualizações
│   └── ranking.js        # Tabela classificativa
│
├── utils/                # Utilitários do servidor
│   ├── gameLogic.js      # Regras do jogo TÂB
│   ├── validation.js     # Validação de dados
│   ├── storage.js        # Persistência em ficheiros
│   └── crypto.js         # Hash de passwords
│
└── data/                 # Dados persistentes
    ├── users.json        # Utilizadores registados
    ├── games.json        # Jogos em curso
    ├── rankings.json     # Tabelas classificativas
    └── waitingQueue.json # Fila de espera
```

---

## API do Servidor

### Endpoints REST (POST)

| Endpoint | Argumentos | Descrição |
|----------|------------|-----------|
| `/register` | nick, password | Registar utilizador |
| `/join` | group, nick, password, size, first | Entrar na fila de espera |
| `/leave` | nick, password, game | Abandonar jogo |
| `/roll` | nick, password, game | Lançar o dado |
| `/pass` | nick, password, game | Passar a vez |
| `/notify` | nick, password, game, cell | Notificar jogada |
| `/ranking` | group, size | Obter classificação |

### Server-Sent Events (GET)

| Endpoint | Argumentos | Descrição |
|----------|------------|-----------|
| `/update` | nick, game | Stream de atualizações do jogo |

---

## Regras do Jogo TÂB

1. **Objetivo**: Capturar todas as peças do adversário
2. **Dado de Paus**: 4 paus com faces clara/escura determinam o movimento (1-4 ou 6)
3. **Movimento**: Peças movem-se em ziguezague pelo tabuleiro
4. **Captura**: Ao cair numa casa ocupada pelo adversário, a peça é capturada
5. **Repetição**: Valores 1, 4 ou 6 permitem jogar novamente
6. **Peças Abençoadas**: Ao chegar à última linha do adversário, a peça pode percorrer todo o tabuleiro

---

## Valorizações Implementadas

### 2ª Entrega
- ✅ **WebStorage**: Rankings do jogo local guardados em localStorage
- ✅ **Canvas**: Animação do dado de paus caindo

### 3ª Entrega
- ✅ **Servidor Node.js**: Todos os 8 endpoints implementados
- ✅ **Integração completa**: Cliente comunica com servidor próprio

---

## Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (ES6 Modules), Canvas API
- **Backend**: Node.js (HTTP nativo, sem frameworks)
- **Comunicação**: REST API, Server-Sent Events (SSE)
- **Persistência**: JSON (servidor), localStorage (cliente)

---

## Licença

Projeto académico desenvolvido para a unidade curricular de Tecnologias Web - FCUP 2024/2025
