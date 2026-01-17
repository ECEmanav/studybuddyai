
import React, { useState } from 'react';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [showSources, setShowSources] = useState(false);

  const cleanBodyText = (text: string) => {
    return text
      .replace(/\*\*/g, '') // Remove stars
      .replace(/^\s*[\*\-\+]\s+/gm, '') // Remove bullets
      .trim();
  };

  const renderContent = (content: string) => {
    const lines = content.split('\n');
    
    return lines.map((line, i) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return null;

      const isOfficial = /OFFICIAL RULE:?/i.test(trimmedLine);
      const isHack = /COMMUNITY HACK:?/i.test(trimmedLine);
      const isSummary = /STUDYBUDDY SUMMARY/i.test(trimmedLine);
      const isDisclaimer = /LEGAL NOTICE:?/i.test(trimmedLine) || /DISCLAIMER:?/i.test(trimmedLine);

      if (isOfficial) {
        const text = cleanBodyText(trimmedLine.split(/OFFICIAL RULE:?/i)[1] || '');
        return text ? (
          <div key={i} className="mt-4 mb-2">
            <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-indigo-300 mb-1.5 block">Protocol</span>
            <p className="text-white leading-snug text-[14px] font-semibold">{text}</p>
          </div>
        ) : null;
      }
      
      if (isHack) {
        const text = cleanBodyText(trimmedLine.split(/COMMUNITY HACK:?/i)[1] || '');
        return text ? (
          <div key={i} className="mt-4 mb-2 border-l-2 border-emerald-400/30 pl-4">
            <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-emerald-300 mb-1.5 block">Insider Way</span>
            <p className="text-slate-100 leading-snug text-[14px] italic">{text}</p>
          </div>
        ) : null;
      }

      if (isSummary) {
        const text = cleanBodyText(trimmedLine.split(/STUDYBUDDY SUMMARY & COMPARISON:?/i)[1] || '');
        return text ? (
          <div key={i} className="mt-6 mb-3 bg-white/10 p-4 rounded-xl border border-white/10">
            <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-300 mb-1.5 block">The Comparison</span>
            <p className="text-white leading-relaxed text-[14px] font-bold">{text}</p>
          </div>
        ) : null;
      }

      if (isDisclaimer) {
        return (
          <div key={i} className="mt-8 pt-5 border-t border-white/30">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
               <span className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-400">Legal Notice</span>
            </div>
            <p className="text-[12px] leading-relaxed text-white font-bold tracking-tight bg-white/5 p-2 rounded-lg border border-white/5">
              {cleanBodyText(trimmedLine)}
            </p>
          </div>
        );
      }

      const cleaned = cleanBodyText(trimmedLine);
      if (!cleaned) return null;

      return (
        <p key={i} className={`mb-3 last:mb-0 leading-relaxed text-[14px] ${isUser ? 'text-white' : 'text-slate-100'}`}>
          {cleaned}
        </p>
      );
    });
  };

  return (
    <div className={`flex w-full mb-8 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`relative ${
        isUser 
          ? 'bg-indigo-600/30 border border-indigo-500/50 text-white rounded-2xl rounded-tr-none px-5 py-3.5 shadow-lg shadow-indigo-900/20' 
          : 'bg-[#111111] border border-white/20 text-slate-100 rounded-2xl rounded-tl-none px-6 py-5 shadow-2xl shadow-black/80'
      } max-w-[95%] md:max-w-[85%] lg:max-w-[75%]`}>
        
        <div className="antialiased">
          {renderContent(message.content)}
        </div>

        {/* Sources Section */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-6 pt-4 border-t border-white/10">
            <button 
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300 hover:text-white transition-colors group"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="14" height="14" 
                viewBox="0 0 24 24" fill="none" 
                stroke="currentColor" strokeWidth="2.5" 
                strokeLinecap="round" strokeLinejoin="round"
                className={`transition-transform duration-300 ${showSources ? 'rotate-180' : ''}`}
              >
                <path d="m6 9 6 6 6-6"/>
              </svg>
              {showSources ? 'Hide Sources' : `View ${message.sources.length} Official Sources`}
            </button>

            {showSources && (
              <div className="mt-4 grid grid-cols-1 gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                {message.sources.map((source, idx) => (
                  <a
                    key={idx}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group/source"
                  >
                    <div className="flex flex-col gap-0.5 max-w-[85%]">
                      <span className="text-[11px] font-bold text-white truncate">{source.title || 'Official Document'}</span>
                      <span className="text-[9px] text-slate-400 truncate opacity-60">{new URL(source.uri).hostname}</span>
                    </div>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="12" height="12" 
                      viewBox="0 0 24 24" fill="none" 
                      stroke="currentColor" strokeWidth="3" 
                      strokeLinecap="round" strokeLinejoin="round"
                      className="text-white/30 group-hover/source:text-white transition-colors"
                    >
                      <path d="M7 7h10v10"/><path d="M7 17 17 7"/>
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
        
        <div className={`absolute bottom-[-20px] ${isUser ? 'right-0' : 'left-0'} text-[9px] font-bold text-white/40 tracking-widest uppercase`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
