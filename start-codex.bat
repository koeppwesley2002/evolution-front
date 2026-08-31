@echo off
setlocal
title WhatsApp Bot - Codex + Evolution

cd /d "%~dp0"

echo Verificando autenticacao do Codex...
if exist "%APPDATA%\npm\codex.cmd" (
    call "%APPDATA%\npm\codex.cmd" login status
) else (
    echo Codex CLI nao encontrado em %%APPDATA%%\npm.
    echo Execute: npm install -g @openai/codex@latest
    pause
    exit /b 1
)

echo Iniciando servidor Codex em http://127.0.0.1:3001...
start "Codex Server" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%~dp0'; node .\codex-server.js"

echo Iniciando painel Next.js em http://localhost:3000...
start "WhatsApp Panel" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%~dp0'; npm run dev"

timeout /t 4 /nobreak >nul
start "" http://localhost:3000/

echo.
echo Bot iniciado. O webhook da Evolution ja esta configurado.
echo Deixe as duas janelas abertas para o bot responder.
endlocal
