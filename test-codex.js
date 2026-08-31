#!/usr/bin/env node

/**
 * Script de teste para a API Codex local
 * Valida todos os endpoints
 */

const http = require('http');

const HOST = '127.0.0.1';
const PORT = 3001;
const BASE_URL = `http://${HOST}:${PORT}`;

// Cores para console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

/**
 * Fazer requisição HTTP
 */
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data ? JSON.parse(data) : null,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Testes
 */
async function runTests() {
  console.log(`\n${colors.blue}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║  Testes da API Codex Local${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════╝${colors.reset}\n`);

  let passed = 0;
  let failed = 0;

  // Teste 1: Health check
  console.log(`${colors.yellow}[1/4]${colors.reset} Testando GET /health...`);
  try {
    const response = await makeRequest('GET', '/health');
    if (response.statusCode === 200) {
      console.log(`  ${colors.green}✓${colors.reset} Health check: OK`);
      console.log(`    Status: ${response.body.status}`);
      console.log(`    Autenticado: ${response.body.authenticated ? 'Sim' : 'Não'}`);
      passed++;
    } else {
      console.log(`  ${colors.red}✗${colors.reset} Status ${response.statusCode}`);
      failed++;
    }
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} Erro: ${error.message}`);
    console.log(`    Verifique se o servidor está rodando: node codex-server.js`);
    failed++;
  }

  // Teste 2: Listar modelos
  console.log(`\n${colors.yellow}[2/4]${colors.reset} Testando GET /v1/models...`);
  try {
    const response = await makeRequest('GET', '/v1/models');
    if (response.statusCode === 200 || response.statusCode === 401) {
      const isAuth = response.statusCode === 200;
      console.log(`  ${isAuth ? colors.green + '✓' : colors.red + '✗'}${colors.reset} Resposta recebida`);
      
      if (isAuth && response.body.data) {
        console.log(`    Modelos disponíveis: ${response.body.data.length}`);
        response.body.data.forEach((m: any) => {
          console.log(`      - ${m.id}`);
        });
        passed++;
      } else if (response.statusCode === 401) {
        console.log(`    Requer autenticação. Execute: ${colors.yellow}codex login${colors.reset}`);
        passed++;
      } else {
        failed++;
      }
    } else {
      console.log(`  ${colors.red}✗${colors.reset} Status ${response.statusCode}`);
      failed++;
    }
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} Erro: ${error.message}`);
    failed++;
  }

  // Teste 3: Chat completions (sem autenticação, pode falhar)
  console.log(`\n${colors.yellow}[3/4]${colors.reset} Testando POST /v1/chat/completions...`);
  try {
    const response = await makeRequest('POST', '/v1/chat/completions', {
      model: 'codex',
      messages: [
        { role: 'user', content: 'Olá, como você funciona?' }
      ],
      temperature: 0.7,
    });

    if (response.statusCode === 200) {
      console.log(`  ${colors.green}✓${colors.reset} Chat completions: OK`);
      if (response.body.choices && response.body.choices[0]) {
        console.log(`    Resposta: ${response.body.choices[0].message.content.substring(0, 50)}...`);
      }
      passed++;
    } else if (response.statusCode === 401) {
      console.log(`  ${colors.yellow}⚠${colors.reset} Autenticação requerida`);
      console.log(`    Execute: ${colors.yellow}codex login${colors.reset}`);
      passed++;
    } else {
      console.log(`  ${colors.red}✗${colors.reset} Status ${response.statusCode}: ${response.body.message}`);
      failed++;
    }
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} Erro: ${error.message}`);
    failed++;
  }

  // Teste 4: Validação de entrada
  console.log(`\n${colors.yellow}[4/4]${colors.reset} Testando validação de entrada...`);
  try {
    const response = await makeRequest('POST', '/v1/chat/completions', {
      messages: []
    });

    if (response.statusCode === 400) {
      console.log(`  ${colors.green}✓${colors.reset} Validação funcionando`);
      console.log(`    Erro detectado: ${response.body.message}`);
      passed++;
    } else {
      console.log(`  ${colors.red}✗${colors.reset} Validação não funcionou`);
      failed++;
    }
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} Erro: ${error.message}`);
    failed++;
  }

  // Resumo
  console.log(`\n${colors.blue}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║  Resumo dos Testes${colors.reset}`);
  console.log(`${colors.blue}╠════════════════════════════════════════╣${colors.reset}`);
  console.log(`${colors.blue}║${colors.reset}  Passou: ${colors.green}${passed}${colors.reset}`);
  console.log(`${colors.blue}║${colors.reset}  Falhou: ${colors.red}${failed}${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════╝${colors.reset}\n`);

  if (failed === 0) {
    console.log(`${colors.green}Todos os testes passaram!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}Alguns testes falharam.${colors.reset}\n`);
    process.exit(1);
  }
}

// Executar testes
runTests().catch(err => {
  console.error(`${colors.red}Erro fatal:${colors.reset}`, err);
  process.exit(1);
});
