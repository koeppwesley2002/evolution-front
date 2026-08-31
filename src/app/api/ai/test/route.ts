import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function GET() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY não configurada." },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.responses.create({
      model: "gpt-5.6",
      input: "Responda apenas: IA conectada com sucesso!",
    });

    return NextResponse.json({
      success: true,
      resposta: response.output_text,
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao conectar com a OpenAI.",
      },
      { status: 500 }
    );
  }
}