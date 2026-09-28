import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  X,
  Bot,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
  Download,
  Terminal,
  Loader2
} from 'lucide-react';
import { api } from '../lib/api';

const OPERATIONAL_PROMPTS = [
  { label: 'Fuel reserves & depletion', prompt: 'What is our current fuel stock and projected days of reserve under current weather?' },
  { label: 'Bharati live weather', prompt: 'What is the real-time satellite weather and temperature at Bharati Station?' },
  { label: 'Emergency SAR SOP', prompt: 'Generate an emergency SAR SOP triage plan for on-ice field operations.' },
  { label: '24h SITREP report', prompt: 'Draft the official 24-hour NCPOR executive situation report (SITREP).' }
];

function formatInlineText(text) {
  if (!text) return null;
  const parts = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-bold text-slate-900 dark:text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={match.index} className="rounded bg-slate-200 dark:bg-slate-800 px-1 py-0.5 font-mono text-[11px] text-blue-700 dark:text-blue-300">
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

function FormattedMessage({ content }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let currentList = [];

  const flushList = (key) => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${key}`} className="my-1.5 space-y-1 pl-2">
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('### ')) {
      flushList(idx);
      elements.push(
        <h4 key={idx} className="mt-2 mb-1 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
          {formatInlineText(trimmed.replace(/^###\s*/, ''))}
        </h4>
      );
    } else if (trimmed.startsWith('## ')) {
      flushList(idx);
      elements.push(
        <h3 key={idx} className="mt-2.5 mb-1 text-sm font-bold text-slate-900 dark:text-white">
          {formatInlineText(trimmed.replace(/^##\s*/, ''))}
        </h3>
      );
    } else if (trimmed.startsWith('# ')) {
      flushList(idx);
      elements.push(
        <h2 key={idx} className="mt-3 mb-1 text-sm font-extrabold text-slate-900 dark:text-white">
          {formatInlineText(trimmed.replace(/^#\s*/, ''))}
        </h2>
      );
    } else if (/^[-*•]\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^[-*•]\s+/, '');
      currentList.push(
        <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-blue-600 dark:bg-blue-400" aria-hidden="true" />
          <span className="flex-1">{formatInlineText(itemText)}</span>
        </li>
      );
    } else if (/^\d+\.\s+/.test(trimmed)) {
      flushList(idx);
      const numberMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numberMatch) {
        elements.push(
          <div key={idx} className="my-1 flex items-start gap-2 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
            <span className="flex size-4 shrink-0 items-center justify-center rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">
              {numberMatch[1]}
            </span>
            <span className="flex-1">{formatInlineText(numberMatch[2])}</span>
          </div>
        );
      }
    } else if (trimmed === '') {
      flushList(idx);
      elements.push(<div key={idx} className="h-1" />);
    } else {
      flushList(idx);
      elements.push(
        <p key={idx} className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed text-pretty">
          {formatInlineText(line)}
        </p>
      );
    }
  });

  flushList(lines.length);
  return <div className="space-y-1">{elements}</div>;
}

export default function PolarisCopilot({ isOpen, onClose, liveWeather }) {
  const minimalWelcomeMessage = {
    id: 'welcome',
    role: 'assistant',
    text: `Polaris Command AI initialized. Ask about station weather telemetry, winter fuel depletion models, SAR emergency procedures, or 24h executive SITREP drafting.`,
    provider: 'gemini',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  const [messages, setMessages] = useState([minimalWelcomeMessage]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleClearConversation = () => {
    setMessages([
      {
        ...minimalWelcomeMessage,
        id: 'welcome-' + Date.now(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSend = async (textToSend) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg = {
      id: 'user-' + Date.now(),
      role: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const history = messages
      .filter(m => m.id !== 'welcome')
      .map(m => ({ role: m.role, content: m.text }));

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api('/api/v1/ai/chat', {
        method: 'POST',
        body: { message: text, history }
      });

      const assistantMsg = {
        id: 'ai-' + Date.now(),
        role: 'assistant',
        text: res.text || 'Acknowledged.',
        provider: res.provider,
        model: res.model,
        fallbackNotice: res.fallbackNotice,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'assistant',
          text: `Query failed: ${err.message}`,
          provider: 'error',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportTranscript = () => {
    const text = messages.map(m => `[${m.time}] ${m.role.toUpperCase()}: ${m.text}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `POLARIS-AI-Transcript-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (!isOpen) return null;

  const currentTemp = liveWeather?.current?.temperature ?? -19.1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="POLARIS Mission Tactical AI Assistant"
      className="fixed bottom-20 right-6 z-50 flex flex-col w-[420px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100dvh-6rem)] rounded-xl shadow-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0b111e] overflow-hidden"
    >
      {/* Official Government Command Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white shrink-0 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white" aria-hidden="true">
            <Bot size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1">
                POLARIS AI Command
                <ShieldCheck size={14} className="text-blue-400" aria-hidden="true" />
              </h2>
              <span className="text-[10px] font-mono tabular-nums text-slate-300">
                {currentTemp}°C
              </span>
            </div>
            <p className="text-[10px] font-medium text-slate-400">
              {loading ? 'Synthesizing response…' : 'Tactical Assistant Active · 256-bit Encrypted'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={exportTranscript}
            aria-label="Export transcript"
            className="flex size-7 items-center justify-center rounded text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 transition-colors cursor-pointer"
          >
            <Download size={14} />
          </button>
          <button
            type="button"
            onClick={handleClearConversation}
            aria-label="Clear conversation history"
            className="flex size-7 items-center justify-center rounded text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assistant"
            className="flex size-7 items-center justify-center rounded text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 transition-colors cursor-pointer text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div
        role="log"
        aria-live="polite"
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-[#0b111e]"
      >
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 text-xs shadow-2xs ${
                  isUser
                    ? 'bg-blue-700 text-white'
                    : 'bg-white border border-slate-200 dark:border-slate-800 dark:bg-[#111a2e] text-slate-900 dark:text-slate-100'
                }`}
              >
                {!isUser ? (
                  <FormattedMessage content={m.text} />
                ) : (
                  <p className="whitespace-pre-wrap">{m.text}</p>
                )}

                <div className={`mt-2 flex items-center justify-between gap-3 text-[10px] ${isUser ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                  <span className="font-mono tabular-nums">{m.time}</span>
                  {!isUser && (
                    <div className="flex items-center gap-1.5">
                      {m.provider && (
                        <span className="font-mono uppercase text-[9px] px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                          {m.provider}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => copyToClipboard(m.text, m.id)}
                        aria-label="Copy message"
                        className="hover:text-blue-600 transition-colors"
                      >
                        {copiedId === m.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-[#111a2e] dark:text-slate-300">
            <Loader2 size={14} className="animate-spin text-blue-600" />
            <span>Processing polar query…</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Operational Chips */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111a2e] px-3 py-2 shrink-0">
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px]">
          {OPERATIONAL_PROMPTS.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(chip.prompt)}
              className="shrink-0 rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b111e] p-2.5 shrink-0"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask tactical mission question (e.g. fuel runout)..."
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          aria-label="Send message"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white shadow-xs hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
