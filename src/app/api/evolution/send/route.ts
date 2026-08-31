import { NextResponse } from "next/server";

export async function POST(request: Request) {
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

    const body = await request.json();

    const number = String(body.number ?? "").replace(/\D/g, "");
    const text = String(body.text ?? "").trim();

    if (!number) {
      return NextResponse.json(
        { error: "Informe o número do WhatsApp." },
        { status: 400 }
      );
    }

    if (!text) {
      return NextResponse.json(
        { error: "Informe a mensagem." },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${apiUrl.replace("://localhost", "://127.0.0.1").replace(/\/$/, "")}/message/sendText/${instance}`,
      {
        method: "POST",
        headers: {
          apikey: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number,
          text,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "A Evolution API recusou o envio.",
          details: data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Mensagem enviada.",
      data,
    });
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);

    return NextResponse.json(
      { error: "Erro interno ao enviar mensagem." },
      { status: 500 }
    );
  }
}
