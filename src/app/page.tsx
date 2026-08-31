"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";

type IconName = "chat" | "contacts" | "team" | "settings" | "whatsapp" | "search" | "bell" | "plus" | "send" | "sparkles";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    chat: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />,
    contacts: <><circle cx="9" cy="8" r="4" /><path d="M3 21v-2a6 6 0 0 1 6-6h1M16 3.5a4 4 0 0 1 0 7.5M15 14a6 6 0 0 1 6 6v1" /></>,
    team: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l-2.8 2.8A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1.4 1.5V21H9.5v-.1A1.7 1.7 0 0 0 8 19.4a1.7 1.7 0 0 0-1.9.3l-2.8-2.8A1.7 1.7 0 0 0 3.6 15 1.7 1.7 0 0 0 2 13.5v-3A1.7 1.7 0 0 0 3.6 9a1.7 1.7 0 0 0-.3-1.9l2.8-2.8A1.7 1.7 0 0 0 8 4.6 1.7 1.7 0 0 0 9.5 3h4A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.9-.3l2.8 2.8A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.6 1.5v3a1.7 1.7 0 0 0-1.6 1.5z" /></>,
    whatsapp: <><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.7-.9L3 21l1.8-5.1A8.5 8.5 0 1 1 21 11.5z" /><path d="M9 8.5c.5 3 2 4.5 5 5l1-1" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></>,
    sparkles: <><path d="m12 3-1.3 3.7L7 8l3.7 1.3L12 13l1.3-3.7L17 8l-3.7-1.3z" /><path d="m5 14-.8 2.2L2 17l2.2.8L5 20l.8-2.2L8 17l-2.2-.8z" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

type EvolutionMessage = {
  id: string;
  key?: { id?: string; fromMe?: boolean; remoteJid?: string };
  pushName?: string;
  messageType?: string;
  message?: Record<string, unknown>;
  messageTimestamp?: number | string;
};

type EvolutionChat = {
  id: string;
  remoteJid: string;
  pushName?: string;
  profilePicUrl?: string;
  updatedAt?: string;
  unreadCount?: number;
  lastMessage?: EvolutionMessage;
};

function messageText(message?: EvolutionMessage) {
  const content = message?.message ?? {};
  const extended = content.extendedTextMessage as { text?: string } | undefined;
  const image = content.imageMessage as { caption?: string } | undefined;
  const video = content.videoMessage as { caption?: string } | undefined;
  return String(content.conversation ?? extended?.text ?? image?.caption ?? video?.caption ?? (message?.messageType ? `[${message.messageType}]` : "Mensagem"));
}

