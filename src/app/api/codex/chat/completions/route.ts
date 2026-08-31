import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const CODEX_SERVER_URL = 'http://127.0.0.1:3001';
const TIMEOUT = 30000; // 30 segundos

/**
 * Proxy para o servidor Codex local
 * POST /api/codex/chat/completions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validação básica
    if (!body.model || !body.messages) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Parâmetros obrigatórios: model, messages',
          status: 400
        },
        { status: 400 }
      );
    }

    // Fazer requisição ao servidor Codex
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    const response = await fetch(`${CODEX_SERVER_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Erro ao conectar com Codex:', error);

    // Detectar erro de conexão
    if (error.name === 'AbortError') {
      return NextResponse.json(
        {
          error: 'Gateway Timeout',
          message: 'Timeout ao conectar com o servidor Codex',
          status: 504
        },
        { status: 504 }
      );
    }

    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        {
          error: 'Service Unavailable',
          message: 'Servidor Codex não está disponível. Execute: node codex-server.js',
          status: 503
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error.message,
        status: 500
      },
      { status: 500 }
    );
  }
}
