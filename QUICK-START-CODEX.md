# 🚀 Guia Rápido - Codex Chatbot Local

## O que é?

Uma API HTTP local que permite usar **Codex/ChatGPT** sem pagar pela OpenAI API Platform.

- ✅ **Grátis** - Usa limites inclusos da sua assinatura ChatGPT/Codex
- ✅ **Seguro** - Apenas localhost (127.0.0.1), não expõe na internet
- ✅ **Integrado** - Funciona direto na aplicação Next.js

## 1️⃣ Instalar Codex CLI

Escolha uma opção:

### NPM (JavaScript)
```bash
npm install -g @openai/codex-cli
```

### Pip (Python)
```bash
pip install openai-codex
```

## 2️⃣ Fazer Login

```bash
codex login
```

Siga as instruções. Seu token é salvo em `~/.codex/auth.json` automaticamente.

## 3️⃣ Iniciar o Servidor Codex

**Windows:**
```bash
start-codex.bat
```

**Mac/Linux:**
```bash
./start-codex.sh
```

**Ou direto:**
```bash
node codex-server.js
```

Você deve ver:
```
╔════════════════════════════════════════╗
║  Codex Chatbot API Local               ║
╠════════════════════════════════════════╣
║  Servidor: http://127.0.0.1:3001       ║
║  ✓ Autenticação: Ativa                 ║
╚════════════════════════════════════════╝
```

## 4️⃣ Iniciar Next.js (em outro terminal)

```bash
npm run dev
```

## 5️⃣ Acessar o Chatbot

Abra no navegador:
```
http://localhost:3000/codex
```

## 🧪 Testar Manualmente

### Health Check
```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:3001/health" | Select-Object -Expand Content
```

**Resposta esperada:**
```json
{
  "status": "healthy",
  "authenticated": true,
  "timestamp": "2026-08-14T23:30:00.000Z",
  "port": 3001,
  "host": "127.0.0.1",
  "uptime": 45.123
}
```

### Listar Modelos
```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:3001/v1/models" | Select-Object -Expand Content
```

### Enviar Mensagem
```powershell
$body = @{
    model = "codex"
    messages = @(@{ role = "user"; content = "Olá!" })
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://127.0.0.1:3001/v1/chat/completions" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body | Select-Object -Expand Content
```

## 📋 Scripts Disponíveis

```bash
npm run dev           # Iniciar Next.js
npm run codex         # Iniciar servidor Codex
npm run test:codex    # Testar todos os endpoints
npm run codex:status  # Verificar status da autenticação
```

## ❌ Soluções Rápidas

### "Servidor não está respondendo"
```bash
# Verifique se o servidor está rodando
# Pressione Ctrl+C e inicie novamente
node codex-server.js
```

### "Autenticação inválida"
```bash
# Faça login novamente
codex login
```

### "Codex não encontrado"
```bash
# Instale o CLI
npm install -g @openai/codex-cli
# ou
pip install openai-codex
```

## 📄 Documentação Completa

Veja `README-CODEX.md` para detalhes técnicos.

## 🎯 Próximas Ideias

- Integrar com WhatsApp Menu (combinar Codex + Evolution API)
- Adicionar histórico persistente de conversas
- Treinar com dados customizados
- Exportar conversas em PDF

---

**Tudo pronto?** Vá para http://localhost:3000/codex 🎉
