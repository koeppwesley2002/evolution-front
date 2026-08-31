import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const CODEX_SERVER_URL = 'http://127.0.0.1:3001';
const TIMEOUT = 10000;

/**
 * GET /api/codex/health - Status do servidor Codex
 */
export async function GET(request: NextRequest) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    const response = await fetch(`${CODEX_SERVER_URL}/health`, {
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
    console.error('Erro ao verificar health:', error);

    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        {
          status: 'unavailable',
          message: 'Servidor Codex não está disponível',
          authenticated: false,
          error: 'ECONNREFUSED'
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        status: 'error',
        message: error.message,
        authenticated: false
      },
      { status: 500 }
    );
  }
}
