#!/bin/bash
# ============================================
#   Script para testar o jogo TÂB
# ============================================

echo ""
echo "========================================"
echo "  TÂB - Jogo de Tabuleiro Egípcio"
echo "========================================"
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "[ERRO] Node.js não encontrado!"
    echo "Instala em: https://nodejs.org/"
    exit 1
fi

# Verificar Python
if ! command -v python3 &> /dev/null; then
    echo "[ERRO] Python não encontrado!"
    echo "Instala em: https://python.org/"
    exit 1
fi

echo "[OK] Node.js encontrado"
echo "[OK] Python encontrado"
echo ""

# Iniciar servidor Node.js em background
echo "Iniciando servidor backend (porta 8008)..."
node index.js &
NODE_PID=$!

# Aguardar servidor iniciar
sleep 2

echo "Iniciando servidor frontend (porta 8080)..."
echo ""
echo "========================================"
echo "  Abre no navegador:"
echo "  http://localhost:8080"
echo "========================================"
echo ""
echo "Pressiona Ctrl+C para parar os servidores"
echo ""

# Cleanup ao sair
trap "kill $NODE_PID 2>/dev/null; exit" SIGINT SIGTERM

# Iniciar servidor Python
python3 -m http.server 8080