function chatName(chat: EvolutionChat) {
  return chat.pushName?.trim() || chat.remoteJid.split("@")[0];
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function formatTime(value?: number | string) {
  if (!value) return "";
  const numeric = Number(value);
  const date = Number.isFinite(numeric) ? new Date(numeric < 1e12 ? numeric * 1000 : numeric) : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export default function Home() {
  const [status, setStatus] = useState("verificando");
  const [number, setNumber] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [conversations, setConversations] = useState<EvolutionChat[]>([]);
  const [messages, setMessages] = useState<EvolutionMessage[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loadingChats, setLoadingChats] = useState(true);
  const [chatError, setChatError] = useState("");

  async function carregarStatus() {
    try {
      const response = await fetch("/api/evolution/status");
      const data = await response.json();
      setStatus(data?.instance?.state || data?.state || "desconectado");
    } catch { setStatus("erro"); }
  }
  async function carregarConversas(silent = false) {
    if (!silent) setLoadingChats(true);
    try {
      const response = await fetch("/api/evolution/chats", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Erro ao buscar conversas.");
      const realChats = (Array.isArray(data) ? data : [])
        .filter((chat: EvolutionChat) => chat.remoteJid?.endsWith("@s.whatsapp.net"))
        .sort((a: EvolutionChat, b: EvolutionChat) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      setConversations(realChats);
      setChatError("");
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Não foi possível carregar as conversas.");
    } finally { setLoadingChats(false); }
  }

  async function carregarMensagens(chatId: string) {
    try {
      const response = await fetch("/api/evolution/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chatId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Erro ao buscar mensagens.");
      const records = Array.isArray(data?.messages?.records) ? data.messages.records : [];
      setMessages(records.sort((a: EvolutionMessage, b: EvolutionMessage) => Number(a.messageTimestamp || 0) - Number(b.messageTimestamp || 0)));
    } catch { setMessages([]); }
  }

  useEffect(() => {
    carregarStatus();
    carregarConversas();
    const timer = window.setInterval(() => { carregarStatus(); carregarConversas(true); }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!activeChat) { setMessages([]); return; }
    carregarMensagens(activeChat);
    const timer = window.setInterval(() => carregarMensagens(activeChat), 10000);
    return () => window.clearInterval(timer);
  }, [activeChat]);

  async function enviarMensagem(event: FormEvent) {
    event.preventDefault(); setSending(true); setFeedback("");
    try {
      const response = await fetch("/api/evolution/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ number, text }) });
      const data = await response.json();
      if (!response.ok) { setFeedback(data?.error || "Erro ao enviar mensagem."); return; }
      setFeedback("Mensagem enviada com sucesso!"); setText("");
      if (activeChat) await carregarMensagens(activeChat);
      await carregarConversas(true);
    } catch { setFeedback("Não foi possível enviar a mensagem."); }
    finally { setSending(false); }
  }

  const conectado = status === "open";
  const selected = conversations.find((chat) => chat.remoteJid === activeChat) ?? null;
  const filteredConversations = conversations.filter((chat) => chatName(chat).toLowerCase().includes(search.toLowerCase()));
  const unreadTotal = conversations.reduce((total, chat) => total + Number(chat.unreadCount || 0), 0);

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" aria-hidden>
          <svg viewBox="0 0 32 32" role="img">
            <path className="brand-mark-frame" d="M7.5 3.5h17a4 4 0 0 1 4 4v12.8a4 4 0 0 1-4 4H16l-6.4 4v-4H7.5a4 4 0 0 1-4-4V7.5a4 4 0 0 1 4-4Z" />
            <path className="brand-mark-wave" d="M8.5 17.7c2.1 1.8 4.3 2.7 6.6 2.7 3.9 0 5.9-2.7 8.4-7.8" />
            <circle className="brand-mark-dot" cx="9" cy="11" r="2" />
            <circle className="brand-mark-dot" cx="15.8" cy="11" r="2" />
          </svg>
        </span>
        <strong>supwk</strong><b>.</b>
      </div>
      <button className="new-chat" onClick={() => { setActiveChat(null); setNumber(""); }}><Icon name="plus" /> Nova conversa <kbd>N</kbd></button>
      <p className="nav-label">WORKSPACE</p>
      <nav><button className="nav-item active"><Icon name="chat" /> Conversas <span>{conversations.length}</span></button><button className="nav-item"><Icon name="contacts" /> Contatos</button></nav>
      <p className="nav-label config">CONFIGURAÇÕES</p>
      <nav><button className="nav-item"><Icon name="team" /> Equipe</button><button className="nav-item"><Icon name="settings" /> Preferências</button><button className="nav-item" onClick={carregarStatus}><Icon name="whatsapp" /> Conectar WhatsApp</button></nav>
      <div className="profile"><div className="avatar">WK</div><div><strong>Wesley Koepp</strong><small>Administrador</small></div><span>•••</span></div>
    </aside>

    <section className="workspace">
      <header className="topbar"><div className="breadcrumbs"><span>Conversas</span><b>/</b><strong>Suporte geral</strong></div><div className="top-actions"><span className={`connection ${conectado ? "online" : "offline"}`}><i /> WhatsApp {conectado ? "conectado" : "desconectado"}</span><button className="search-button"><Icon name="search" /> Buscar <kbd>⌘ K</kbd></button><button className="icon-button"><Icon name="bell" /><i className="notification-dot" /></button></div></header>
      <div className="content-grid">
        <aside className="inbox">
          <div className="inbox-heading"><div><h2>Conversas</h2><p>Atendimento em tempo real</p></div><button><Icon name="plus" /></button></div>
          <label className="chat-search"><Icon name="search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar conversas..." /></label>
          <div className="filter-row"><button className="selected">Todas <span>{conversations.length}</span></button><button>Não lidas <span>{unreadTotal}</span></button></div>
          <div className="conversation-list">
            {loadingChats && <p className="chat-state">Carregando conversas...</p>}
            {!loadingChats && chatError && <p className="chat-state error">{chatError}</p>}
            {!loadingChats && !chatError && filteredConversations.length === 0 && <p className="chat-state">Nenhuma conversa encontrada.</p>}
            {filteredConversations.slice(0, 100).map((chat) => {
              const name = chatName(chat);
              const preview = messageText(chat.lastMessage);
              return <button key={chat.id || chat.remoteJid} className={`conversation ${activeChat === chat.remoteJid ? "selected" : ""}`} onClick={() => { setActiveChat(chat.remoteJid); setNumber(chat.remoteJid.split("@")[0]); }}>
                {chat.profilePicUrl ? <img className="contact-avatar" src={chat.profilePicUrl} alt="" /> : <span className="contact-avatar">{initials(name)}</span>}
                <span className="conversation-copy"><strong>{name}</strong><small>{preview}</small></span>
                <span className="conversation-meta"><time>{formatTime(chat.lastMessage?.messageTimestamp || chat.updatedAt)}</time>{Number(chat.unreadCount) > 0 && <b>{chat.unreadCount}</b>}</span>
              </button>;
            })}
          </div>
        </aside>
        <section className="conversation-panel">
          <div className="panel-head"><div><span className="assistant-status"><i /> ASSISTENTE ONLINE</span><h1>{selected ? chatName(selected) : "Suporte geral"}</h1><p>{selected ? "Conversa em atendimento pelo WhatsApp." : "Respostas rápidas e humanas para seus clientes."}</p></div><button className="share">↗&nbsp; Compartilhar</button><button className="more">•••</button></div>
          <div className="conversation-body">{selected ? <div className="message-list">{messages.map((message) => <div key={message.id || message.key?.id} className={`message-bubble ${message.key?.fromMe ? "mine" : "theirs"}`}><p>{messageText(message)}</p><time>{formatTime(message.messageTimestamp)}</time></div>)}{messages.length === 0 && <p className="chat-state">Nenhuma mensagem encontrada nesta conversa.</p>}</div> : <div className="empty-state"><div className="pulse"><Icon name="chat" size={24} /></div><h3>Nenhuma conversa selecionada</h3><p>Selecione uma conversa real do WhatsApp<br />para visualizar as mensagens.</p></div>}</div>
          <form className="composer" onSubmit={enviarMensagem}><div className="composer-top"><span><Icon name="sparkles" /> Resposta assistida</span>{feedback && <small>{feedback}</small>}</div><input className="number-input" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Número com DDI: 5551999999999" aria-label="Número do WhatsApp" /><div className="message-field"><textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Digite uma mensagem para responder..." rows={2} /><div className="message-tools"><span>＋</span><span>☺</span><small>Enter para enviar</small><button disabled={sending} aria-label="Enviar mensagem"><Icon name="send" /></button></div></div><p className="ai-note">✦ As respostas podem ser geradas por IA. Confira informações importantes antes de compartilhar.</p></form>
        </section>
      </div>
    </section>
  </main>;
}
