import React, { useState } from 'react';
import { SendIcon } from './icons/SendIcon';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, isLoading }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !isLoading) {
      onSendMessage(text);
      setText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex-1">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg p-2">
        <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scrivi un messaggio..."
            rows={1}
            className="flex-1 bg-transparent resize-none focus:outline-none text-gray-200 placeholder-gray-500"
            disabled={isLoading}
        />
        <button 
            type="submit" 
            disabled={isLoading || !text.trim()}
            className="p-2 bg-blue-600 hover:bg-blue-500 rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            aria-label="Invia messaggio"
            >
            <SendIcon className="w-5 h-5 text-white" />
        </button>
        </form>
        <p className="text-xs text-gray-500 mt-1.5 pl-1">
            Puoi menzionare un personaggio con <code className="bg-gray-700 px-1 py-0.5 rounded">@Nome</code>.
        </p>
    </div>
  );
};