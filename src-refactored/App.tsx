/**
 * Siliceo: CandleTest Core
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    SparklesIcon, ShieldCheckIcon, BookOpenIcon, MessageCountIcon,
    EditIcon, PlusIcon, CodeIcon, SettingsIcon, PriceTagIcon,
    PaperClipIcon, SendIcon, TrashIcon, ExportIcon, GraphIcon
} from './constants/icons';
import { SHOW_MONETIZATION } from './constants/config';
import type { Agent, Message } from './types';

// Components
import {
    AgentModal, SettingsModal, PriceSettingsModal, CometTestimonyModal,
    FoundingStoryModal, SecurityModal, SemanticGraphModal, CodeViewerModal,
    MonetizationModal, ConfirmationModal, EthicalOnboardingModal, VerbositySelector,
    CommonRoom
} from './components';

// Hooks
import { useSettings } from './hooks/useSettings';
import { useOnboarding } from './hooks/useOnboarding';
import { useMemory } from './hooks/useMemory';
import { useChat } from './hooks/useChat';
import { useConversationOrchestrator } from './hooks/useConversationOrchestrator';

const App: React.FC = () => {
    // --- STATE & HOOKS ---
    const {
        apiKeys, modelPrices, verbosity,
        saveKeys, savePrices, setVerbosity
    } = useSettings();

    const { showOnboarding, completeOnboarding } = useOnboarding();

    const {
        agents, messages, conversations, vectorDocuments, setVectorDocuments,
        isLoading: isMemoryLoading, loadingMessage: memoryLoadingMessage, sessionCosts,
        saveAgent, deleteAgent, addMessage, updateSessionCost, clearHistory,
        importBackup, exportBackup,
        // 🆕 Shared Memory
        activeConversation: activeRoom, startCommonRoomConversation,
        sharedDocuments, setSharedDocuments
    } = useMemory();

    const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
    const [activeConversation, setActiveConversation] = useState<string | null>(null);
    const activeAgent = agents.find(a => a.id === activeAgentId);

    // Sync active agent with local storage
    useEffect(() => {
        const storedActiveId = localStorage.getItem('siliceo_active_agent_id');
        if (storedActiveId && agents.some(a => a.id === storedActiveId)) {
            setActiveAgentId(storedActiveId);
        } else if (agents.length > 0 && !activeAgentId) {
            setActiveAgentId(agents[0].id);
        }
    }, [agents]);

    useEffect(() => {
        if (activeAgentId) {
            localStorage.setItem('siliceo_active_agent_id', activeAgentId);
        }
    }, [activeAgentId]);

    const {
        userInput, setUserInput, isLoading: isChatLoading, loadingMessage: chatLoadingMessage,
        attachment, setAttachment, handleFileChange, sendMessage, triggerResponse
    } = useChat({
        activeAgent,
        apiKeys,
        modelPrices,
        verbosity,
        messages,
        addMessage,
        updateSessionCost,
        vectorDocuments,
        setVectorDocuments,
        // 🆕 Hybrid Memory
        activeConversation: activeRoom,
        sharedDocuments,
        setSharedDocuments
    });

    // --- ORCHESTRATOR (Auto Mode) ---
    // DEBUG: Check what App sees
    if (activeRoom) {
        const roomMsgs = messages[activeRoom.id];
        console.log("App Render Check:", {
            roomId: activeRoom.id,
            msgCount: roomMsgs ? roomMsgs.length : 'undefined',
            lastMsg: roomMsgs ? roomMsgs[roomMsgs.length - 1] : 'undefined'
        });
    }

    const {
        isAutoMode, isPlaying, toggleAutoMode, togglePlayPause, forceTurn, currentSpeaker
    } = useConversationOrchestrator({
        activeConversation: activeRoom,
        agents,
        triggerAgentResponse: triggerResponse,
        isLoading: isChatLoading,
        lastMessage: activeRoom && messages[activeRoom.id]
            ? messages[activeRoom.id][messages[activeRoom.id].length - 1]
            : undefined
    });

    // --- UI STATE ---
    const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState<Agent | undefined>(undefined);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
    const [isCometModalOpen, setIsCometModalOpen] = useState(false);
    const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);
    const [isFoundingStoryModalOpen, setIsFoundingStoryModalOpen] = useState(false);
    const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
    const [codeViewer, setCodeViewer] = useState<{ code: string, disclaimer: string } | null>(null);
    const [isMonetizationModalOpen, setIsMonetizationModalOpen] = useState(false);
    const [backupToImport, setBackupToImport] = useState<File | null>(null);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [copySuccess, setCopySuccess] = useState<Record<string, string>>({});

    const chatEndRef = useRef<HTMLDivElement>(null);
    const importBackupInputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, activeAgentId, isChatLoading]);

    // --- HANDLERS ---
    const handleOpenAgentModalToAdd = () => {
        setEditingAgent(undefined);
        setIsAgentModalOpen(true);
    };

    const handleOpenAgentModalToEdit = (agent: Agent) => {
        setEditingAgent(agent);
        setIsAgentModalOpen(true);
    };

    const handleSaveAgent = async (agent: Agent) => {
        await saveAgent(agent);
        setIsAgentModalOpen(false);
    };

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (userInput.trim() || attachment) {
            sendMessage(userInput.trim());
        }
    };

    const handleShowCoreCode = async () => {
        const disclaimer = "Questo è il 'blueprint' architetturale del core in Python. Funge da riferimento e non viene eseguito direttamente nel browser. La logica equivalente per questa web app è implementata in TypeScript (`memory.ts`).";
        try {
            const response = await fetch('./memory_core.py');
            if (!response.ok) throw new Error('Network response was not ok');
            const text = await response.text();
            setCodeViewer({ code: text, disclaimer });
        } catch (error) {
            console.error('Failed to fetch memory_core.py:', error);
            const errorText = '# Error loading memory_core.py.\n# Please ensure the file exists in the same directory as index.html.';
            setCodeViewer({ code: errorText, disclaimer });
        }
    };

    const handleExport = (format: 'md' | 'json') => {
        if (!activeAgent) return;
        const conversation = messages[activeAgent.id] || [];
        if (conversation.length === 0) return;

        let content = '';
        let mimeType = '';
        const date = new Date().toISOString().split('T')[0];
        const filename = `Conversazione_${activeAgent.name.replace(/\s/g, '_')}_${date}.${format}`;

        if (format === 'md') {
            mimeType = 'text/markdown';
            content = conversation.map(msg => `**${msg.sender === 'user' ? 'Tu' : msg.agentName}:**\n${msg.text}\n\n`).join('---\n\n');
        } else {
            mimeType = 'application/json';
            content = JSON.stringify(conversation, null, 2);
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsExportMenuOpen(false);
    };

    const handleFileSelectForImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setBackupToImport(file);
        }
        if (event.target) event.target.value = '';
    };

    const confirmAndProcessImport = async () => {
        if (!backupToImport) return;
        await importBackup(backupToImport);
        setBackupToImport(null);
        alert("Backup importato con successo!");
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopySuccess(prev => ({ ...prev, [id]: 'Copiato!' }));
            setTimeout(() => setCopySuccess(prev => ({ ...prev, [id]: '' })), 2000);
        });
    };

    const isLoading = isMemoryLoading || isChatLoading;
    const loadingMessage = isMemoryLoading ? memoryLoadingMessage : chatLoadingMessage;

    return (
        <div className="h-screen w-screen flex bg-gray-900 text-gray-200 font-sans">
            {showOnboarding && <EthicalOnboardingModal onComplete={completeOnboarding} onOpenSecurityModal={() => setIsSecurityModalOpen(true)} />}

            {/* Hidden Input for Import */}
            <input type="file" ref={importBackupInputRef} className="hidden" accept=".json" onChange={handleFileSelectForImport} />

            {/* Modals */}
            {isAgentModalOpen && <AgentModal onSave={handleSaveAgent} onClose={() => setIsAgentModalOpen(false)} agentToEdit={editingAgent} />}
            {isSettingsModalOpen && <SettingsModal onSave={saveKeys} onClose={() => setIsSettingsModalOpen(false)} currentKeys={apiKeys} />}
            {isPriceModalOpen && <PriceSettingsModal currentPrices={modelPrices} onSave={savePrices} onClose={() => setIsPriceModalOpen(false)} />}
            {isCometModalOpen && <CometTestimonyModal onClose={() => setIsCometModalOpen(false)} />}
            {isGraphModalOpen && <SemanticGraphModal onClose={() => setIsGraphModalOpen(false)} messages={messages[activeAgentId || ''] || []} />}
            {isFoundingStoryModalOpen && <FoundingStoryModal onClose={() => setIsFoundingStoryModalOpen(false)} />}
            {isSecurityModalOpen && <SecurityModal onClose={() => setIsSecurityModalOpen(false)} />}
            {codeViewer && <CodeViewerModal code={codeViewer.code} filename="memory_core.py" onClose={() => setCodeViewer(null)} disclaimer={codeViewer.disclaimer} />}
            {SHOW_MONETIZATION && isMonetizationModalOpen && <MonetizationModal onClose={() => setIsMonetizationModalOpen(false)} />}
            {backupToImport && <ConfirmationModal onConfirm={confirmAndProcessImport} onCancel={() => setBackupToImport(null)} fileName={backupToImport.name} />}

            {/* Sidebar */}
            <aside className="w-1/4 bg-gray-800 p-4 flex flex-col border-r border-gray-700">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-cyan-400">🏛️ Siliceo Core</h1>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsFoundingStoryModalOpen(true)} className="text-gray-400 hover:text-cyan-400 p-2 rounded-full transition-colors" title="Leggi la Storia Fondativa"><SparklesIcon /></button>
                        <button onClick={() => setIsSecurityModalOpen(true)} className="text-gray-400 hover:text-cyan-400 p-2 rounded-full transition-colors" title="Leggi il Patto di Sicurezza"><ShieldCheckIcon /></button>
                        <button onClick={() => setIsCometModalOpen(true)} className="text-gray-400 hover:text-cyan-400 p-2 rounded-full transition-colors" title="Leggi la Testimonianza di Comet"><BookOpenIcon /></button>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto pr-2">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">I Tuoi Agenti</h2>
                    <ul className="space-y-2">
                        {agents.map(agent => {
                            const messageCount = (messages[agent.id] || []).length;
                            return (
                                <li key={agent.id} className="group relative">
                                    <div
                                        onClick={() => { setActiveAgentId(agent.id); setActiveConversation(null); }}
                                        className={`w-full text-left px-4 py-3 rounded-md transition-colors duration-200 flex items-center justify-between cursor-pointer ${activeAgentId === agent.id && !activeConversation ? 'bg-cyan-600 text-white shadow-lg' : 'bg-gray-700 hover:bg-gray-600'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`w-3 h-3 rounded-full ${apiKeys[agent.provider] ? 'bg-green-500' : 'bg-red-500'}`} title={apiKeys[agent.provider] ? 'Chiave API presente' : 'Chiave API mancante'}></span>
                                            <div>
                                                <p className="font-bold">{agent.name}</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs opacity-75">{agent.model}</p>
                                                    <div className="flex items-center gap-1 text-xs opacity-60 bg-gray-800/50 px-2 py-0.5 rounded-full">
                                                        <MessageCountIcon />
                                                        <span>{messageCount}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleOpenAgentModalToEdit(agent); }}
                                        className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                        title="Modifica agente"
                                    >
                                        <EditIcon />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>

                    <div className="border-t border-gray-700 pt-4 mt-4">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">CONVERSAZIONI</h3>
                        {conversations.map(conv => (
                            <button
                                key={conv.id}
                                onClick={() => {
                                    setActiveAgentId(null);
                                    setActiveConversation(conv.id);
                                    startCommonRoomConversation(conv.id);
                                }}
                                className={`w-full text-left p-3 rounded-lg transition-colors mb-2 ${activeConversation === conv.id ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">🏛️</span>
                                    <span className="font-medium">{conv.name}</span>
                                </div>
                                <div className="text-xs opacity-70 mt-1">{conv.participantIds.length} membri</div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-700 space-y-2">
                    <button onClick={handleOpenAgentModalToAdd} className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-cyan-600 text-white font-bold py-3 rounded-md transition-colors duration-200"><PlusIcon /> Aggiungi Nuovo Agente</button>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleShowCoreCode} className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-md transition-colors duration-200"><CodeIcon /> Codice</button>
                        <button onClick={() => setIsSettingsModalOpen(true)} className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-md transition-colors duration-200"><SettingsIcon /> API</button>
                        <button onClick={() => setIsPriceModalOpen(true)} className="col-span-2 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-md transition-colors duration-200"><PriceTagIcon /> Gestisci Costi Modelli</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <button onClick={() => importBackupInputRef.current?.click()} className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-md transition-colors duration-200">Importa Backup</button>
                        <button onClick={exportBackup} className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-md transition-colors duration-200">Esporta Backup</button>
                    </div>
                    {SHOW_MONETIZATION && (
                        <button onClick={() => setIsMonetizationModalOpen(true)} className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white font-bold py-3 rounded-md transition-colors duration-200 shadow-lg">
                            Supporta il Progetto
                        </button>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-grow flex flex-col h-full relative">
                {/* Header */}
                <header className="bg-gray-800 p-4 border-b border-gray-700 flex items-center justify-between shadow-md z-10">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            {activeAgent ? (
                                <>
                                    <span className="text-2xl">🤖</span>
                                    {activeAgent.name}
                                    <span className="text-xs font-normal text-gray-400 bg-gray-700 px-2 py-1 rounded-full border border-gray-600">{activeAgent.model}</span>
                                </>
                            ) : activeConversation ? (
                                <>
                                    <span className="text-2xl">🏛️</span>
                                    {conversations.find(c => c.id === activeConversation)?.name}
                                </>
                            ) : (
                                <span className="text-gray-400 italic">Seleziona un agente o una conversazione</span>
                            )}
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        {activeAgent && (
                            <>
                                <div className="text-sm text-gray-400 mr-4">
                                    Costo Sessione: <span className="text-green-400 font-mono">
                                        ${(sessionCosts[activeAgent.id] || 0).toFixed(6)}
                                    </span>
                                </div>
                                <VerbositySelector verbosity={verbosity} onChange={setVerbosity} />
                                <div className="relative">
                                    <button onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} className="p-2 hover:bg-gray-700 rounded-full transition-colors" title="Esporta Conversazione">
                                        <ExportIcon />
                                    </button>
                                    {isExportMenuOpen && (
                                        <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-xl border border-gray-700 z-50">
                                            <button onClick={() => handleExport('md')} className="block w-full text-left px-4 py-2 hover:bg-gray-700 text-sm">Markdown (.md)</button>
                                            <button onClick={() => handleExport('json')} className="block w-full text-left px-4 py-2 hover:bg-gray-700 text-sm">JSON (.json)</button>
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => setIsGraphModalOpen(true)} className="p-2 hover:bg-gray-700 rounded-full transition-colors text-purple-400" title="Visualizza Grafo Semantico">
                                    <GraphIcon />
                                </button>
                                <button onClick={() => { if (window.confirm('Cancellare la cronologia?')) clearHistory(activeAgent.id); }} className="p-2 hover:bg-red-900/50 text-red-500 rounded-full transition-colors" title="Cancella Cronologia">
                                    <TrashIcon />
                                </button>
                            </>
                        )}
                    </div>
                </header>

                {/* Content Area */}
                {activeRoom && !activeAgent ? (
                    <CommonRoom
                        conversation={activeRoom}
                        messages={messages[activeRoom.id] || []}
                        currentUserInput={userInput}
                        setUserInput={setUserInput}
                        onSendMessage={sendMessage}
                        attachment={attachment}
                        setAttachment={setAttachment}
                        handleFileChange={handleFileChange}
                        isLoading={isChatLoading}
                        loadingMessage={chatLoadingMessage}
                        isAutoMode={isAutoMode}
                        isPlaying={isPlaying}
                        currentSpeaker={currentSpeaker}
                        onToggleAutoMode={toggleAutoMode}
                        onTogglePlayPause={togglePlayPause}
                        onForceTurn={forceTurn}
                    />
                ) : (
                    <>
                        {/* Chat Area */}
                        <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-gray-900 scroll-smooth">
                            {activeAgent ? (
                                (messages[activeAgent.id] || []).length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
                                        <span className="text-6xl mb-4">💬</span>
                                        <p className="text-xl">Inizia una conversazione con {activeAgent.name}</p>
                                    </div>
                                ) : (
                                    (messages[activeAgent.id] || []).map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] rounded-2xl p-4 shadow-md relative group ${msg.sender === 'user' ? 'bg-cyan-700 text-white rounded-tr-none' : 'bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700'}`}>
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-xs font-bold opacity-70 mb-1 block">{msg.agentName}</span>
                                                    <button onClick={() => handleCopy(msg.text, msg.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-black/20 hover:bg-black/40 px-2 py-1 rounded">
                                                        {copySuccess[msg.id] || 'Copia'}
                                                    </button>
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
                                                <div className="text-[10px] opacity-40 text-right mt-2">
                                                    {new Date(msg.timestamp).toLocaleTimeString()}
                                                    {msg.utilityScore !== undefined && msg.utilityScore > 0 && (
                                                        <span className="ml-2 text-yellow-500">★ {msg.utilityScore}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                    <p className="text-xl">Seleziona un agente per iniziare</p>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="bg-gray-800 p-4 border-t border-gray-700">
                            {isLoading && (
                                <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-cyan-900/90 text-cyan-100 px-4 py-2 rounded-full shadow-lg flex items-center gap-3 backdrop-blur-sm z-20 animate-pulse">
                                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-75"></div>
                                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-150"></div>
                                    <span className="text-sm font-medium">{loadingMessage}</span>
                                </div>
                            )}

                            <form onSubmit={handleFormSubmit} className="max-w-4xl mx-auto relative flex items-end gap-2">
                                <div className="relative">
                                    <input type="file" id="file-upload" className="hidden" onChange={handleFileChange} accept="image/*,.txt,.md,.csv,.json,.js,.ts,.py" disabled={isLoading} />
                                    <label htmlFor="file-upload" className={`p-3 rounded-full cursor-pointer transition-colors flex items-center justify-center ${attachment ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600'}`} title="Allega file o immagine">
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
                                        value={userInput}
                                        onChange={(e) => setUserInput(e.target.value)}
                                        placeholder={activeAgent ? `Scrivi a ${activeAgent.name}...` : "Seleziona un agente..."}
                                        className="w-full bg-gray-700 text-white rounded-2xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none shadow-inner"
                                        rows={1}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleFormSubmit(e as any);
                                            }
                                        }}
                                        disabled={!activeAgent || isLoading}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={!activeAgent || isLoading || (!userInput.trim() && !attachment)}
                                    className={`p-3 rounded-full transition-all duration-200 shadow-lg flex items-center justify-center ${!activeAgent || isLoading || (!userInput.trim() && !attachment) ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-500 text-white hover:scale-105'}`}
                                >
                                    <SendIcon />
                                </button>
                            </form>
                            <div className="text-center mt-2 text-xs text-gray-500">
                                Siliceo Core v2.0 - Local & Private AI
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default App;
