@echo off
REM ============================================
REM   Script para testar o jogo TAB no Windows
REM ============================================

echo.
echo ========================================
echo   TAB - Jogo de Tabuleiro Egipcio
echo ========================================
echo.

REM Verificar se Node.js esta instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Instala em: https://nodejs.org/
    pause
    exit /b 1
)

REM Verificar se Python esta instalado
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Python nao encontrado!
    echo Instala em: https://python.org/
    pause
    exit /b 1
)

echo [OK] Node.js encontrado
echo [OK] Python encontrado
echo.

REM Iniciar servidor Node.js em background
echo Iniciando servidor backend (porta 8008)...
start "TAB Backend" cmd /c "node index.js"

REM Aguardar servidor iniciar
timeout /t 2 /nobreak >nul

REM Iniciar servidor Python para frontend
echo Iniciando servidor frontend (porta 8080)...
echo.
echo ========================================
echo   Abre no navegador:
echo   http://localhost:8080
echo ========================================
echo.
echo Pressiona Ctrl+C para parar os servidores
echo.

python -m http.server 8080
