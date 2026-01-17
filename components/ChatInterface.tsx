
import React, { useState, useRef, useEffect } from 'react';
import { StudyBuddyService } from '../services/geminiService';
import { Message, ChatSession } from '../types';
import MessageBubble from './MessageBubble';

const generateId = () => Math.random().toString(36).substring(2, 9);

const ChatInterface: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [input, setInput] = useState('');
  
  // Persistence toggle
  const [isSaveEnabled, setIsSaveEnabled] = useState<boolean>(() => {
    const savedPreference = localStorage.getItem('studybuddy_save_preference');
    return savedPreference === null ? true : savedPreference === 'true';
  });

  // Backend Logging toggle (Consent)
  const [isLoggingEnabled, setIsLoggingEnabled] = useState<boolean>(() => {
    const savedLoggingPref = localStorage.getItem('studybuddy_logging_preference');
    return savedLoggingPref === 'true'; // Default to false for privacy
  });

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const savedPreference = localStorage.getItem('studybuddy_save_preference');
    if (savedPreference === 'false') return [];
    const saved = localStorage.getItem('studybuddy_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const service = useRef(new StudyBuddyService());

  useEffect(() => {
    localStorage.setItem('studybuddy_save_preference', String(isSaveEnabled));
    if (!isSaveEnabled) {
      localStorage.removeItem('studybuddy_sessions');
    }
  }, [isSaveEnabled]);

  useEffect(() => {
    localStorage.setItem('studybuddy_logging_preference', String(isLoggingEnabled));
  }, [isLoggingEnabled]);

  useEffect(() => {
    if (isSaveEnabled) {
      localStorage.setItem('studybuddy_sessions', JSON.stringify(sessions));
    }
  }, [sessions, isSaveEnabled]);

  const currentMessages = sessions.find(s => s.id === currentSessionId)?.messages || [];
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [currentMessages, isLoading]);

  const createNewChat = () => {
    setCurrentSessionId(null);
    setIsSidebarOpen(false);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) setCurrentSessionId(null);
  };

  const logToBackend = async (userText: string, assistantText: string, sources?: any[]) => {
    if (!isLoggingEnabled) return;
    try {
      await fetch('http://localhost:5050/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consent: true,
          userText,
          assistantText,
          sources: sources?.map(s => s.uri) || [],
          meta: { sessionId: currentSessionId }
        })
      });
    } catch (e) {
      console.warn("Backend logger unreachable. Ensure server.js is running.");
    }
  };

  const handleSubmit = async (e: React.FormEvent | string) => {
    if (typeof e !== 'string') e.preventDefault();
    const query = typeof e === 'string' ? e : input;
    if (!query.trim() || isLoading) return;

    let activeSessionId = currentSessionId;

    if (!activeSessionId) {
      const newSession: ChatSession = {
        id: generateId(),
        title: query.length > 30 ? query.substring(0, 30) + '...' : query,
        messages: [],
        createdAt: Date.now(),
      };
      setSessions(prev => [newSession, ...prev]);
      activeSessionId = newSession.id;
      setCurrentSessionId(activeSessionId);
    }

    const userMessage: Message = { role: 'user', content: query, timestamp: Date.now() };
    const placeholderBotMessage: Message = { role: 'assistant', content: '', timestamp: Date.now() };

    setSessions(prev => prev.map(session => {
      if (session.id === activeSessionId) {
        return { ...session, messages: [...session.messages, userMessage, placeholderBotMessage] };
      }
      return session;
    }));

    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      let accumulatedText = '';
      let accumulatedSources: { uri: string; title: string }[] = [];

      const stream = service.current.askStream(query);

      for await (const chunk of stream) {
        if (chunk.text) accumulatedText += chunk.text;
        if (chunk.sources) accumulatedSources = [...accumulatedSources, ...chunk.sources];

        setSessions(prev => prev.map(session => {
          if (session.id === activeSessionId) {
            const newMessages = [...session.messages];
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg.role === 'assistant') {
              lastMsg.content = accumulatedText;
              const uniqueSources = Array.from(new Map(accumulatedSources.map(s => [s.uri, s])).values());
              lastMsg.sources = uniqueSources.length > 0 ? uniqueSources : undefined;
            }
            return { ...session, messages: newMessages };
          }
          return session;
        }));
      }

      // Final logging after stream ends
      logToBackend(query, accumulatedText, accumulatedSources);

    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen max-h-screen bg-black text-slate-100 overflow-hidden font-sans">
      
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-black border-r border-white/5 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full p-8">
          <div className="mb-10 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-black font-black text-[9px]">SB</div>
                <span className="font-display font-bold tracking-[0.25em] text-[11px] uppercase text-white">Archives</span>
             </div>
             <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-white/70 hover:text-white">✕</button>
          </div>

          <button 
            onClick={createNewChat}
            className="w-full flex items-center gap-4 bg-white/10 hover:bg-white/15 text-white border border-white/20 px-5 py-4 rounded-2xl transition-all mb-8 group"
          >
            <span className="text-2xl font-light leading-none">+</span>
            <span className="text-[11px] font-bold uppercase tracking-widest">New Session</span>
          </button>

          {/* Controls Container */}
          <div className="space-y-3 mb-8">
            {/* History Toggle */}
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Save History</span>
              <button 
                onClick={() => setIsSaveEnabled(!isSaveEnabled)}
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${isSaveEnabled ? 'bg-indigo-600' : 'bg-slate-800'}`}
              >
                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isSaveEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Logging Toggle */}
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-none mb-1">Improve AI</span>
                <span className="text-[7px] text-slate-500 uppercase tracking-tighter">Share anonymous logs</span>
              </div>
              <button 
                onClick={() => setIsLoggingEnabled(!isLoggingEnabled)}
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${isLoggingEnabled ? 'bg-emerald-600' : 'bg-slate-800'}`}
              >
                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isLoggingEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
            {sessions.map(session => (
              <div 
                key={session.id}
                onClick={() => { setCurrentSessionId(session.id); setIsSidebarOpen(false); }}
                className={`group relative flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border ${
                  currentSessionId === session.id 
                    ? 'bg-white/10 text-white border-white/20 shadow-xl' 
                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-100 border-transparent'
                }`}
              >
                <div className="truncate text-[13px] font-semibold pr-6">
                  {session.title}
                </div>
                <button 
                  onClick={(e) => deleteSession(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-opacity p-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative bg-black">
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
        )}

        {/* Header */}
        <nav className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-black/60 backdrop-blur-2xl z-20">
          <div className="flex items-center gap-5">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-slate-300 hover:text-white transition-colors">☰</button>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-black font-black text-[10px]">SB</div>
              <h1 className="text-[11px] font-bold tracking-[0.3em] uppercase text-white">StudyBuddy</h1>
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-white/5 px-4 py-2 rounded-full border border-white/5">
            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-indigo-400 animate-pulse' : 'bg-[#10B981]'}`} />
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">
              {isLoading ? 'Researching' : 'Active'}
            </span>
          </div>
        </nav>

        {/* Feed */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto pt-12 pb-12 px-6 scrollbar-hide">
          <div className="max-w-4xl mx-auto space-y-8">
            {!currentSessionId && (
              <div className="flex flex-col items-center justify-center min-h-[40vh] text-center mt-12">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-10 border border-white/20 text-3xl shadow-2xl">✨</div>
                <h2 className="text-sm font-display font-bold text-white tracking-[0.5em] uppercase mb-6">Initialize StudyBuddy</h2>
                <p className="text-slate-200 text-base max-w-lg leading-relaxed font-semibold px-4">
                  Navigating foreign bureaucracy? Ask about registration, visas, or health insurance. I combine official data with street-smart hacks.
                </p>
              </div>
            )}
            
            {currentMessages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            
            {error && (
              <div className="bg-rose-500/20 border border-rose-500/40 text-rose-100 rounded-2xl px-6 py-4 text-[13px] text-center font-bold tracking-tight shadow-xl">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Input Tray */}
        <div className="p-8 md:p-12 border-t border-white/10 bg-black">
          <div className="max-w-3xl mx-auto flex flex-col items-center">
            
            {/* Input Form */}
            <form onSubmit={handleSubmit} className="relative group w-full">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about visas, housing, work..."
                className="w-full bg-[#1A1A24]/60 border border-white/20 rounded-2xl px-8 py-6 pr-20 text-[15px] text-white focus:outline-none focus:border-white/40 transition-all placeholder:text-slate-600 font-semibold shadow-2xl"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-4 top-4 p-4 bg-white/10 hover:bg-white text-white hover:text-black rounded-xl disabled:bg-white/5 disabled:text-slate-800 transition-all shadow-xl active:scale-95 group"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="rotate-0 group-hover:scale-110 transition-transform">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                )}
              </button>
            </form>

            {/* Quick Chips */}
            <div className="mt-8 flex justify-center gap-6 flex-wrap">
              {['Anmeldung', 'Insurance', 'Jobs'].map((label) => (
                <button
                  key={label}
                  onClick={() => handleSubmit(`Tell me about ${label}`)}
                  className="text-[11px] font-extrabold text-white hover:text-indigo-400 uppercase tracking-[0.3em] transition-all"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* AI Disclaimer Box */}
            <div className="mt-12 w-full max-w-4xl p-8 bg-[#C7A13C]/10 border-2 border-[#C7A13C] rounded-3xl flex items-start gap-6 shadow-[0_0_50px_-12px_rgba(199,161,60,0.3)]">
              <div className="flex-shrink-0 w-12 h-12 bg-[#C7A13C] rounded-2xl flex items-center justify-center text-black shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <div>
                <h4 className="text-[13px] font-black uppercase tracking-[0.25em] text-[#C7A13C] mb-2.5">AI Disclaimer</h4>
                <p className="text-white text-[14px] leading-relaxed font-bold">
                  StudyBuddy is an AI assistant, not a lawyer or government authority. Information may be incomplete, simplified, or outdated. Always verify important decisions with official German government or university sources.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
