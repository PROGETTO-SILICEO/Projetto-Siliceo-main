import React, { useEffect, useRef } from 'react';
import type { Message, Character } from '../App';
import { LinkIcon } from './icons/LinkIcon';

interface ChatWindowProps {
  messages: Message[];
  characters: Character[];
}

const renderWithMentions = (text: string, characters: Character[]) => {
    if (!characters.length) return text;
  
    const characterNames = characters.map(c => c.name).join('|');
    // Regex per trovare @NomePersonaggio, ma non come parte di una parola più lunga (es. email)
    const regex = new RegExp(`(^|\\s)(@(${characterNames}))\\b`, 'gi');
  
    const parts = text.split(regex);
  
    return parts.map((part, i) => {
        const isMention = characters.some(c => `@${c.name}`.toLowerCase() === part.toLowerCase().trim());
        if (isMention) {
            return <strong key={i} className="text-amber-300 bg-amber-800/60 px-1 py-0.5 rounded">{part.trim()}</strong>;
        }
        return part;
    });
};


export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, characters }) => {
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

  return (
    <div className="flex-1 p-4 overflow-y-auto space-y-4">
      {messages.map(msg => {
        const isUser = msg.authorId === 'user';
        const isSystem = msg.authorId === 'system';

        if (isSystem) {
          return (
            <div key={msg.id} className="flex justify-center">
              <div className="max-w-xl p-2 rounded-lg bg-red-800/50 text-red-300 text-sm">
                  <p className="text-center">{msg.text}</p>
              </div>
            </div>
          )
        }
        
        return (
          <div key={msg.id} className={`flex flex-col items-start ${isUser ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-xl p-3 rounded-lg ${isUser ? 'bg-blue-600' : 'bg-gray-700'}`}>
                {!isUser && (
                    <p className={`font-bold text-sm mb-1 text-${msg.authorColor}-400`}>{msg.authorName}</p>
                )}
                <p className="text-white whitespace-pre-wrap">{renderWithMentions(msg.text, characters)}</p>
            </div>
            {msg.sources && msg.sources.length > 0 && (
                <div className="max-w-xl mt-2 pl-2 border-l-2 border-gray-600">
                    <h4 className="text-xs text-gray-400 font-semibold mb-1">Fonti:</h4>
                    <ul className="space-y-1">
                        {msg.sources.map((source, index) => (
                            <li key={index}>
                                <a 
                                    href={source.uri} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
                                >
                                    <LinkIcon className="w-3 h-3 flex-shrink-0"/>
                                    <span className="truncate">{source.title}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
          </div>
        );
      })}
       <div ref={endOfMessagesRef} />
    </div>
  );
};