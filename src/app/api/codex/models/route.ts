import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const CODEX_SERVER_URL = 'http://127.0.0.1:3001';
const TIMEOUT = 10000; // 10 segundos

/**
 * GET /api/codex/models - Lista modelos disponíveis
 */
export async function GET(request: NextRequest) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    const response = await fetch(`${CODEX_SERVER_URL}/v1/models`, {
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
    console.error('Erro ao listar modelos:', error);

    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        {
          error: 'Service Unavailable',
          message: 'Servidor Codex não está disponível',
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
