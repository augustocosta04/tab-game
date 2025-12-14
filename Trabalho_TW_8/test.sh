#!/bin/bash
# Script de teste do servidor TÂB

BASE_URL="http://localhost:8008"

echo "========================================"
echo "  TESTES DO SERVIDOR TÂB"
echo "========================================"
echo ""

# Teste 1: Register novo utilizador
echo "1. Registar novo utilizador (user1)..."
RESP=$(curl -s -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d '{"nick":"user1","password":"pass1"}')
echo "   Resposta: $RESP"
if [ "$RESP" = "{}" ]; then
  echo "   ✅ PASSOU"
else
  echo "   ❌ FALHOU"
fi
echo ""

# Teste 2: Login com senha correta
echo "2. Login com senha correta..."
RESP=$(curl -s -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d '{"nick":"user1","password":"pass1"}')
echo "   Resposta: $RESP"
if [ "$RESP" = "{}" ]; then
  echo "   ✅ PASSOU"
else
  echo "   ❌ FALHOU"
fi
echo ""

# Teste 3: Login com senha errada
echo "3. Login com senha errada (deve dar erro)..."
RESP=$(curl -s -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d '{"nick":"user1","password":"errada"}')
echo "   Resposta: $RESP"
if [[ "$RESP" == *"error"* ]]; then
  echo "   ✅ PASSOU"
else
  echo "   ❌ FALHOU"
fi
echo ""

# Teste 4: Ranking vazio
echo "4. Buscar ranking (deve estar vazio)..."
RESP=$(curl -s -X POST "$BASE_URL/ranking" \
  -H "Content-Type: application/json" \
  -d '{"group":99,"size":9}')
echo "   Resposta: $RESP"
if [[ "$RESP" == *"ranking"* ]]; then
  echo "   ✅ PASSOU"
else
  echo "   ❌ FALHOU"
fi
echo ""

# Teste 5: Join primeiro jogador
echo "5. Join - primeiro jogador entra na fila..."
RESP=$(curl -s -X POST "$BASE_URL/join" \
  -H "Content-Type: application/json" \
  -d '{"group":99,"nick":"user1","password":"pass1","size":9}')
echo "   Resposta: $RESP"
if [[ "$RESP" == *"game"* ]]; then
  GAME_ID=$(echo $RESP | sed 's/.*"game":"\([^"]*\)".*/\1/')
  echo "   Game ID: $GAME_ID"
  echo "   ✅ PASSOU"
else
  echo "   ❌ FALHOU"
fi
echo ""

# Teste 6: Registar segundo jogador
echo "6. Registar segundo jogador (user2)..."
RESP=$(curl -s -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d '{"nick":"user2","password":"pass2"}')
echo "   Resposta: $RESP"
if [ "$RESP" = "{}" ]; then
  echo "   ✅ PASSOU"
else
  echo "   ❌ FALHOU"
fi
echo ""

# Teste 7: Join segundo jogador (deve emparelhar)
echo "7. Join - segundo jogador (deve emparelhar)..."
RESP=$(curl -s -X POST "$BASE_URL/join" \
  -H "Content-Type: application/json" \
  -d '{"group":99,"nick":"user2","password":"pass2","size":9}')
echo "   Resposta: $RESP"
if [[ "$RESP" == *"game"* ]]; then
  GAME_ID2=$(echo $RESP | sed 's/.*"game":"\([^"]*\)".*/\1/')
  echo "   Game ID: $GAME_ID2"
  if [ "$GAME_ID" = "$GAME_ID2" ]; then
    echo "   ✅ PASSOU (mesmo jogo = emparelhados!)"
  else
    echo "   ⚠️  Game IDs diferentes"
  fi
else
  echo "   ❌ FALHOU"
fi
echo ""

# Teste 8: Validação de argumentos
echo "8. Teste de validação (falta nick)..."
RESP=$(curl -s -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d '{"password":"pass1"}')
echo "   Resposta: $RESP"
if [[ "$RESP" == *"error"* ]]; then
  echo "   ✅ PASSOU"
else
  echo "   ❌ FALHOU"
fi
echo ""

# Teste 9: Size inválido
echo "9. Teste size inválido..."
RESP=$(curl -s -X POST "$BASE_URL/ranking" \
  -H "Content-Type: application/json" \
  -d '{"group":99,"size":8}')
echo "   Resposta: $RESP"
if [[ "$RESP" == *"error"* ]]; then
  echo "   ✅ PASSOU"
else
  echo "   ❌ FALHOU"
fi
echo ""

echo "========================================"
echo "  TESTES CONCLUÍDOS"
echo "========================================"
