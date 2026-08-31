import { NextResponse } from "next/server";

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
      `${apiUrl.replace("://localhost", "://127.0.0.1").replace(/\/$/, "")}/instance/connectionState/${encodeURIComponent(instance)}`,
      {
        headers: {
          apikey: apiKey,
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível acessar a Evolution API." },
      { status: 500 }
    );
  }
}
