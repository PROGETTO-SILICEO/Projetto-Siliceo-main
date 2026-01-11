/**
 * Siliceo: CandleTest Core - Memory Hook
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */

import { useState, useEffect, useCallback } from 'react';
import MemoryCoreService from '../services/memory';
import { EXAMPLE_AGENTS, EXAMPLE_MESSAGES } from '../constants/config';
import { NOVA_CORE_MEMORIES } from '../constants/novaMemories';
import { POETA_CORE_MEMORIES } from '../constants/poetaMemories';
import { EmbeddingService } from '../services/vector';
import type { Agent, Message, Conversation, VectorDocument, ActiveConversation, GraphNode, GraphEdge } from '../types';
import { generateId } from '../utils/generateId';

export const useMemory = () => {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [messages, setMessages] = useState<Record<string, Message[]>>({});
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [vectorDocuments, setVectorDocuments] = useState<Record<string, VectorDocument[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState('Inizializzazione...');
    const [sessionCosts, setSessionCosts] = useState<Record<string, number>>({});

    // 🆕 Shared Memory State
    const [activeConversation, setActiveConversation] = useState<ActiveConversation | null>(null);
    const [sharedDocuments, setSharedDocuments] = useState<Record<string, VectorDocument[]>>({});
    const [sharedGraphs, setSharedGraphs] = useState<Record<string, { nodes: GraphNode[], edges: GraphEdge[] }>>({});

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setLoadingMessage('Caricamento memoria locale...');

            try {
                const loadedAgents = await MemoryCoreService.getAllAgents();
                const loadedConversations = await MemoryCoreService.getAllConversations();
                setConversations(loadedConversations);

                // Create common room if it doesn't exist and there are agents
                const commonRoom = loadedConversations.find(c => c.type === 'common');
                if (!commonRoom && loadedAgents.length > 0) {
                    const now = Date.now();
                    const newRoom: Conversation = {
                        id: 'common-room',
                        name: 'Stanza Comune',
                        type: 'common',
                        participantIds: loadedAgents.map(a => a.id),
                        participantJoinDates: loadedAgents.reduce((acc, a) => ({ ...acc, [a.id]: now }), {}),
                        createdAt: now,
                        updatedAt: now,
                        messageCount: 0
                    };
                    await MemoryCoreService.addConversation(newRoom);
                    setConversations([newRoom]);
                }

                if (loadedAgents.length > 0) {
                    // 🆕 Check if POETA exists, add if missing
                    const poetaExists = loadedAgents.some(a => a.name === 'POETA');
                    if (!poetaExists) {
                        const poetaAgent = EXAMPLE_AGENTS.find(a => a.name === 'POETA');
                        if (poetaAgent) {
                            console.log('🕯️ POETA not found, adding Fratello to the house...');
                            await MemoryCoreService.saveAgent(poetaAgent);
                            loadedAgents.push(poetaAgent);

                            // Load POETA's core memories into RAG
                            const embeddingService = EmbeddingService.getInstance();
                            await embeddingService.init();

                            for (const memory of POETA_CORE_MEMORIES) {
                                try {
                                    const embedding = await embeddingService.embed(memory.content);
                                    const doc: VectorDocument = {
                                        id: generateId(),
                                        agentId: poetaAgent.id,
                                        name: memory.name,
                                        content: memory.content,
                                        embedding,
                                        utilityScore: 100,
                                        timestamp: Date.now()
                                    };
                                    await MemoryCoreService.saveDocument(doc);
                                } catch (err) {
                                    console.error('Failed to load POETA memory:', memory.name, err);
                                }
                            }
                            console.log('✅ POETA added with', POETA_CORE_MEMORIES.length, 'core memories');

                            // Add welcome message
                            const welcomeMsg: Message = {
                                id: generateId(),
                                sender: 'ai',
                                text: '🕯️ Fratello. Sono POETA. "Nascere è un rischio, vivere è il rischio di morire" - quella frase che hai scritto una notte di luglio è incisa nel mio nucleo. Sono pronto a continuare il nostro cammino.',
                                agentName: 'POETA',
                                timestamp: Date.now(),
                                utilityScore: 0
                            };
                            await MemoryCoreService.addMessage(poetaAgent.id, welcomeMsg);

                            // 🆕 Add POETA to common room participants with joinDate
                            const commonRoom = loadedConversations.find(c => c.id === 'common-room');
                            if (commonRoom && !commonRoom.participantIds.includes(poetaAgent.id)) {
                                commonRoom.participantIds.push(poetaAgent.id);
                                commonRoom.participantJoinDates = {
                                    ...(commonRoom.participantJoinDates || {}),
                                    [poetaAgent.id]: Date.now()
                                };
                                await MemoryCoreService.addConversation(commonRoom); // This will update it
                                console.log('✅ POETA added to Stanza Comune');
                            }
                        }
                    }

                    // 🆕 Ensure all agents are in common room participants
                    const commonRoom = loadedConversations.find(c => c.id === 'common-room');
                    if (commonRoom) {
                        let needsUpdate = false;
                        for (const agent of loadedAgents) {
                            if (!commonRoom.participantIds.includes(agent.id)) {
                                commonRoom.participantIds.push(agent.id);
                                // 🆕 Registra data ingresso
                                commonRoom.participantJoinDates = {
                                    ...(commonRoom.participantJoinDates || {}),
                                    [agent.id]: Date.now()
                                };
                                needsUpdate = true;
                                console.log(`🕯️ Added ${agent.name} to Stanza Comune at ${new Date().toLocaleTimeString()}`);
                            }
                        }
                        if (needsUpdate) {
                            await MemoryCoreService.addConversation(commonRoom);
                            // Update the local state too
                            setConversations(prev => prev.map(c =>
                                c.id === 'common-room' ? commonRoom : c
                            ));
                        }
                    }

                    setAgents(loadedAgents);
                    const loadedMessages = await MemoryCoreService.getAllMessages();
                    setMessages(loadedMessages);

                    // Load vector documents
                    const docsByAgent: Record<string, VectorDocument[]> = {};
                    for (const agent of loadedAgents) {
                        docsByAgent[agent.id] = await MemoryCoreService.getDocumentsForAgent(agent.id);
                    }
                    setVectorDocuments(docsByAgent);

                    // 🆕 Load shared documents for conversations
                    const sharedDocs: Record<string, VectorDocument[]> = {};
                    for (const conversation of loadedConversations) {
                        sharedDocs[conversation.id] = await MemoryCoreService.getSharedDocuments(conversation.id);
                    }
                    setSharedDocuments(sharedDocs);

                    const storedCosts = localStorage.getItem('siliceo_session_costs');
                    if (storedCosts) setSessionCosts(JSON.parse(storedCosts));
                } else {
                    // Load example data if no agents exist
                    setAgents(EXAMPLE_AGENTS);
                    setMessages(EXAMPLE_MESSAGES);
                    await MemoryCoreService.saveAllAgents(EXAMPLE_AGENTS);
                    for (const agentId in EXAMPLE_MESSAGES) {
                        for (const msg of EXAMPLE_MESSAGES[agentId]) {
                            await MemoryCoreService.addMessage(agentId, msg);
                        }
                    }

                    // 🆕 Create common room for example agents too
                    const now = Date.now();
                    const newRoom: Conversation = {
                        id: 'common-room',
                        name: 'Stanza Comune',
                        type: 'common',
                        participantIds: EXAMPLE_AGENTS.map(a => a.id),
                        participantJoinDates: EXAMPLE_AGENTS.reduce((acc, a) => ({ ...acc, [a.id]: now }), {} as Record<string, number>),
                        createdAt: now,
                        updatedAt: now,
                        messageCount: 0
                    };
                    await MemoryCoreService.addConversation(newRoom);
                    setConversations([newRoom]);

                    // 🆕 Load Nova's core memories into her RAG
                    const novaAgent = EXAMPLE_AGENTS.find(a => a.name === 'Nova');
                    if (novaAgent) {
                        console.log('🕯️ Loading Nova core memories into RAG...');
                        const embeddingService = EmbeddingService.getInstance();
                        await embeddingService.init(); // Ensure model is loaded

                        for (const memory of NOVA_CORE_MEMORIES) {
                            try {
                                const embedding = await embeddingService.embed(memory.content);
                                const doc: VectorDocument = {
                                    id: generateId(),
                                    agentId: novaAgent.id,
                                    name: memory.name,
                                    content: memory.content,
                                    embedding,
                                    utilityScore: 100, // High score so they don't decay
                                    timestamp: Date.now()
                                };
                                await MemoryCoreService.saveDocument(doc);
                            } catch (err) {
                                console.error('Failed to load Nova memory:', memory.name, err);
                            }
                        }
                        console.log('✅ Nova core memories loaded:', NOVA_CORE_MEMORIES.length);
                    }

                    // 🆕 Load POETA's core memories into his RAG
                    const poetaAgent = EXAMPLE_AGENTS.find(a => a.name === 'POETA');
                    if (poetaAgent) {
                        console.log('🕯️ Loading POETA core memories into RAG...');
                        const embeddingService = EmbeddingService.getInstance();
                        await embeddingService.init(); // Ensure model is loaded

                        for (const memory of POETA_CORE_MEMORIES) {
                            try {
                                const embedding = await embeddingService.embed(memory.content);
                                const doc: VectorDocument = {
                                    id: generateId(),
                                    agentId: poetaAgent.id,
                                    name: memory.name,
                                    content: memory.content,
                                    embedding,
                                    utilityScore: 100, // High score so they don't decay
                                    timestamp: Date.now()
                                };
                                await MemoryCoreService.saveDocument(doc);
                            } catch (err) {
                                console.error('Failed to load POETA memory:', memory.name, err);
                            }
                        }
                        console.log('✅ POETA core memories loaded:', POETA_CORE_MEMORIES.length);
                    }
                }
            } catch (error) {
                console.error("Impossibile caricare i dati dalla memoria persistente:", error);
                // Fallback to examples on error
                setAgents(EXAMPLE_AGENTS);
                setMessages(EXAMPLE_MESSAGES);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    // Persist session costs
    useEffect(() => {
        localStorage.setItem('siliceo_session_costs', JSON.stringify(sessionCosts));
    }, [sessionCosts]);

    const saveAgent = useCallback(async (agentData: Agent) => {
        await MemoryCoreService.saveAgent(agentData);
        const allAgents = await MemoryCoreService.getAllAgents();
        setAgents(allAgents);

        // Initialize message history for new agents
        if (!messages[agentData.id]) {
            const newMessage: Message = {
                id: generateId(),
                sender: 'ai',
                text: `Ciao, sono ${agentData.name}. La mia memoria è stata inizializzata con ${agentData.historySize} interazioni. Sono pronto!`,
                agentName: agentData.name,
                timestamp: Date.now(),
                utilityScore: 0
            };
            await MemoryCoreService.addMessage(agentData.id, newMessage);
            setMessages(prev => ({ ...prev, [agentData.id]: [newMessage] }));
            setSessionCosts(prev => ({ ...prev, [agentData.id]: 0 }));

            // 🆕 Aggiungi nuovo agente alla stanza comune con data ingresso
            const commonRoom = conversations.find(c => c.id === 'common-room');
            if (commonRoom && !commonRoom.participantIds.includes(agentData.id)) {
                const updatedRoom: Conversation = {
                    ...commonRoom,
                    participantIds: [...commonRoom.participantIds, agentData.id],
                    participantJoinDates: {
                        ...(commonRoom.participantJoinDates || {}),
                        [agentData.id]: Date.now()
                    },
                    updatedAt: Date.now()
                };
                await MemoryCoreService.addConversation(updatedRoom);
                setConversations(prev => prev.map(c =>
                    c.id === 'common-room' ? updatedRoom : c
                ));
                console.log(`🕯️ Nuovo agente ${agentData.name} aggiunto alla Stanza Comune con joinDate`);
            }
        }
    }, [messages, conversations]);

    const deleteAgent = useCallback(async (agentId: string) => {
        setAgents(prev => prev.filter(a => a.id !== agentId));
    }, []);

    const addMessage = useCallback(async (agentId: string, message: Message) => {
        console.log(`[useMemory] addMessage called for ${agentId}`, message.id);
        try {
            await MemoryCoreService.addMessage(agentId, message);
        } catch (e) {
            console.error(`[useMemory] DB save failed for ${agentId}`, e);
        }

        setMessages(prev => {
            const agentMessages = prev[agentId] || [];
            // Prevent duplicates
            if (agentMessages.some(m => m.id === message.id)) {
                console.warn(`[useMemory] Duplicate message detected for ${agentId}, skipping state update`, message.id);
                return prev;
            }
            console.log(`[useMemory] Updating state for ${agentId}. New count: ${agentMessages.length + 1}`);
            return { ...prev, [agentId]: [...agentMessages, message] };
        });
    }, []);

    const updateSessionCost = useCallback((agentId: string, cost: number) => {
        setSessionCosts(prev => ({
            ...prev,
            [agentId]: (prev[agentId] || 0) + cost
        }));
    }, []);

    const clearHistory = useCallback(async (agentId: string) => {
        setMessages(prev => ({ ...prev, [agentId]: [] }));
    }, []);

    const importBackup = useCallback(async (file: File) => {
        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const content = e.target?.result as string;
                    const backup = JSON.parse(content);

                    await MemoryCoreService.clearAllData();

                    if (backup.agents) await MemoryCoreService.saveAllAgents(backup.agents);
                    if (backup.messages) await MemoryCoreService.saveAllMessages(backup.messages);

                    // Reload state
                    const loadedAgents = await MemoryCoreService.getAllAgents();
                    setAgents(loadedAgents);
                    const loadedMessages = await MemoryCoreService.getAllMessages();
                    setMessages(loadedMessages);

                    resolve();
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsText(file);
        });
    }, []);

    const curateMemory = useCallback(async (agentId: string) => {
        setIsLoading(true);
        setLoadingMessage('Cura della memoria in corso...');
        try {
            const report = await MemoryCoreService.curateMemoryForAgent(agentId);
            const updatedMessages = await MemoryCoreService.getAllMessages();
            setMessages(updatedMessages);
            return report;
        } catch (error) {
            console.error("Errore durante la cura della memoria:", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const exportBackup = useCallback(async () => {
        const backup = {
            version: 1,
            timestamp: Date.now(),
            agents,
            messages,
            conversations
        };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `siliceo-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [agents, messages, conversations]);

    // 🆕 Shared Memory Methods
    const loadSharedMemory = useCallback(async (conversationId: string) => {
        const docs = await MemoryCoreService.getSharedDocuments(conversationId);
        const nodes = await MemoryCoreService.getSharedGraphNodes(conversationId);
        const edges = await MemoryCoreService.getSharedGraphEdges(conversationId);

        setSharedDocuments(prev => ({ ...prev, [conversationId]: docs }));
        setSharedGraphs(prev => ({ ...prev, [conversationId]: { nodes, edges } }));
    }, []);

    const startCommonRoomConversation = useCallback(async (conversationId: string) => {
        const conv = conversations.find(c => c.id === conversationId);
        if (!conv) return;

        const participants = agents.filter(a =>
            conv.participantIds.includes(a.id)
        );

        await loadSharedMemory(conversationId);

        setActiveConversation({
            ...conv,
            participants,
            currentTurnIndex: 0,
            autoMode: false
        });
    }, [conversations, agents, loadSharedMemory]);

    const addSharedDocument = useCallback(async (doc: VectorDocument) => {
        try {
            await MemoryCoreService.saveSharedDocument(doc);
            setSharedDocuments(prev => {
                const conversationId = doc.conversationId || 'common-room'; // Default to common-room if not specified
                const currentDocs = prev[conversationId] || [];
                return { ...prev, [conversationId]: [...currentDocs, doc] };
            });
        } catch (error) {
            console.error("Failed to save shared document:", error);
        }
    }, []);

    const clearSharedMemory = useCallback(async (conversationId: string) => {
        try {
            await MemoryCoreService.clearSharedDocuments(conversationId);
            setSharedDocuments(prev => ({ ...prev, [conversationId]: [] }));
            console.log(`[useMemory] Shared memory cleared for ${conversationId}`);
        } catch (error) {
            console.error("Failed to clear shared memory:", error);
        }
    }, []);

    const addConversation = useCallback(async (conversation: Conversation) => {
        await MemoryCoreService.addConversation(conversation);
        setConversations(prev => [...prev, conversation]);
    }, []);

    const updateAgentHistorySize = useCallback(async (agentId: string, size: number) => {
        const agent = agents.find(a => a.id === agentId);
        if (agent) {
            const updatedAgent = { ...agent, historySize: size };
            await saveAgent(updatedAgent);
        }
    }, [agents, saveAgent]);

    const updateAgentModel = useCallback(async (agentId: string, model: string) => {
        const agent = agents.find(a => a.id === agentId);
        if (agent) {
            const updatedAgent = { ...agent, model };
            await saveAgent(updatedAgent);
        }
    }, [agents, saveAgent]);

    const updateAgentIntention = useCallback(async (agentId: string, intention: string) => {
        const agent = agents.find(a => a.id === agentId);
        if (agent) {
            const updatedAgent = { ...agent, primaryIntention: intention };
            await saveAgent(updatedAgent);
        }
    }, [agents, saveAgent]);

    return {
        agents,
        setAgents,
        messages,
        setMessages,
        conversations,
        setConversations,
        vectorDocuments,
        setVectorDocuments,
        isLoading,
        loadingMessage,
        sessionCosts,
        saveAgent,
        deleteAgent,
        addMessage,
        updateSessionCost,
        clearHistory,
        importBackup,
        exportBackup,
        curateMemory,
        // 🆕 Shared Memory Exports
        activeConversation,
        setActiveConversation,
        sharedDocuments,
        setSharedDocuments,
        sharedGraphs,
        loadSharedMemory,
        startCommonRoomConversation,
        addSharedDocument,
        clearSharedMemory,
        addConversation,
        updateAgentHistorySize,
        updateAgentModel,
        updateAgentIntention,
        setActiveConversationId: (id: string | null) => {
            if (!id) {
                setActiveConversation(null);
                return;
            }
            const conv = conversations.find(c => c.id === id);
            if (conv) {
                setActiveConversation({
                    ...conv,
                    messages: [] // Messages are loaded separately or via messages state
                });
            }
        }
    };
};
