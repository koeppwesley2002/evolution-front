# Servidor Codex Local com Next.js

API HTTP local de chatbot usando Codex SDK com autenticação do CLI Codex, sem necessidade de OPENAI_API_KEY.

## 🎯 O que foi implementado

### 1. **Servidor Codex Local** (`codex-server.js`)
- Servidor HTTP em `127.0.0.1:3001` (apenas localhost)
- Autenticação via `codex login` (arquivo `~/.codex/auth.json`)
- Endpoints:
  - `GET /health` - Status do servidor
  - `GET /v1/models` - Lista modelos disponíveis
  - `POST /v1/chat/completions` - Chat completions (compatível com OpenAI)
- Limite de concorrência automático
- Tratamento de timeout (30s)
- Sem exposição pública

### 2. **Endpoints Next.js** (Proxy)
- `GET /api/codex/health` - Status
- `GET /api/codex/models` - Lista modelos
- `POST /api/codex/chat/completions` - Chat

### 3. **Componente Chatbot** (`src/app/components/CodexChatbot.tsx`)
- UI completa com Tailwind CSS
- Auto-detecção de status do Codex
- Seletor de modelos
- Histórico de conversas
- Mensagens com timestamp
- Loading state
- Tratamento de erros

### 4. **Testes Automatizados** (`test-codex.js`)
- Valida todos os endpoints
- Verifica autenticação
- Testa formato de resposta
- Validação de entrada

## ⚙️ Requisitos

1. **Codex CLI** instalado:
   ```bash
   npm install -g @openai/codex-cli
   # ou
   pip install openai-codex
   ```

2. **Autenticação**:
   ```bash
   codex login
   ```

## 🚀 Como Usar

### Opção 1: Executar separadamente

**Terminal 1 - Servidor Codex:**
```bash
cd c:\Users\koepp\Downloads\evolution-front
node codex-server.js
```

Esperado:
```
╔════════════════════════════════════════╗
║  Codex Chatbot API Local               ║
╠════════════════════════════════════════╣
║  Servidor: http://127.0.0.1:3001       ║
║  Endpoints:                            ║
║    GET  /health                        ║
║    GET  /v1/models                     ║
║    POST /v1/chat/completions           ║
╠════════════════════════════════════════╣
║  ✓ Autenticação: Ativa                 ║
╚════════════════════════════════════════╝
```

**Terminal 2 - Next.js Frontend:**
```bash
npm run dev
```

Acesse: http://localhost:3000/codex

### Opção 2: Ambos em paralelo (com concurrently)

```bash
npm install --save-dev concurrently
npm run dev:all
```

## 🧪 Testar os Endpoints

### Health Check
```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:3001/health"
```

### Listar Modelos
```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:3001/v1/models"
```

### Chat Completions
```powershell
$body = @{
    model = "codex"
    messages = @(
        @{ role = "user"; content = "Olá!" }
    )
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://127.0.0.1:3001/v1/chat/completions" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

### Script de Teste Automatizado
```bash
node test-codex.js
```

## 📋 Estrutura da Requisição

```javascript
// POST /api/codex/chat/completions
{
  "model": "codex",                    // Modelo disponível
  "messages": [                        // Array de mensagens
    {
      "role": "user",                 // "user", "assistant", "system", "developer"
      "content": "Sua mensagem aqui"
    }
  ],
  "temperature": 0.7,                 // Opcional (padrão: 0.7)
  "max_tokens": 2000                  // Opcional (padrão: 2000)
}
```

## 📝 Estrutura da Resposta

```javascript
{
  "id": "chatcmpl-1234567890",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "codex",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Resposta do AI aqui"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 50,
    "total_tokens": 75
  }
}
```

## 🔐 Segurança

- ✅ Servidor **apenas em localhost** (127.0.0.1)
- ✅ Autenticação obrigatória via `codex login`
- ✅ Tokens **nunca são expostos** no código
- ✅ Arquivo auth.json **nunca é lido** (apenas verificado)
- ✅ Sem compartilhamento multiusuário
- ✅ CORS restrito ao frontend local

## 📊 Monitoramento

### Verificar Status Codex
```bash
npm run codex:status
```

### Logs do Servidor
```
GET /health → 200 OK
GET /v1/models → 200 OK
POST /v1/chat/completions → 200 OK (resposta processada)
```

## ❌ Solução de Problemas

### "Servidor não disponível"
```bash
# Verifique se está rodando
node codex-server.js

# Ou no Terminal, se já está rodando:
# Pressione Ctrl+C para parar e reiniciar
```

### "Autenticação não encontrada"
```bash
codex login
# Siga as instruções de login no terminal
```

### "Timeout na requisição"
- Aumento da carga do servidor
- Aumentar `concurrencyLimit` em `codex-server.js`
- Reduzir `max_tokens` nas requisições

## 📁 Arquivos Criados

```
evolution-front/
├── codex-server.js              # Servidor HTTP local
├── test-codex.js                # Script de testes
├── src/app/
│   ├── components/
│   │   └── CodexChatbot.tsx      # Componente UI
│   ├── codex/
│   │   └── page.tsx             # Página /codex
│   └── api/codex/
│       ├── chat/completions/
│       │   └── route.ts         # POST /api/codex/chat/completions
│       ├── models/
│       │   └── route.ts         # GET /api/codex/models
│       └── health/
│           └── route.ts         # GET /api/codex/health
└── README-CODEX.md              # Este arquivo
```

## 🎓 Exemplo de Uso no Frontend

```typescript
const response = await fetch('/api/codex/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'codex',
    messages: [
      { role: 'user', content: 'Como fazer um componente React?' }
    ]
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

## 🔄 Próximas Melhorias Possíveis

- [ ] Integração com streaming (`/v1/chat/completions?stream=true`)
- [ ] Suporte a funções (function_calling)
- [ ] Histórico de conversas persistente
- [ ] Rate limiting por IP
- [ ] Webhook para notificações
- [ ] Suporte a embeddings

## 📞 Suporte

Se tiver problemas:
1. Verifique se `codex login` foi executado
2. Confirme que o servidor está rodando (`node codex-server.js`)
3. Rode os testes: `node test-codex.js`
4. Verifique os logs do terminal

---

**Status:** ✅ Implementação completa, testada e funcionando
