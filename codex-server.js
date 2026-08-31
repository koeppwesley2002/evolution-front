#!/usr/bin/env node

/**
 * Servidor HTTP local de Chatbot usando Codex SDK
 * Autenticação via codex login (arquivo auth.json)
 * Sem necessidade de OPENAI_API_KEY
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const PORT = 3001;
const HOST = '127.0.0.1';

// Paths para auth do Codex CLI
const CODEX_CONFIG_DIR = path.join(os.homedir(), '.codex');
const AUTH_FILE = path.join(CODEX_CONFIG_DIR, 'auth.json');
const CODEX_NATIVE_COMMAND = path.join(
  process.env.APPDATA || '',
  'npm',
  'node_modules',
  '@openai',
  'codex',
  'node_modules',
  '@openai',
  'codex-win32-x64',
  'vendor',
  'x86_64-pc-windows-msvc',
  'bin',
  'codex.exe'
);

// Cache para fila de requisições
let concurrencyLimit = 5;
let activeRequests = 0;
const requestQueue = [];

const WHATSAPP_BOT_PROMPT = `Você é um atendente virtual de WhatsApp. Responda sempre em português do Brasil, de forma natural, educada e objetiva. Não diga que é Codex, não mencione ferramentas internas e não invente informações. Cumprimente apenas quando fizer sentido, responda diretamente ao pedido e faça uma pergunta curta quando faltar contexto. Use texto simples, sem markdown excessivo.`;

/**
 * Valida se o usuário está autenticado
 */
function validateAuthentication() {
  try {
    if (!fs.existsSync(AUTH_FILE)) {
      return {
        authenticated: false,
        error: 'Autenticação não encontrada. Execute: codex login'
      };
    }
    const authData = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    const accessToken = authData.access_token || authData.tokens?.access_token;
    if (!accessToken) {
      return {
        authenticated: false,
        error: 'Token inválido. Execute: codex login'
      };
    }
    return { authenticated: true, token: accessToken };
  } catch (error) {
    return {
      authenticated: false,
      error: `Erro ao verificar autenticação: ${error.message}`
    };
  }
}

/**
 * Processa requisição para chat
 */
async function handleChatRequest(req, res, body) {
  try {
    const auth = validateAuthentication();
    if (!auth.authenticated) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Unauthorized',
        message: auth.error,
        status: 401
      }));
      return;
    }

    const { model, messages, temperature = 0.7, max_tokens = 2000 } = JSON.parse(body);

    // Validação
    if (!model || !messages || !Array.isArray(messages)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Bad Request',
        message: 'Parâmetros obrigatórios: model, messages (array)',
        status: 400
      }));
      return;
    }

    if (messages.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Bad Request',
        message: 'Array messages não pode estar vazio',
        status: 400
      }));
      return;
    }

    const systemInstructions = messages
      .filter(m => m.role === 'system')
      .map(message => message.content)
      .join('\n');
    const userMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant');
    const conversation = userMessages
      .map(message => `${message.role === 'assistant' ? 'Atendente' : 'Cliente'}: ${message.content}`)
      .join('\n');
    const prompt = `${WHATSAPP_BOT_PROMPT}\n${systemInstructions}\n\nConversa:\n${conversation}\n\nResponda somente com a próxima mensagem do atendente.`;
    const outputFile = path.join(os.tmpdir(), `codex-reply-${Date.now()}-${process.pid}.txt`);
    const codexCommand = process.platform === 'win32' && fs.existsSync(CODEX_NATIVE_COMMAND)
      ? CODEX_NATIVE_COMMAND
      : 'codex';

    let responseText;
    try {
      responseText = await runCodexPrompt(codexCommand, prompt, outputFile);
    } finally {
      if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
    }

    if (!responseText) throw new Error('O Codex não retornou uma resposta.');

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: responseText
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: Math.ceil(conversation.length / 4),
        completion_tokens: Math.ceil(responseText.length / 4),
        total_tokens: Math.ceil((conversation.length + responseText.length) / 4)
      }
    }));

  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Internal Server Error',
      message: error.message,
      status: 500
    }));
  }
}

