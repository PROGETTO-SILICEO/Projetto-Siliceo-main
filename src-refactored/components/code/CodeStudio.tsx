// src-refactored/components/code/CodeStudio.tsx
// Code Studio con Code Review Room - Multi-Agent Chat
// 🕯️ Progetto Siliceo

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Agent, Message, Provider, VectorDocument } from '../../types';
import { getAiResponse } from '../../services/api';
import { generateId } from '../../utils/generateId';

// === TYPES ===
interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: FileNode[];
}

interface EditorTab {
    id: string;
    path: string;
    name: string;
    content: string;
    isModified: boolean;
}

interface CodeStudioProps {
    onClose: () => void;
    agents: Agent[];
    apiKeys: Record<Provider, string>;
    // 🆕 Memoria collegata
    vectorDocuments?: Record<string, VectorDocument[]>;
    sharedDocuments?: Record<string, VectorDocument[]>;
    // 🆕 Callback per salvare messaggi in memoria (bidirezionale)
    onSaveToMemory?: (agentId: string, text: string) => Promise<void>;
}

const API_BASE = 'http://127.0.0.1:8000';

// === TREE NODE ===
const TreeNode: React.FC<{
    node: FileNode;
    onFileClick: (path: string) => void;
    onDelete: (path: string, isDir: boolean) => void;
}> = ({ node, onFileClick, onDelete }) => {
    const isFile = node.type === 'file';
    const isRoot = node.path === '.';

    if (isFile) {
        return (
            <li className="flex items-center justify-between py-1 px-2 hover:bg-gray-700/30 rounded cursor-pointer text-sm">
                <span onClick={() => onFileClick(node.path)} className="flex-1">📄 {node.name}</span>
                <button onClick={() => onDelete(node.path, false)} className="opacity-50 hover:opacity-100 text-xs">🗑️</button>
            </li>
        );
    }

    return (
        <li>
            <details open>
                <summary className="flex items-center justify-between py-1 px-2 hover:bg-gray-700/30 rounded cursor-pointer text-sm">
                    <span>📁 {node.name}</span>
                    {!isRoot && (
                        <button onClick={(e) => { e.stopPropagation(); onDelete(node.path, true); }} className="opacity-50 hover:opacity-100 text-xs">🗑️</button>
                    )}
                </summary>
                <ul className="pl-4">
                    {node.children?.map((child, i) => (
                        <TreeNode key={i} node={child} onFileClick={onFileClick} onDelete={onDelete} />
                    ))}
                </ul>
            </details>
        </li>
    );
};

