import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = process.env.EVOLUTION_INSTANCE;

    if (!apiUrl || !apiKey || !instance) {
      return NextResponse.json(
        { error: "Configuração da Evolution API incompleta." },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${apiUrl.replace("://localhost", "://127.0.0.1").replace(/\/$/, "")}/chat/findChats/${encodeURIComponent(instance)}`,
      {
        method: "POST",
        headers: {
          apikey: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
        cache: "no-store",
      }
    );

    const data = await response.json();

    const chats = (Array.isArray(data) ? data : [])
      .filter((chat) => String(chat?.remoteJid ?? "").endsWith("@s.whatsapp.net"))
      .sort(
        (a, b) =>
          new Date(b?.updatedAt ?? 0).getTime() -
          new Date(a?.updatedAt ?? 0).getTime()
      )
      .slice(0, 200);

    return NextResponse.json(chats, {
      status: response.status,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Não foi possível buscar as conversas", details: String(error) },
      { status: 500 }
    );
  }
}