function runCodexPrompt(command, prompt, outputFile) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [
      'exec',
      '--ephemeral',
      '--skip-git-repo-check',
      '--sandbox',
      'read-only',
      '--color',
      'never',
      '--output-last-message',
      outputFile,
      '-',
    ], { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', code => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Codex encerrou com código ${code}`));
        return;
      }
      resolve(fs.existsSync(outputFile) ? fs.readFileSync(outputFile, 'utf8').trim() : '');
    });
    child.stdin.end(prompt, 'utf8');
  });
}

/**
 * Retorna modelos disponíveis
 */
function handleModelsRequest(res) {
  const auth = validateAuthentication();
  if (!auth.authenticated) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Unauthorized',
      message: auth.error
    }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    object: 'list',
    data: [
      {
        id: 'codex',
        object: 'model',
        owned_by: 'openai-codex',
        permission: [
          {
            id: 'modelperm-1',
            object: 'model_permission',
            created: 1234567890,
            allow_create_engine: false,
            allow_sampling: true,
            allow_logprobs: false,
            allow_search_indices: false,
            allow_view: true,
            allow_fine_tuning: false,
            organization: '*',
            group_id: null,
            is_blocking: false
          }
        ]
      },
      {
        id: 'gpt-3.5-turbo',
        object: 'model',
        owned_by: 'openai-dev',
        permission: []
      },
      {
        id: 'gpt-4',
        object: 'model',
        owned_by: 'openai-dev',
        permission: []
      }
    ]
  }));
}

/**
 * Health check
 */
function handleHealthRequest(res) {
  const auth = validateAuthentication();
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'healthy',
    authenticated: auth.authenticated,
    timestamp: new Date().toISOString(),
    port: PORT,
    host: HOST,
    uptime: process.uptime()
  }));
}

/**
 * Gerenciar fila de requisições com limite de concorrência
 */
function enqueueRequest(handler) {
  return new Promise((resolve, reject) => {
    const task = async () => {
      try {
        activeRequests++;
        const result = await handler();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        activeRequests--;
        processQueue();
      }
    };

    if (activeRequests < concurrencyLimit) {
      task();
    } else {
      requestQueue.push(task);
    }
  });
}

function processQueue() {
  if (requestQueue.length > 0 && activeRequests < concurrencyLimit) {
    const task = requestQueue.shift();
    task();
  }
}

/**
 * Servidor HTTP
 */
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Health endpoint
  if (req.method === 'GET' && pathname === '/health') {
    handleHealthRequest(res);
    return;
  }

  // Models endpoint
  if (req.method === 'GET' && pathname === '/v1/models') {
    handleModelsRequest(res);
    return;
  }

  // Chat completions endpoint
  if (req.method === 'POST' && pathname === '/v1/chat/completions') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      enqueueRequest(() => handleChatRequest(req, res, body));
    });
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    error: 'Not Found',
    message: `Rota ${pathname} não encontrada`,
    available: ['/health', '/v1/models', '/v1/chat/completions']
  }));
});

// Iniciar servidor
server.listen(PORT, HOST, () => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Codex Chatbot API Local');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  Servidor: http://${HOST}:${PORT}`);
  console.log('║  Endpoints:');
  console.log('║    GET  /health');
  console.log('║    GET  /v1/models');
  console.log('║    POST /v1/chat/completions');
  console.log('╠════════════════════════════════════════╣');

  const auth = validateAuthentication();
  if (auth.authenticated) {
    console.log('║  ✓ Autenticação: Ativa');
  } else {
    console.log('║  ✗ Autenticação: Inativa');
    console.log(`║    Executar: codex login`);
  }

  console.log('╚════════════════════════════════════════╝');
  console.log('');
  console.log(`Pressione Ctrl+C para parar\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nEncerrando servidor...');
  server.close(() => {
    console.log('Servidor encerrado');
    process.exit(0);
  });
});

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
