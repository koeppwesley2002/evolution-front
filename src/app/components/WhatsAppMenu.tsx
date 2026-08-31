'use client';

import React, { useState, useEffect } from 'react';
import { Search, MessageCircle, MoreVertical, Phone, Video, Paperclip, Smile, Send } from 'lucide-react';

interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  chatId?: string;
}

interface Message {
  id: string;
  sender: string;
  text: string;
  time: string;
}

const WhatsAppMenu = () => {
  // Dados fictícios como fallback
  const mockChats: Chat[] = [
    { id: '1', name: 'João Silva', avatar: '👨‍💼', lastMessage: 'Tudo bem! E você?', time: '10:32', unread: 0, online: true, chatId: '5551999999999@c.us' },
    { id: '2', name: 'Maria Santos', avatar: '👩‍💼', lastMessage: 'Claro! Sem problema', time: '09:15', unread: 2, online: true, chatId: '5552888888888@c.us' },
    { id: '3', name: 'Grupo Trabalho', avatar: '👥', lastMessage: 'Todos confirmar presença', time: '08:45', unread: 5, online: false, chatId: '5553777777777@g.us' },
  ];

  const mockMessages: Message[] = [
    { id: '1', sender: 'other', text: 'Oi! Como vai?', time: '10:30' },
    { id: '2', sender: 'self', text: 'Tudo bem! E você?', time: '10:31' },
    { id: '3', sender: 'other', text: 'Tudo certo! Vamos nos encontrar?', time: '10:32' },
  ];

  const [chats, setChats] = useState<Chat[]>(mockChats);
  const [selectedChat, setSelectedChat] = useState<string>('1');
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  // Buscar conversas reais da API Evolution
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const response = await fetch('/api/evolution/chats');
        if (response.ok) {
          const data = await response.json();
          console.log('Chats da API:', data);
          
          if (data && Array.isArray(data)) {
            const formattedChats: Chat[] = data.slice(0, 15).map((chat: any, index: number) => {
              const name = chat.name || chat.id?.split('@')[0] || 'Chat';
              return {
                id: String(index),
                name,
                avatar: name.charAt(0).toUpperCase(),
                lastMessage: chat.lastMessage || 'Sem mensagens',
                time: new Date(chat.timestamp || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                unread: chat.unreadMessages || 0,
                online: true,
                chatId: chat.id,
              };
            });
            
            if (formattedChats.length > 0) {
              setChats(formattedChats);
              setSelectedChat('0');
            }
          }
        }
      } catch (error) {
        console.log('Usando dados de exemplo (API não disponível)');
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, []);

  // Buscar mensagens quando um chat é selecionado
  useEffect(() => {
    if (!selectedChat) return;

    const fetchMessages = async () => {
      try {
        const chat = chats.find(c => c.id === selectedChat);
        if (!chat?.chatId) {
          setMessages(mockMessages);
          return;
        }

        const response = await fetch('/api/evolution/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatId: chat.chatId,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Mensagens da API:', data);
          
          if (data && Array.isArray(data)) {
            const formattedMessages: Message[] = data.map((msg: any) => ({
              id: msg.key?.id || String(Math.random()),
              sender: msg.fromMe ? 'self' : 'other',
              text: msg.body || msg.text || '[Mídia]',
              time: new Date(msg.timestamp * 1000 || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            }));
            
            setMessages(formattedMessages.length > 0 ? formattedMessages : mockMessages);
          }
        }
      } catch (error) {
        console.log('Usando mensagens de exemplo');
        setMessages(mockMessages);
      }
    };

    fetchMessages();
  }, [selectedChat, chats]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedChat) return;

    setSending(true);
    try {
      const chat = chats.find(c => c.id === selectedChat);
      if (!chat) return;

      const number = chat.chatId?.split('@')[0] || '';

      const response = await fetch('/api/evolution/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number,
          text: inputMessage,
        }),
      });

      if (response.ok) {
        // Adicionar mensagem localmente
        const newMessage: Message = {
          id: String(Date.now()),
          sender: 'self',
          text: inputMessage,
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages([...messages, newMessage]);
        setInputMessage('');
        
        // Atualizar lastMessage no chat
        const updatedChats = chats.map(c => 
          c.id === selectedChat 
            ? { ...c, lastMessage: inputMessage }
            : c
        );
        setChats(updatedChats);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const currentChat = chats.find(c => c.id === selectedChat);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Lista de Chats */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">WhatsApp</h1>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-full transition">
                <MessageCircle size={20} className="text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-full transition">
                <MoreVertical size={20} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar ou começar nova conversa"
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 && loading ? (
            <div className="p-4 text-center text-gray-500">
              <p>Carregando suas conversas...</p>
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat.id)}
                className={`p-3 border-b border-gray-100 cursor-pointer transition ${
                  selectedChat === chat.id ? 'bg-gray-50' : 'hover:bg-gray-50'
                }`}
              >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center text-xl">
                    {chat.avatar}
                  </div>
                  {chat.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-semibold text-gray-800">{chat.name}</h3>
                    <span className="text-xs text-gray-500 ml-2">{chat.time}</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                </div>
                {chat.unread > 0 && (
                  <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                    {chat.unread}
                  </div>
                )}
              </div>
            </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-gray-50 flex flex-col">
        {selectedChat && currentChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center text-lg">
                  {currentChat.avatar}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-800">{currentChat.name}</h2>
                  <p className="text-xs text-gray-500">Online</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-full transition">
                  <Phone size={20} className="text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full transition">
                  <Video size={20} className="text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full transition">
                  <MoreVertical size={20} className="text-gray-600" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'self' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      msg.sender === 'self'
                        ? 'bg-green-500 text-white rounded-br-none'
                        : 'bg-white text-gray-800 rounded-bl-none'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.sender === 'self' ? 'text-green-100' : 'text-gray-500'}`}>
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-full transition">
                  <Paperclip size={20} className="text-gray-600" />
                </button>
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Digite uma mensagem..."
                  disabled={sending}
                  className="flex-1 px-4 py-2 bg-gray-100 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                />
                <button className="p-2 hover:bg-gray-100 rounded-full transition">
                  <Smile size={20} className="text-gray-600" />
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={sending}
                  className="p-2 hover:bg-green-100 rounded-full transition disabled:opacity-50"
                >
                  <Send size={20} className="text-green-500" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageCircle size={64} className="mx-auto mb-4 opacity-50" />
              <p>Selecione uma conversa para começar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppMenu;
