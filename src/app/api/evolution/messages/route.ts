import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = process.env.EVOLUTION_INSTANCE;

    if (!apiUrl || !apiKey || !instance) {
      return NextResponse.json(
        { error: "Configuração incompleta" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const chatId = String(body.chatId ?? "").trim();

    if (!chatId) {
      return NextResponse.json(
        { error: "Informe o ID da conversa" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${apiUrl.replace("://localhost", "://127.0.0.1").replace(/\/$/, "")}/chat/findMessages/${encodeURIComponent(instance)}`,
      {
        method: "POST",
        headers: {
          apikey: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          where: { key: { remoteJid: chatId } },
          page: 1,
          offset: 50,
        }),
        cache: "no-store",
      }
    );

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível buscar as mensagens" },
      { status: 500 }
    );
  }
}