// === MAIN COMPONENT ===
export const CodeStudio: React.FC<CodeStudioProps> = ({
    onClose,
    agents,
    apiKeys,
    vectorDocuments = {},
    sharedDocuments = {},
    onSaveToMemory
}) => {
    // File & Editor state
    const [fileTree, setFileTree] = useState<FileNode | null>(null);
    const [tabs, setTabs] = useState<EditorTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Chat state
    const [chatMessages, setChatMessages] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState('');
    const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
    const [writerAgentId, setWriterAgentId] = useState<string | null>(null);
    const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
    const [lastUserContext, setLastUserContext] = useState<string>('');

    const activeTab = tabs.find(t => t.id === activeTabId);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // Initialize with coding agents
    useEffect(() => {
        const codingAgents = agents.filter(a =>
            a.provider === 'alibaba' ||
            a.name.toLowerCase().includes('qwen') ||
            a.name.toLowerCase().includes('claude') ||
            a.name.toLowerCase().includes('gemini')
        );
        if (codingAgents.length > 0) {
            setSelectedAgents(codingAgents.slice(0, 3).map(a => a.id));
            const qwen = codingAgents.find(a => a.provider === 'alibaba');
            setWriterAgentId(qwen?.id || codingAgents[0].id);
        }
    }, [agents]);

    // Fetch file tree
    const refreshFileTree = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/files`);
            const data = await res.json();
            setFileTree(data.tree);
            setError(null); // Clear error on success
        } catch (e) {
            setError('⚠️ Backend non raggiungibile. Avvia il server con: npm run start-backend');
        }
    }, []);

    useEffect(() => {
        refreshFileTree();
    }, [refreshFileTree]);

    // Open file in tab
    const handleFileClick = async (path: string) => {
        const existing = tabs.find(t => t.path === path);
        if (existing) {
            setActiveTabId(existing.id);
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/files/${path}`);
            const data = await res.json();
            const newTab: EditorTab = {
                id: `tab-${Date.now()}`,
                path,
                name: path.split('/').pop() || path,
                content: data.content,
                isModified: false
            };
            setTabs(prev => [...prev, newTab]);
            setActiveTabId(newTab.id);
        } catch (e) {
            setError('Errore apertura file');
        } finally {
            setIsLoading(false);
        }
    };

    // Save file
    const handleSave = async () => {
        if (!activeTab) return;
        setIsLoading(true);
        try {
            await fetch(`${API_BASE}/files/${activeTab.path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: activeTab.content })
            });
            setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, isModified: false } : t));
        } catch (e) {
            setError('Errore salvataggio');
        } finally {
            setIsLoading(false);
        }
    };

    // Delete file/folder
    const handleDelete = async (path: string, isDir: boolean) => {
        if (!confirm(`Eliminare ${path}?`)) return;
        try {
            await fetch(`${API_BASE}/${isDir ? 'folders' : 'files'}/${path}`, { method: 'DELETE' });
            refreshFileTree();
            if (!isDir) setTabs(prev => prev.filter(t => t.path !== path));
        } catch (e) {
            setError('Errore eliminazione');
        }
    };

    // Close tab
    const handleCloseTab = (tabId: string) => {
        const tab = tabs.find(t => t.id === tabId);
        if (tab?.isModified && !confirm('Modifiche non salvate. Chiudere?')) return;

        setTabs(prev => {
            const newTabs = prev.filter(t => t.id !== tabId);
            if (tabId === activeTabId && newTabs.length > 0) {
                setActiveTabId(newTabs[0].id);
            } else if (newTabs.length === 0) {
                setActiveTabId(null);
            }
            return newTabs;
        });
    };

    // Create new file
    const handleCreateFile = async () => {
        const filePath = prompt('Nome del file (es. app.js, folder/file.html):');
        if (!filePath?.trim()) return;

        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/files/new`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: filePath.trim() })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Errore creazione');
            }
            await refreshFileTree();
            // Open the new file
            await handleFileClick(filePath.trim());
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Create new folder
    const handleCreateFolder = async () => {
        const folderPath = prompt('Nome della cartella (es. my-app, src/components):');
        if (!folderPath?.trim()) return;

        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/folders/new`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: folderPath.trim() })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Errore creazione');
            }
            await refreshFileTree();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Toggle agent selection
    const toggleAgent = (agentId: string) => {
        setSelectedAgents(prev =>
            prev.includes(agentId)
                ? prev.filter(id => id !== agentId)
                : [...prev, agentId]
        );
    };

    // Send user message
    const handleSendMessage = async () => {
        if (!userInput.trim()) return;

        const userMessage: Message = {
            id: generateId(),
            sender: 'user',
            text: userInput,
            agentName: 'Tu',
            timestamp: Date.now(),
            utilityScore: 0
        };

        setChatMessages(prev => [...prev, userMessage]);

        // Store context for when agents are triggered
        const context = activeTab
            ? `FILE: ${activeTab.name}\n\`\`\`\n${activeTab.content}\n\`\`\`\n\nRICHIESTA: ${userInput}`
            : `RICHIESTA: ${userInput}`;
        setLastUserContext(context);

        // 🆕 Salva messaggio in memoria per ogni agente selezionato (bidirezionale)
        if (onSaveToMemory && selectedAgents.length > 0) {
            const memoryText = `[Code Studio] ${userInput}${activeTab ? ` (File: ${activeTab.name})` : ''}`;
            for (const agentId of selectedAgents) {
                try {
                    await onSaveToMemory(agentId, memoryText);
                } catch (e) {
                    console.warn('[CodeStudio] Failed to save to memory for', agentId, e);
                }
            }
        }

        // Parse @mentions and trigger those agents
        const mentionPattern = /@(\w+)/gi;
        const mentions = [...userInput.matchAll(mentionPattern)];

        if (mentions.length > 0) {
            // Trigger mentioned agents
            for (const match of mentions) {
                const mentionedName = match[1].toLowerCase();
                const mentionedAgent = agents.find(a =>
                    a.name.toLowerCase() === mentionedName ||
                    a.name.toLowerCase().includes(mentionedName)
                );
                if (mentionedAgent && selectedAgents.includes(mentionedAgent.id)) {
                    setUserInput('');
                    await triggerAgentResponse(mentionedAgent.id, context);
                }
            }
        }

        setUserInput('');
    };

    // Trigger agent response
    const triggerAgentResponse = async (agentId: string, context?: string) => {
        const agent = agents.find(a => a.id === agentId);
        if (!agent || !apiKeys[agent.provider]) {
            setError(`Chiave API mancante per ${agent?.name || agentId}`);
            return;
        }

        setIsLoading(true);
        setCurrentSpeaker(agentId);

        try {
            const isWriter = agentId === writerAgentId;
            // Use passed context, or lastUserContext, or fallback
            const prompt = context || lastUserContext || `Analizza il codice e${isWriter ? ' proponi modifiche concrete' : ' dai la tua opinione'}. File: ${activeTab?.name}`;

            // Only pass last 6 messages to avoid error loops
            const recentMessages = chatMessages.slice(-6);

            const response = await getAiResponse(
                agent,
                recentMessages,
                prompt,
                activeTab ? { type: 'text', name: activeTab.name, content: activeTab.content } : null,
                apiKeys,
                'Normale',
                vectorDocuments[agent.id] || [], // 🆕 Memoria privata agente
                sharedDocuments['common-room'] || [] // 🆕 Memoria condivisa
            );

            const agentMessage: Message = {
                id: generateId(),
                sender: 'ai',
                text: response,
                agentName: agent.name,
                agentId: agent.id,
                timestamp: Date.now(),
                utilityScore: 0
            };

            setChatMessages(prev => [...prev, agentMessage]);

            // 🧠 Salva risposta AI in memoria (bidirezionale - l'agente ricorda le sue risposte)
            if (onSaveToMemory && response.length > 100) {
                try {
                    const memoryText = `[${agent.name} - Code Studio] ${response.substring(0, 500)}...`;
                    await onSaveToMemory(agent.id, memoryText);
                    console.log(`[CodeStudio] 🧠 Risposta ${agent.name} salvata in memoria`);
                } catch (e) {
                    console.warn('[CodeStudio] Failed to save AI response to memory:', e);
                }
            }

            // Execute Writer commands (vibe coding)
            if (isWriter) {
                await executeWriterCommands(response);
            }
        } catch (e: any) {
            setError(`Errore ${agent.name}: ${e.message}`);
        } finally {
            setIsLoading(false);
            setCurrentSpeaker(null);
        }
    };

    // Execute special commands from Writer (vibe coding)
    const executeWriterCommands = async (response: string) => {
        // Parse [CREA_FILE: path] commands
        const fileMatches = response.matchAll(/\[CREA_FILE:\s*([^\]]+)\]/gi);
        for (const match of fileMatches) {
            const filePath = match[1].trim();
            try {
                const res = await fetch(`${API_BASE}/files/new`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: filePath })
                });
                if (res.ok) {
                    setChatMessages(prev => [...prev, {
                        id: generateId(),
                        sender: 'ai',
                        text: `✅ Creato file: ${filePath}`,
                        agentName: 'Sistema',
                        timestamp: Date.now(),
                        utilityScore: 0
                    }]);
                    // Check if there's code for this file
                    const codePattern = new RegExp(`${filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?\`\`\`[\\w]*\\n([\\s\\S]*?)\`\`\``, 'i');
                    const codeMatch = response.match(codePattern);
                    if (codeMatch && codeMatch[1]) {
                        // Write code to the new file
                        await fetch(`${API_BASE}/files/${filePath}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ content: codeMatch[1].trim() })
                        });
                    }
                }
            } catch (e) {
                setError(`Errore creazione ${filePath}`);
            }
        }

        // Parse [CREA_CARTELLA: path] commands
        const folderMatches = response.matchAll(/\[CREA_CARTELLA:\s*([^\]]+)\]/gi);
        for (const match of folderMatches) {
            const folderPath = match[1].trim();
            try {
                const res = await fetch(`${API_BASE}/folders/new`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: folderPath })
                });
                if (res.ok) {
                    setChatMessages(prev => [...prev, {
                        id: generateId(),
                        sender: 'ai',
                        text: `📁 Creata cartella: ${folderPath}`,
                        agentName: 'Sistema',
                        timestamp: Date.now(),
                        utilityScore: 0
                    }]);
                }
            } catch (e) {
                setError(`Errore creazione cartella ${folderPath}`);
            }
        }

        // Refresh tree after commands
        await refreshFileTree();
    };

    // Apply code suggestion from Writer
    const handleApplyCode = (code: string) => {
        if (!activeTab) return;
        setTabs(prev => prev.map(t =>
            t.id === activeTabId
                ? { ...t, content: code, isModified: true }
                : t
        ));
    };

    return (
        <div className="fixed inset-0 bg-gray-900/95 z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    🕯️ Code Review Room
                    {isLoading && <span className="animate-pulse text-blue-400">●</span>}
                </h2>
                <div className="flex items-center gap-3">
                    {/* Agent Selector */}
                    <div className="flex gap-1">
                        {agents.filter(a => apiKeys[a.provider]).map(agent => (
                            <button
                                key={agent.id}
                                onClick={() => toggleAgent(agent.id)}
                                className={`px-2 py-1 text-xs rounded transition-all ${selectedAgents.includes(agent.id)
                                    ? agent.id === writerAgentId
                                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                                        : 'bg-cyan-600 text-white'
                                    : 'bg-gray-700 text-gray-400'
                                    }`}
                                title={agent.id === writerAgentId ? '✏️ Writer Agent' : 'Reviewer'}
                            >
                                {agent.id === writerAgentId && '✏️ '}
                                {agent.name}
                            </button>
                        ))}
                    </div>
                    <button onClick={onClose} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded">
                        ✕ Chiudi
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-900/50 text-red-200 px-4 py-2 text-sm flex justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)}>✕</button>
                </div>
            )}

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar - File Tree */}
                <div className="w-56 bg-gray-800 border-r border-gray-700 overflow-y-auto p-3">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold">📂 Files</h3>
                        <div className="flex gap-1">
                            <button
                                onClick={handleCreateFile}
                                className="p-1 hover:bg-gray-700 rounded text-xs"
                                title="Nuovo File"
                            >
                                📄+
                            </button>
                            <button
                                onClick={handleCreateFolder}
                                className="p-1 hover:bg-gray-700 rounded text-xs"
                                title="Nuova Cartella"
                            >
                                📁+
                            </button>
                        </div>
                    </div>
                    {fileTree ? (
                        <ul className="text-sm">
                            <TreeNode node={fileTree} onFileClick={handleFileClick} onDelete={handleDelete} />
                        </ul>
                    ) : (
                        <p className="text-gray-500 text-sm">Caricamento...</p>
                    )}
                </div>

                {/* Editor Area */}
                <div className="flex-1 flex flex-col border-r border-gray-700">
                    {/* Tab Bar */}
                    {tabs.length > 0 && (
                        <div className="flex gap-1 bg-gray-800 px-2 py-1 overflow-x-auto border-b border-gray-700">
                            {tabs.map(tab => (
                                <div
                                    key={tab.id}
                                    onClick={() => setActiveTabId(tab.id)}
                                    className={`flex items-center gap-2 px-3 py-1 rounded-t text-sm cursor-pointer ${tab.id === activeTabId ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400'
                                        }`}
                                >
                                    <span>{tab.name}{tab.isModified && ' •'}</span>
                                    <button onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.id); }} className="hover:text-red-400">×</button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Editor */}
                    <div className="flex-1 p-3 overflow-y-auto">
                        {activeTab ? (
                            <>
                                <textarea
                                    className="w-full h-full min-h-[300px] bg-gray-800 text-gray-100 font-mono text-sm p-3 rounded border border-gray-700 focus:border-blue-500 focus:outline-none resize-none"
                                    value={activeTab.content}
                                    onChange={(e) => {
                                        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, content: e.target.value, isModified: true } : t));
                                    }}
                                />
                                <div className="flex gap-2 mt-2">
                                    <button onClick={handleSave} disabled={isLoading} className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm disabled:opacity-50">
                                        💾 Salva
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="text-gray-500 text-center py-8">
                                👆 Seleziona un file
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Panel */}
                <div className="w-96 bg-gray-800 flex flex-col">
                    {/* Chat Header */}
                    <div className="p-3 border-b border-gray-700 flex justify-between items-start">
                        <div>
                            <h3 className="text-sm font-semibold">💬 Code Review Chat</h3>
                            <p className="text-xs text-gray-500 mt-1">
                                ✏️ Writer: {agents.find(a => a.id === writerAgentId)?.name || 'Nessuno'}
                            </p>
                        </div>
                        <button
                            onClick={() => { setChatMessages([]); setLastUserContext(''); }}
                            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                            title="Pulisci chat"
                        >
                            🗑️ Pulisci
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {chatMessages.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-4">
                                Scrivi un messaggio per iniziare la review
                            </p>
                        ) : (
                            chatMessages.map(msg => (
                                <div key={msg.id} className={`${msg.sender === 'user' ? 'ml-8' : 'mr-4'}`}>
                                    <div className={`rounded-lg p-3 ${msg.sender === 'user'
                                        ? 'bg-blue-600'
                                        : msg.agentId === writerAgentId
                                            ? 'bg-indigo-700 ring-1 ring-indigo-400'
                                            : 'bg-gray-700'
                                        }`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-semibold">
                                                {msg.agentId === writerAgentId && '✏️ '}
                                                {msg.agentName}
                                            </span>
                                            {currentSpeaker === msg.agentId && (
                                                <span className="animate-pulse text-blue-400">●</span>
                                            )}
                                        </div>
                                        <pre className="text-sm whitespace-pre-wrap">{msg.text}</pre>
                                        {/* Apply Code Button - Only for Writer with code blocks */}
                                        {msg.sender === 'ai' && msg.agentId === writerAgentId && msg.text.includes('```') && (
                                            <button
                                                onClick={() => {
                                                    // Extract code from markdown code block
                                                    const codeMatch = msg.text.match(/```[\w]*\n([\s\S]*?)```/);
                                                    if (codeMatch && codeMatch[1]) {
                                                        if (confirm('Vuoi sostituire il contenuto del file con questo codice?')) {
                                                            handleApplyCode(codeMatch[1].trim());
                                                        }
                                                    } else {
                                                        alert('Nessun blocco di codice trovato nel messaggio.');
                                                    }
                                                }}
                                                className="mt-2 px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-xs font-semibold flex items-center gap-1"
                                            >
                                                ✅ Applica Codice
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Agent Triggers */}
                    <div className="p-2 border-t border-gray-700 flex gap-1 overflow-x-auto">
                        {selectedAgents.map(agentId => {
                            const agent = agents.find(a => a.id === agentId);
                            return agent ? (
                                <button
                                    key={agentId}
                                    onClick={() => triggerAgentResponse(agentId)}
                                    disabled={isLoading}
                                    className={`px-2 py-1 text-xs rounded whitespace-nowrap disabled:opacity-50 ${agentId === writerAgentId
                                        ? 'bg-indigo-600 hover:bg-indigo-500'
                                        : 'bg-gray-700 hover:bg-gray-600'
                                        }`}
                                >
                                    {agentId === writerAgentId ? '✏️ ' : '💬 '}
                                    {agent.name}
                                </button>
                            ) : null;
                        })}
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-gray-700">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Chiedi una review..."
                                className="flex-1 bg-gray-700 px-3 py-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={isLoading || !userInput.trim()}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm disabled:opacity-50"
                            >
                                Invia
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CodeStudio;
