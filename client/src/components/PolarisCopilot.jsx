import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  X,
  Bot,
  Trash2,
  Check,
  CheckCheck,
  Copy,
  Loader2,
  Lock,
  Paperclip,
  Mic,
  ShieldCheck
} from 'lucide-react';
import { api } from '../lib/api';

const WHATSAPP_SUGGESTIONS = [
  { label: '⛽ Fuel reserves & runout', prompt: 'What is our current fuel stock and projected days of reserve?' },
  { label: '❄️ Bharati live weather', prompt: 'What is the real-time satellite weather and temperature at Bharati Station?' },
  { label: '🚨 Emergency SAR SOP', prompt: 'Generate an emergency SAR SOP triage plan for on-ice field operations.' },
  { label: '📋 24h SITREP report', prompt: 'Draft the 24-hour NCPOR executive situation report (SITREP).' }
];

// Helper to format inline markdown (bold, code)
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
        <strong key={match.index} className="font-semibold text-inherit opacity-95">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={match.index} className="rounded bg-black/10 dark:bg-white/10 px-1 py-0.2 font-mono text-[11px] text-blue-600 dark:text-cyan-300">
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

// Clean, structured Markdown renderer
function FormattedMessage({ content }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let currentList = [];

  const flushList = (key) => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${key}`} className="my-1.5 space-y-1 pl-1">
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Headers
    if (trimmed.startsWith('### ')) {
      flushList(idx);
      elements.push(
        <h4 key={idx} className="mt-2 mb-1 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-cyan-400">
          {formatInlineText(trimmed.replace(/^###\s*/, ''))}
        </h4>
      );
    } else if (trimmed.startsWith('## ')) {
      flushList(idx);
      elements.push(
        <h3 key={idx} className="mt-2.5 mb-1 text-sm font-extrabold text-inherit">
          {formatInlineText(trimmed.replace(/^##\s*/, ''))}
        </h3>
      );
    } else if (trimmed.startsWith('# ')) {
      flushList(idx);
      elements.push(
        <h2 key={idx} className="mt-3 mb-1 text-sm font-black text-inherit">
          {formatInlineText(trimmed.replace(/^#\s*/, ''))}
        </h2>
      );
    }
    // Bullet lists
    else if (/^[-*•]\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^[-*•]\s+/, '');
      currentList.push(
        <li key={idx} className="flex items-start gap-1.5 text-xs leading-relaxed">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
          <span className="flex-1">{formatInlineText(itemText)}</span>
        </li>
      );
    }
    // Numbered lists
    else if (/^\d+\.\s+/.test(trimmed)) {
      flushList(idx);
      const numberMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numberMatch) {
        elements.push(
          <div key={idx} className="my-1 flex items-start gap-2 text-xs leading-relaxed">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 font-mono text-[10px] font-bold text-blue-700 dark:text-blue-300">
              {numberMatch[1]}
            </span>
            <span className="flex-1">{formatInlineText(numberMatch[2])}</span>
          </div>
        );
      }
    }
    // Spacer
    else if (trimmed === '') {
      flushList(idx);
      elements.push(<div key={idx} className="h-1" />);
    }
    // Normal paragraph line
    else {
      flushList(idx);
      elements.push(
        <p key={idx} className="text-xs leading-relaxed">
          {formatInlineText(line)}
        </p>
      );
    }
  });

  flushList(lines.length);
  return <div className="space-y-1">{elements}</div>;
}

export default function PolarisCopilot({ isOpen, onClose, liveWeather }) {
  // English default greeting
  const minimalWelcomeMessage = {
    id: 'welcome',
    role: 'assistant',
    text: `Hello! 👋 I am **POLARIS AI**, your polar expedition copilot. Ask me anything about live station weather, fuel runout, emergency SAR protocols, or logistics. (English & Hinglish supported!)`,
    provider: 'gemini',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  const [messages, setMessages] = useState([minimalWelcomeMessage]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQuickChips, setShowQuickChips] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Handle ESC to close
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

    // Prepare conversational history for multi-turn chat memory
    const history = messages
      .filter(m => m.id !== 'welcome')
      .map(m => ({
        role: m.role,
        content: m.text
      }));

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
        text: res.text || 'Understood.',
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
          text: `⚠️ Network error: ${err.message || 'Server timeout'}`,
          provider: 'offline-failover',
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

  if (!isOpen) return null;

  const currentTemp = liveWeather?.current?.temperature ?? -19.1;

  return (
    /* WhatsApp Floating Widget Window (Royal / Polar Blue Theme) */
    <div className="fixed bottom-22 right-6 z-50 flex flex-col w-[390px] max-w-[calc(100vw-1.5rem)] h-[570px] max-h-[calc(100vh-7rem)] rounded-3xl shadow-2xl border border-slate-300/80 dark:border-slate-800 bg-[#f0f4f9] dark:bg-[#0b111e] overflow-hidden animate-in zoom-in-95 duration-200 font-sans select-text">
      
      {/* WhatsApp Header: Vibrant Polar Blue (#1D4ED8 / #2563EB) / Dark Slate (#0F172A) */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 dark:from-[#0f172a] dark:via-[#1e293b] dark:to-[#0f172a] text-white shadow-md shrink-0 border-b border-white/10 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          {/* Avatar with Online Status Indicator */}
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/20 dark:bg-blue-900/50 text-white shadow-inner">
            <Bot size={22} className="text-white dark:text-cyan-400" />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-cyan-400 ring-2 ring-blue-600 dark:ring-[#0f172a]" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold leading-tight tracking-wide flex items-center gap-1">
                POLARIS AI
                <ShieldCheck size={14} className="text-cyan-300 dark:text-cyan-400" />
              </h2>
              <span className="text-[10px] opacity-80 font-mono">
                {currentTemp}°C
              </span>
            </div>
            <p className="text-[11px] leading-none mt-0.5">
              {loading ? (
                <span className="text-cyan-200 dark:text-cyan-400 font-semibold italic animate-pulse">
                  typing...
                </span>
              ) : (
                <span className="text-blue-100/90 dark:text-cyan-300 font-medium">
                  online
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1 text-white/90">
          <button
            onClick={handleClearConversation}
            className="p-1.5 rounded-full hover:bg-white/15 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Clear Chat"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/15 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* WhatsApp Messages Body with classic subtle pattern */}
      <div 
        className="flex-1 overflow-y-auto p-3.5 space-y-2.5 [scrollbar-width:thin] bg-[#f0f4f9] dark:bg-[#0b111e]"
        style={{
          backgroundImage: `radial-gradient(rgba(37,99,235,0.06) 1px, transparent 0)`,
          backgroundSize: '16px 16px'
        }}
      >
        {/* Subtle Date Tag */}
        <div className="flex justify-center my-0.5">
          <span className="rounded-lg bg-white/80 dark:bg-slate-800/90 px-2.5 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 shadow-2xs uppercase tracking-wider">
            Today
          </span>
        </div>

        {/* WhatsApp End-to-End Encryption Pill */}
        <div className="flex justify-center my-1 px-3 text-center">
          <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-slate-800/70 border border-blue-100 dark:border-slate-700/60 px-3 py-1 text-[10px] text-blue-800 dark:text-cyan-300 shadow-2xs leading-tight">
            <Lock size={10} className="shrink-0" />
            <span>Messages are encrypted via POLARIS SatLink.</span>
          </div>
        </div>

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`group relative max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed transition-all shadow-xs ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-xs shadow-blue-500/10'
                  : 'bg-white text-[#0f172a] dark:bg-[#1e293b] dark:text-[#f1f5f9] rounded-tl-xs border border-slate-200/80 dark:border-slate-700/70 shadow-xs'
              }`}
            >
              {/* Formatted Content */}
              {m.role === 'assistant' ? (
                <FormattedMessage content={m.text} />
              ) : (
                <div className="whitespace-pre-wrap font-sans">{m.text}</div>
              )}

              {/* Timestamp & WhatsApp Double Checkmarks */}
              <div className="mt-1 flex items-center justify-end gap-1 text-[9px] select-none opacity-80">
                <span>{m.time}</span>
                {m.role === 'user' ? (
                  <CheckCheck size={13} className="text-cyan-200" />
                ) : (
                  <button
                    onClick={() => copyToClipboard(m.text, m.id)}
                    className="opacity-0 group-hover:opacity-100 hover:text-blue-500 dark:hover:text-cyan-400 transition-opacity ml-1 cursor-pointer"
                    title="Copy"
                  >
                    {copiedId === m.id ? <Check size={10} className="text-blue-500 dark:text-cyan-400" /> : <Copy size={10} />}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* WhatsApp-Style Suggested Quick Chips */}
        {showQuickChips && messages.length <= 2 && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                Suggested queries:
              </p>
              <button 
                onClick={() => setShowQuickChips(false)}
                className="text-[9px] text-slate-400 hover:text-blue-600 dark:hover:text-cyan-400 cursor-pointer"
              >
                Hide
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {WHATSAPP_SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(s.prompt)}
                  className="rounded-full bg-white dark:bg-[#1e293b] border border-slate-300/80 dark:border-slate-700 px-3 py-1 text-[11px] text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-cyan-400 transition-colors shadow-2xs cursor-pointer"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* WhatsApp-Style Incoming Typing Bubble Indicator (3 Bouncing Dots) */}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-xs bg-white dark:bg-[#1e293b] px-4 py-2.5 shadow-xs border border-slate-200/80 dark:border-slate-700/70">
              <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-cyan-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-cyan-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-cyan-400 animate-bounce" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* WhatsApp Input Bar: Polar Blue Style */}
      <div className="p-2.5 bg-white/90 dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-1.5"
        >
          {/* Quick Prompts Toggle */}
          <button
            type="button"
            onClick={() => setShowQuickChips(v => !v)}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
            title="Toggle Suggestions"
          >
            <Paperclip size={18} />
          </button>

          {/* Input Capsule */}
          <div className="flex-1 flex items-center bg-[#f0f4f9] dark:bg-[#1e293b] rounded-full px-3.5 py-1.5 shadow-xs border border-slate-200 dark:border-transparent focus-within:ring-1 focus-within:ring-blue-500">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message (English or Hinglish)..."
              disabled={loading}
              className="flex-1 bg-transparent text-xs text-[#0f172a] dark:text-[#f1f5f9] placeholder:text-slate-400 focus:outline-hidden"
            />
          </div>

          {/* Circular Blue Send / Mic Button */}
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
            title="Send"
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : input.trim() ? (
              <Send size={15} className="ml-0.5" />
            ) : (
              <Mic size={16} />
            )}
          </button>
        </form>
      </div>

    </div>
  );
}
