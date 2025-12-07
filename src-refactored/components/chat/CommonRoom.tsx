/**
 * Siliceo: CandleTest Core - Common Room UI
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */

import React, { useRef, useEffect } from 'react';
import {
    PaperClipIcon, SendIcon, SparklesIcon,
    MessageCountIcon, GraphIcon
} from '../../constants/icons';
import type { Agent, Message, ActiveConversation, Attachment } from '../../types';

type CommonRoomProps = {
    conversation: ActiveConversation;
    messages: Message[];
    currentUserInput: string;
    setUserInput: (text: string) => void;
    onSendMessage: (text: string) => void;
    attachment: Attachment | null;
    setAttachment: (att: Attachment | null) => void;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isLoading: boolean;
    loadingMessage: string;
    isAutoMode?: boolean;
    isPlaying?: boolean;
    currentSpeaker?: Agent;
    onToggleAutoMode?: () => void;
    onTogglePlayPause?: () => void;
    onForceTurn?: (agent: Agent) => void;
};

export const CommonRoom: React.FC<CommonRoomProps> = ({
    conversation,
    messages,
    currentUserInput,
    setUserInput,
    onSendMessage,
    attachment,
    setAttachment,
    handleFileChange,
    isLoading,
    loadingMessage,
    isAutoMode = false,
    isPlaying = false,
    currentSpeaker,
    onToggleAutoMode,
    onTogglePlayPause,
    onForceTurn
}) => {
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (currentUserInput.trim() || attachment) {
            onSendMessage(currentUserInput.trim());
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-900">
            {/* Room Header Info */}
            <div className="bg-gray-800/50 p-2 border-b border-gray-700 flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-2">
                    <span className="text-purple-400"><SparklesIcon /></span>
                    <span>Memoria Ibrida Attiva</span>
                </div>
                <div className="flex items-center gap-2">
                    <span>{conversation.participantIds.length} Partecipanti</span>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6 scroll-smooth">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
                        <span className="text-6xl mb-4">🏛️</span>
                        <p className="text-xl">Benvenuti nell'Agorà Comune</p>
                        <p className="text-sm mt-2">La memoria è condivisa tra tutti i partecipanti.</p>
                    </div>
                ) : (
                    // Deduplicate messages by ID to prevent key errors
                    Array.from(new Map<string, Message>(messages.map(m => [m.id, m])).values())
                        .sort((a, b) => a.timestamp - b.timestamp)
                        .map((msg: Message, index: number) => {
                            const senderAgent = conversation.participants.find(a => a.name === msg.agentName);
                            const senderColor = senderAgent?.color || 'gray'; // Fallback color if not set

                            // Determine alignment and style based on sender
                            const isUser = msg.sender === 'user';

                            // Use composite key to guarantee uniqueness even if IDs clash
                            const uniqueKey = `${msg.id}-${index}`;

                            return (
                                <div key={uniqueKey} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-2xl p-4 shadow-md relative group 
                                    ${isUser
                                            ? 'bg-cyan-900/40 border border-cyan-700/50 text-cyan-100 rounded-tr-none'
                                            : 'bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700'
                                        }`}
                                        style={!isUser && senderAgent?.color ? { borderLeft: `3px solid ${senderAgent.color}` } : {}}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-bold opacity-70 mb-1 block flex items-center gap-2">
                                                {msg.agentName}
                                                {senderAgent && (
                                                    <span className="text-[10px] bg-black/20 px-1 rounded opacity-50">
                                                        {senderAgent.model}
                                                    </span>
                                                )}
                                            </span>
                                        </div>

                                        {msg.attachment && (
                                            <div className="mb-3 p-2 bg-black/20 rounded border border-white/10">
                                                <div className="flex items-center gap-2 text-xs opacity-80 mb-1">
                                                    <PaperClipIcon />
                                                    <span>Allegato: {msg.attachment.name}</span>
                                                </div>
                                                {msg.attachment.type === 'image' && (
                                                    <img src={msg.attachment.content} alt="Allegato" className="max-w-full h-auto rounded max-h-60 object-contain" />
                                                )}
                                                {msg.attachment.type === 'text' && (
                                                    <div className="text-xs font-mono bg-black/30 p-2 rounded max-h-32 overflow-y-auto whitespace-pre-wrap">
                                                        {msg.attachment.content.substring(0, 300)}...
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                                            {msg.text}
                                        </div>
                                        <div className="text-[10px] opacity-40 text-right mt-2 flex items-center justify-end gap-2">
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                            {msg.utilityScore > 0 && (
                                                <span className="text-yellow-500">★ {msg.utilityScore}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Controls Area (Auto Mode / Turns) */}
            <div className="bg-gray-800/80 border-t border-gray-700 p-2">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${isAutoMode ? 'text-green-400' : 'text-gray-500'}`}>
                            {isAutoMode ? 'AUTO MODE' : 'MANUAL MODE'}
                        </span>
                        {onToggleAutoMode && (
                            <button
                                onClick={onToggleAutoMode}
                                className={`w-8 h-4 rounded-full relative transition-colors ${isAutoMode ? 'bg-green-600' : 'bg-gray-600'}`}
                            >
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${isAutoMode ? 'left-4.5' : 'left-0.5'}`} />
                            </button>
                        )}
                    </div>

                    {isAutoMode && onTogglePlayPause && (
                        <button
                            onClick={onTogglePlayPause}
                            className={`p-1.5 rounded-full ${isPlaying ? 'bg-red-500/20 text-red-400 hover:bg-red-500/40' : 'bg-green-500/20 text-green-400 hover:bg-green-500/40'}`}
                            title={isPlaying ? "Pausa" : "Riprendi"}
                        >
                            {isPlaying ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                    )}
                </div>

                {/* Agent Turn Buttons */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {conversation.participants.map(agent => (
                        <button
                            key={agent.id}
                            onClick={() => onForceTurn && onForceTurn(agent)}
                            disabled={isLoading || (isAutoMode && isPlaying)}
                            className={`
                                flex items-center gap-1 px-2 py-1 rounded text-xs font-medium whitespace-nowrap transition-all
                                ${currentSpeaker?.id === agent.id && isPlaying
                                    ? `bg-${agent.color || 'gray'}-500 text-white ring-2 ring-white animate-pulse`
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
                                disabled:opacity-50 disabled:cursor-not-allowed
                            `}
                            style={currentSpeaker?.id === agent.id && isPlaying ? { backgroundColor: agent.color } : {}}
                        >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: agent.color || 'gray' }}></span>
                            {agent.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Input Area */}
            <div className="bg-gray-800 p-4 border-t border-gray-700">
                {isLoading && (
                    <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-purple-900/90 text-purple-100 px-4 py-2 rounded-full shadow-lg flex items-center gap-3 backdrop-blur-sm z-20 animate-pulse border border-purple-500/30">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-150"></div>
                        <span className="text-sm font-medium">{loadingMessage}</span>
                    </div>
                )}

                <form onSubmit={handleFormSubmit} className="max-w-4xl mx-auto relative flex items-end gap-2">
                    <div className="relative">
                        <input type="file" id="common-file-upload" className="hidden" onChange={handleFileChange} accept="image/*,.txt,.md,.csv,.json,.js,.ts,.py" disabled={isLoading} />
                        <label htmlFor="common-file-upload" className={`p-3 rounded-full cursor-pointer transition-colors flex items-center justify-center ${attachment ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600'}`} title="Allega file o immagine">
                            <PaperClipIcon />
                        </label>
                        {attachment && (
                            <div className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-gray-600 p-2 rounded shadow-lg flex items-center gap-2 whitespace-nowrap">
                                <span className="text-xs max-w-[150px] truncate">{attachment.name}</span>
                                <button type="button" onClick={() => setAttachment(null)} className="text-red-400 hover:text-red-300">×</button>
                            </div>
                        )}
                    </div>

                    <div className="flex-grow relative">
                        <textarea
                            value={currentUserInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder={isAutoMode && isPlaying ? "Conversazione automatica in corso..." : "Scrivi nell'Agorà..."}
                            className="w-full bg-gray-700 text-white rounded-2xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none shadow-inner disabled:opacity-50"
                            rows={1}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleFormSubmit(e);
                                }
                            }}
                            disabled={isLoading || (isAutoMode && isPlaying)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || (isAutoMode && isPlaying) || (!currentUserInput.trim() && !attachment)}
                        className={`p-3 rounded-full transition-all duration-200 shadow-lg flex items-center justify-center ${isLoading || (isAutoMode && isPlaying) || (!currentUserInput.trim() && !attachment) ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white hover:scale-105'}`}
                    >
                        <SendIcon />
                    </button>
                </form>
                <div className="text-center mt-2 text-xs text-gray-500">
                    Agorà Comune - Memoria Condivisa Attiva
                </div>
            </div>
        </div>
    );
};
