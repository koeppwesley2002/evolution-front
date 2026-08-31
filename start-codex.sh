#!/bin/bash

# Script para iniciar Codex Server

echo ""
echo "╔════════════════════════════════════════╗"
echo "║   Codex Chatbot API Local - Server     ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Verificar Codex CLI
if ! command -v codex &> /dev/null; then
    echo "✗ Codex CLI não encontrado"
    echo ""
    echo "Para instalar:"
    echo "  npm install -g @openai/codex-cli"
    echo ""
    echo "ou Python:"
    echo "  pip install openai-codex"
    echo ""
    exit 1
fi

echo "✓ Codex CLI encontrado"
echo ""
echo "Iniciando servidor..."
echo ""

cd "$(dirname "$0")"
node codex-server.js
