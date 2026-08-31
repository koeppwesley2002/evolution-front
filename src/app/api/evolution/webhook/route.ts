import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODEX_SERVER_URL = "http://127.0.0.1:3001";
const processedMessageIds = new Set<string>();
const welcomedNumbers = new Set<string>();
const DEFAULT_WELCOME_MESSAGE =
  "Olá! Recebi sua mensagem e estou aqui para ajudar. Como posso ajudar você? Pode me contar o que precisa.";

type WebhookData = {
  key?: {
    id?: string;
    remoteJid?: string;
    fromMe?: boolean;
  };
  message?: {
    conversation?: string;
    extendedTextMessage?: { text?: string };
    imageMessage?: { caption?: string };
    videoMessage?: { caption?: string };
  };
};

function getMessageText(data: WebhookData): string {
  const message = data.message ?? {};
  return String(
    message.conversation ??
      message.extendedTextMessage?.text ??
      message.imageMessage?.caption ??
      message.videoMessage?.caption ??
      ""
  ).trim();
}

function getWebhookData(payload: unknown): WebhookData | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const data = record.data;
  if (data && typeof data === "object" && "key" in data) {
    return data as WebhookData;
  }
  if ("key" in record) return record as WebhookData;
  return null;
}

async function generateReply(text: string, isFirstMessage: boolean) {
  const welcomeInstruction = isFirstMessage
    ? `Esta é a primeira mensagem deste cliente. Comece exatamente com: "${process.env.WHATSAPP_WELCOME_MESSAGE || DEFAULT_WELCOME_MESSAGE}" Depois, continue respondendo ao pedido do cliente de forma objetiva.`
    : "Não repita uma saudação padrão; continue a conversa considerando o pedido atual do cliente.";
  const response = await fetch(`${CODEX_SERVER_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "codex",
      messages: [
        {
          role: "system",
          content:
            `Você é um atendente de WhatsApp. Responda em português do Brasil, com clareza, naturalidade e objetividade. Não mencione ferramentas internas, não invente informações e não use markdown excessivo. ${welcomeInstruction}`,
        },
        { role: "user", content: text },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "O Codex não conseguiu gerar uma resposta.");
  }

  const reply = String(data.choices?.[0]?.message?.content ?? "").trim();
  if (!reply) throw new Error("O Codex retornou uma resposta vazia.");
  return reply;
}

async function sendReply(number: string, text: string) {
  const apiUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;

  if (!apiUrl || !apiKey || !instance) {
    throw new Error("Configuração da Evolution API incompleta.");
  }

  const response = await fetch(`${apiUrl.replace("://localhost", "://127.0.0.1").replace(/\/$/, "")}/message/sendText/${encodeURIComponent(instance)}`, {
    method: "POST",
    headers: {
      apikey: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ number, text }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || "A Evolution API recusou a resposta.");
  }

  return data;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const data = getWebhookData(payload);
    if (!data) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const key = data.key;
    const messageId = String(key?.id ?? "");
    const remoteJid = String(key?.remoteJid ?? "");
    const text = getMessageText(data);

    if (!key || key.fromMe || remoteJid.endsWith("@g.us") || !text) {
      return NextResponse.json({ received: true, ignored: true });
    }

    if (messageId && processedMessageIds.has(messageId)) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    if (messageId) {
      processedMessageIds.add(messageId);
      if (processedMessageIds.size > 1000) {
        processedMessageIds.delete(processedMessageIds.values().next().value as string);
      }
    }

    const number = remoteJid.split("@")[0].replace(/\D/g, "");
    if (!number) return NextResponse.json({ received: true, ignored: true });

    const isFirstMessage = !welcomedNumbers.has(number);
    const reply = await generateReply(text, isFirstMessage);
    const result = await sendReply(number, reply);
    welcomedNumbers.add(number);

    return NextResponse.json({ received: true, replied: true, number, result });
  } catch (error) {
    console.error("Erro no webhook do WhatsApp:", error);
    return NextResponse.json(
      { received: true, replied: false, error: "Não foi possível responder à mensagem." },
      { status: 500 }
    );
  }
}
