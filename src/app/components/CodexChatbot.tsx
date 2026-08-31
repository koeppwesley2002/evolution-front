'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, AlertCircle, Loader2 } from 'lucide-react';

interface Message {
  role: 'system' | 'user' | 'assistant' | 'developer';
  content: string;
  timestamp?: number;
}

interface CodexStatus {
  authenticated: boolean;
  status: string;
  message?: string;
}

export default function CodexChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: 'Você é um assistente AI útil que responde perguntas sobre desenvolvimento, tecnologia e programação. Responda de forma clara e concisa.',
      timestamp: Date.now()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('codex');
  const [models, setModels] = useState<string[]>(['codex', 'gpt-3.5-turbo', 'gpt-4']);
  const [status, setStatus] = useState<CodexStatus>({ authenticated: false, status: 'checking' });
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Verificar status do Codex na inicialização
  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 5000); // Check a cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function checkServerStatus() {
    try {
      const response = await fetch('/api/codex/health');
      const data = await response.json();
      
      setStatus({
        authenticated: data.authenticated,
        status: data.status,
        message: data.message
      });

      // Carregar modelos disponíveis
      if (response.ok && data.authenticated) {
        try {
          const modelsResponse = await fetch('/api/codex/models');
          if (modelsResponse.ok) {
            const modelsData = await modelsResponse.json();
            if (modelsData.data && Array.isArray(modelsData.data)) {
              const modelIds = modelsData.data.map((m: any) => m.id);
              setModels(modelIds);
            }
          }
        } catch (err) {
          console.error('Erro ao carregar modelos:', err);
        }
      }

      setError('');
    } catch (err: any) {
      setStatus({
        authenticated: false,
        status: 'offline',
        message: 'Servidor Codex não está disponível'
      });
      setError('Servidor Codex não está rodando. Execute: node codex-server.js');
    }
  }

  async function sendMessage() {
    if (!inputMessage.trim()) return;
    if (!status.authenticated) {
      setError('Autenticação Codex não disponível. Execute: codex login');
      return;
    }

    // Adicionar mensagem do usuário
    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: Date.now()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/codex/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: newMessages.filter(m => m.role !== 'system').map(m => ({
            role: m.role,
            content: m.content
          })),
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao processar resposta');
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.choices[0]?.message?.content || 'Sem resposta',
        timestamp: Date.now()
      };

      setMessages([...newMessages, assistantMessage]);

    } catch (err: any) {
      console.error('Erro:', err);
      setError(err.message || 'Erro ao enviar mensagem');
      
      // Se o servidor está offline, atualizar status
      if (err.message.includes('Unavailable')) {
        await checkServerStatus();
      }
    } finally {
      setLoading(false);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-linear-to-r from-blue-600 to-blue-700 text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">Codex Chatbot Local</h1>
          <p className="text-blue-100 text-sm">API local sem OPENAI_API_KEY</p>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              status.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {status.status === 'healthy' ? '✓ Servidor Codex' : '✗ Servidor Offline'}
              </p>
              <p className="text-xs text-gray-500">
                {status.authenticated ? 'Autenticado com Codex' : 'Não autenticado - Execute: codex login'}
              </p>
            </div>
          </div>

          {/* Model Selector */}
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium text-gray-700">Modelo:</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              disabled={!status.authenticated}
            >
              {models.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.filter(m => m.role !== 'system').map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xl px-4 py-3 rounded-lg shadow-sm ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap wrap-break-word">{message.content}</p>
                {message.timestamp && (
                  <p className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-800 border border-gray-200 rounded-lg rounded-bl-none px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Processando...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">{error}</p>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                status.authenticated
                  ? 'Digite sua mensagem... (Shift+Enter para nova linha)'
                  : 'Execute: codex login e node codex-server.js'
              }
              disabled={!status.authenticated || loading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 disabled:bg-gray-50 resize-none"
              rows={3}
            />
            <button
              onClick={sendMessage}
              disabled={!status.authenticated || loading || !inputMessage.trim()}
              className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors flex items-center justify-center"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Status: {status.status === 'healthy' && status.authenticated ? '✓ Pronto para usar' : '✗ Configure Codex'}
          </p>
        </div>
      </div>
    </div>
  );
}
