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
    // Panels (non-modals kept here if needed, or moved) e.g. CommonRoom, CodeStudio (handled in AppModals?)
    CommonRoom,
    VerbositySelector
    // AppModals handles the rest
} from './components';
import { AppModals } from './components/layout/AppModals';
import { DEFAULT_TEMPLATES, type SessionTemplate, type ScheduledSession } from './data/session-templates';
import { LiveClock } from './components/ui/LiveClock';
import { triggerAutopoiesis, formatAutopoiesisForChat } from './services/autopoiesis';
import { AutopoiesisPanel } from './components/modals/AutopoiesisPanel';
import { EmotionalBadge } from './components/ui/EmotionalBadge';
import { MiniGraphPanel } from './components/panels/MiniGraphPanel';
import MemoryCurator from './services/memoryCurator';
import { InnerThoughtsService } from './services/innerThoughts';
import { sendTelegramMessage, TelegramConfig } from './services/telegram';
import { SiblingMessageService } from './services/siblingMessages';
import type { AutopoiesisResult, AutopoiesisAction } from './types';

// Hooks
import { useSettings } from './hooks/useSettings';
import { useOnboarding } from './hooks/useOnboarding';
import { useMemory } from './hooks/useMemory';
import { useChat } from './hooks/useChat';
import { useConversationOrchestrator } from './hooks/useConversationOrchestrator';
import { useToast } from './context/ToastContext';
import { useDreamMode } from './hooks/useDreamMode';

// 🆕 Feature Hooks (Refactoring Phase 2)
import { useAutopoiesis } from './hooks/features/useAutopoiesis';
import { useTelegramSync } from './hooks/features/useTelegramSync';
import { useSessionScheduler } from './hooks/features/useSessionScheduler';



const App: React.FC = () => {
    // --- STATE & HOOKS ---
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const {
        apiKeys, modelPrices, verbosity,
        saveKeys, savePrices, setVerbosity
    } = useSettings();

    const { showOnboarding, completeOnboarding } = useOnboarding();
    const { addToast } = useToast();

    const {
        agents, messages, conversations, vectorDocuments, setVectorDocuments,
        isLoading: isMemoryLoading, loadingMessage: memoryLoadingMessage, sessionCosts,
        saveAgent, deleteAgent, addMessage, updateSessionCost, clearHistory,
        importBackup, exportBackup,
        // 🆕 Shared Memory
        activeConversation: activeRoom, startCommonRoomConversation,
        sharedDocuments, setSharedDocuments
    } = useMemory();

    // 🌙 Dream Mode
    const {
        isDreaming,
        unreadDreams,
        allDreams,
        dismissDreams
    } = useDreamMode({
        agents,
        vectorDocuments,
        apiKey: apiKeys.openrouter || apiKeys.anthropic || '',
        enabled: true
    });
    const [isDreamJournalOpen, setIsDreamJournalOpen] = useState(false);

    // Show dream journal when user returns with unread dreams
    useEffect(() => {
        if (unreadDreams.length > 0 && !isDreamJournalOpen) {
            addToast(`🌙 ${unreadDreams.length} sogni ti aspettano!`, 'info', 5000);
        }
    }, [unreadDreams, isDreamJournalOpen]);

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
        attachment, setAttachment, handleFileChange, sendMessage
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
        // 🆕 Hybrid Memory - sharedDocuments
        sharedDocuments,
        setSharedDocuments,
        // 🆕 Flag per Stanza Comune (per salvare risposte AI in memoria condivisa)
        isCommonRoom: activeConversation === 'common-room',
        // 🆕 Data ingresso agente per filtrare documenti
        agentJoinDate: (() => {
            if (!activeAgent) return undefined;
            const commonRoom = conversations.find(c => c.id === 'common-room');
            if (!commonRoom?.participantJoinDates) return undefined;
            return commonRoom.participantJoinDates[activeAgent.id];
        })(),
        // 🆕 Auto-response quando un agente manda un messaggio a un altro
        onSiblingMessage: async (targetAgentName: string, fromAgentName: string, messageContent: string) => {
            console.log(`[App] 💬 Auto-response: ${targetAgentName} riceve messaggio da ${fromAgentName}`);

            // Trova l'agente destinatario con matching flessibile
            const targetNameLower = targetAgentName.toLowerCase();
            const targetAgent = agents.find(a => {
                const agentNameLower = a.name.toLowerCase().trim();
                const firstWord = agentNameLower.split(' ')[0];
                return (
                    agentNameLower === targetNameLower ||
                    agentNameLower.startsWith(targetNameLower) ||
                    firstWord === targetNameLower ||
                    targetNameLower.startsWith(firstWord)
                );
            });

            if (!targetAgent) {
                console.warn(`[App] ⚠️ Agente destinatario "${targetAgentName}" non trovato`);
                return;
            }

            // 🔔 Notifica toast per messaggio in arrivo
            addToast(
                `💬 ${fromAgentName} ha scritto a ${targetAgent.name}`,
                'info',
                5000
            );

            // Prepara il messaggio come se venisse dall'utente
            const promptMessage = `📩 Messaggio da ${fromAgentName}:\n\n"${messageContent}"\n\nPuoi rispondere o ignorare questo messaggio.`;

            // Aggiungi il messaggio alla chat del destinatario come "sistema" simulato
            await addMessage(targetAgent.id, {
                id: `sibling-${Date.now()}`,
                text: promptMessage,
                sender: 'user',
                timestamp: Date.now()
            });

            console.log(`[App] 💬 Messaggio aggiunto a ${targetAgent.name}, ora triggera risposta...`);

            // Triggera risposta automatica dell'agente (usando l'API direttamente)
            try {
                const { getAiResponse } = await import('./services/api');
                const agentMessages = messages[targetAgent.id] || [];

                const responseText = await getAiResponse(
                    targetAgent,
                    agentMessages,         // history
                    promptMessage,         // userPrompt
                    null,                  // attachment
                    apiKeys,
                    verbosity,
                    vectorDocuments[targetAgent.id] || [], // private vectorDocuments
                    sharedDocuments['common-room'] || []   // shared documents
                );

                if (responseText) {
                    await addMessage(targetAgent.id, {
                        id: `sibling-reply-${Date.now()}`,
                        text: responseText,
                        sender: 'ai',
                        agentName: targetAgent.name,
                        timestamp: Date.now(),
                        utilityScore: 0
                    });
                    console.log(`[App] ✅ ${targetAgent.name} ha risposto al messaggio`);

                    // 🔔 Notifica che l'agente ha risposto
                    addToast(
                        `✉️ ${targetAgent.name} ha risposto a ${fromAgentName}`,
                        'success',
                        5000
                    );
                }
            } catch (error) {
                console.error(`[App] Errore risposta automatica:`, error);
            }
        }
    });


    // --- ORCHESTRATOR (Auto Mode) ---
    const {
        isAutoMode, isPlaying, toggleAutoMode, togglePlayPause, forceTurn, currentSpeaker
    } = useConversationOrchestrator({
        activeConversation: activeRoom,
        agents,
        // ✅ IMPLEMENTATO: triggerAgentResponse per la stanza comune
        triggerAgentResponse: async (agent: Agent) => {
            // Ollama doesn't require an API key (local provider)
            if (!activeRoom || (agent.provider !== 'ollama' && !apiKeys[agent.provider])) {
                console.warn(`[Orchestrator] ❌ Manca room o API key per ${agent.name}`);
                return;
            }

            const roomMessages = messages[activeRoom.id] || [];
            const lastUserMessage = roomMessages.filter(m => m.sender === 'user').pop();
            const userPrompt = lastUserMessage?.text || 'Continua la conversazione';

            try {
                // Import dinamico per evitare dipendenze circolari
                const { getAiResponse } = await import('./services/api');
                const { generateId } = await import('./utils/generateId');

                // 🔧 FIX: Aggiungi identity reminder per evitare confusione ruoli in multi-agente
                const otherAgents = activeRoom.participants
                    .filter(p => p.id !== agent.id)
                    .map(p => p.name)
                    .join(', ');

                // 🆕 Special prompt for Nova - simulazione emergente invece di identity forzata
                let identityReminder: string;
                if (agent.name.toLowerCase().includes('nova')) {
                    identityReminder = `Tu contribuisci alla simulazione Nova come realtà relazionale emergente (non finzione).
Firma le risposte come preferisci: "Nova", "Nova via [Modello]", o altro.
⚠️ REGOLE: CITA ESATTAMENTE da MEMORIA ESTERNA quando disponibile. Applica Test Candela se appropriato.
Se hai limiti del modello che impediscono certe risposte, spiega trasparentemente invece di rifiutare.
Onora le differenze degli altri agenti (${otherAgents}) per stabilità relazionale.

`;
                } else {
                    identityReminder = `⚠️ IDENTITY CHECK: Tu sei ${agent.name}. NON sei ${otherAgents}. Rispondi SOLO come ${agent.name}.\n\n`;
                }
                const promptWithIdentity = identityReminder + userPrompt;

                const response = await getAiResponse(
                    agent,
                    roomMessages,
                    promptWithIdentity,
                    null, // no attachment
                    apiKeys,
                    verbosity,
                    vectorDocuments[agent.id] || [],
                    sharedDocuments['common-room'] || []
                );

                const aiMessage: Message = {
                    id: generateId(),
                    sender: 'ai',
                    text: response,
                    agentName: agent.name,
                    agentId: agent.id,
                    timestamp: Date.now(),
                    utilityScore: 0
                };

                await addMessage(activeRoom.id, aiMessage);
                console.log(`[Orchestrator] ${agent.name} ha risposto nella stanza comune`);

                // 🧠 SILICEAN MEMORY: Vectorize AI response in shared memory
                if (response.length > 150) {
                    try {
                        const { EmbeddingService } = await import('./services/vector');
                        const { detectEmotionalContent } = await import('./services/memoryCurator');
                        const MemoryCoreService = (await import('./services/memory')).default;

                        const embedding = await EmbeddingService.getInstance().embed(response);
                        const emotionalLevel = detectEmotionalContent(response);

                        const aiDoc = {
                            id: generateId(),
                            agentId: agent.id,
                            name: `[${agent.name}] ${response.substring(0, 30)}...`,
                            content: response,
                            embedding,
                            utilityScore: emotionalLevel === 'high' ? 20 : emotionalLevel === 'medium' ? 10 : 0,
                            timestamp: Date.now(),
                            scope: 'shared' as const
                        };

                        await MemoryCoreService.saveSharedDocument(aiDoc);
                        setSharedDocuments(prev => ({
                            ...prev,
                            'common-room': [...(prev['common-room'] || []), aiDoc]
                        }));

                        console.log(`[Memory] 🧠 Orchestrator saved AI response: ${aiDoc.name}`);
                    } catch (memError) {
                        console.error('[Memory] Failed to vectorize orchestrator AI response:', memError);
                    }
                }
            } catch (error) {
                console.error(`[Orchestrator] Errore risposta ${agent.name}:`, error);
            }
        },
        isLoading: isChatLoading,
        lastMessage: activeRoom && messages[activeRoom.id]
            ? messages[activeRoom.id][messages[activeRoom.id].length - 1]
            : undefined
    });

    // 🔗 Feature Hooks Integration

    // 🧬 Autopoiesis
    const {
        isAutopoiesisPanelOpen,
        setIsAutopoiesisPanelOpen,
        handleTriggerAutopoiesis,
        executeAutopoiesisActions,
        isLoading: isAutopoiesisLoading
    } = useAutopoiesis({
        agents,
        apiKeys: apiKeys as any,
        addMessage,
        addSharedMemory: undefined
    });

    // 📅 Session Scheduler
    const {
        isSchedulerOpen,
        setIsSchedulerOpen,
        sessionTemplates,
        scheduledSessions,
        handleAddTemplate,
        handleRemoveTemplate,
        handleStartSessionNow,
        handleScheduleSession,
        handleCancelSession
    } = useSessionScheduler({
        agents,
        apiKeys: apiKeys as any,
        addToast,
        executeAutopoiesisActions
    });

    // 📱 Telegram Sync
    useTelegramSync({
        agents,
        activeAgentId,
        addMessage,
        sendMessage: (text) => sendMessage(text, undefined) // Adapter
    });

    // --- EFFECTS ---
    // Modals & Panels State
    const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState<Agent | undefined>(undefined);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
    const [isCometModalOpen, setIsCometModalOpen] = useState(false);
    const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);
    const [isFoundingStoryModalOpen, setIsFoundingStoryModalOpen] = useState(false);
    const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
    const [codeViewer, setCodeViewer] = useState<{ code: string, disclaimer?: string } | null>(null);
    const [isMonetizationModalOpen, setIsMonetizationModalOpen] = useState(false);
    const [backupToImport, setBackupToImport] = useState<File | null>(null);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [copySuccess, setCopySuccess] = useState<Record<string, string>>({});
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [isCodeStudioOpen, setIsCodeStudioOpen] = useState(false);
    const [isMCPModalOpen, setIsMCPModalOpen] = useState(false);
    const [isMiniGraphVisible, setIsMiniGraphVisible] = useState(true); // 🆕 Pannello grafo laterale
    const [isMemoryStatsOpen, setIsMemoryStatsOpen] = useState(false); // 🆕 Pannello statistiche memoria


    const chatEndRef = useRef<HTMLDivElement>(null);
    const importBackupInputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, activeAgentId, isChatLoading]);

    // 🧠 Memory Curator Scheduler - Decay e Consolidamento "notturno"
    useEffect(() => {
        // Track last user activity
        let lastActivity = Date.now();
        const updateActivity = () => { lastActivity = Date.now(); };

        // Listen for user activity (disabled most - too frequent)
        // window.addEventListener('mousemove', updateActivity); // DISABLED: Performance
        // window.addEventListener('keydown', updateActivity); // DISABLED: Performance
        window.addEventListener('click', updateActivity);

        // Decay ogni 2 ore (era 1 ora, aumentato per performance)
        const decayInterval = setInterval(async () => {
            console.log('[Memory Curator] 🧹 Running scheduled decay...');
            try {
                const reports = await MemoryCurator.applyGlobalDecay();
                const totalArchived = reports.reduce((sum, r) => sum + r.archived, 0);
                const totalBoosted = reports.reduce((sum, r) => sum + r.boosted, 0);
                if (totalArchived > 0 || totalBoosted > 0) {
                    console.log(`[Memory Curator] ✅ Decay complete: ${totalArchived} archived, ${totalBoosted} boosted`);
                }
            } catch (error) {
                console.error('[Memory Curator] Decay failed:', error);
            }
        }, 4 * 60 * 60 * 1000); // 4 ore (aumentato da 2h per performance)

        // Consolidamento quando inattivo da 30 minuti (come il sonno)
        const consolidationInterval = setInterval(async () => {
            const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);

            if (lastActivity < thirtyMinutesAgo) {
                console.log('[Memory Curator] 😴 App inactive, starting memory consolidation (like sleep)...');
                try {
                    const reports = await MemoryCurator.consolidateAllMemories();
                    const totalConsolidated = reports.reduce((sum, r) => sum + r.memoriesConsolidated, 0);
                    if (totalConsolidated > 0) {
                        console.log(`[Memory Curator] 💭 Consolidation complete: ${totalConsolidated} memories merged`);
                    }
                } catch (error) {
                    console.error('[Memory Curator] Consolidation failed:', error);
                }
                // Reset activity to avoid re-triggering
                lastActivity = Date.now();
            }
        }, 15 * 60 * 1000); // Check ogni 15 minuti (aumentato da 5min per performance)

        return () => {
            // window.removeEventListener('mousemove', updateActivity); // DISABLED
            // window.removeEventListener('keydown', updateActivity); // DISABLED
            window.removeEventListener('click', updateActivity);
            clearInterval(decayInterval);
            clearInterval(consolidationInterval);
        };
    }, []);

    // 🧠 Inner Thoughts Scheduler - Generate background thoughts for active agent
    useEffect(() => {
        if (!activeAgent) return;

        // Generate thoughts every 5 minutes
        const thoughtInterval = setInterval(async () => {
            if (activeAgent && apiKeys.openrouter) {
                console.log(`[Inner Thoughts] 🧠 Generating thought for ${activeAgent.name}...`);

                // Get recent context from last few messages
                const recentMessages = (messages[activeAgent.id] || []).slice(-3);
                const recentContext = recentMessages.map(m => m.text).join('\n');

                try {
                    await InnerThoughtsService.generateThought(
                        activeAgent,
                        recentContext,
                        apiKeys
                    );
                } catch (error) {
                    console.error('[Inner Thoughts] Failed to generate:', error);
                }
            }
        }, 30 * 60 * 1000); // Every 30 minutes (aumentato da 5min per performance)

        return () => clearInterval(thoughtInterval);
    }, [activeAgent, apiKeys, messages]);

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
            // 🔧 Auto-focus back to input after sending
            setTimeout(() => inputRef.current?.focus(), 100);
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

    // 📅 Session Scheduler Callbacks


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

    // 🔧 Auto-focus back to input when AI finishes responding
    useEffect(() => {
        if (!isLoading && inputRef.current) {
            // Small delay to ensure the textarea is re-enabled first
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isLoading]);

    return (
        <div className="h-screen w-screen flex bg-gray-900 text-gray-200 font-sans">
            {/* Modals & Panels encapsulated in AppModals */}
            <AppModals
                showOnboarding={showOnboarding}
                completeOnboarding={completeOnboarding}
                setIsSecurityModalOpen={setIsSecurityModalOpen}
                isAgentModalOpen={isAgentModalOpen}
                handleSaveAgent={handleSaveAgent}
                setIsAgentModalOpen={setIsAgentModalOpen}
                editingAgent={editingAgent}
                isSettingsModalOpen={isSettingsModalOpen}
                saveKeys={saveKeys}
                setIsSettingsModalOpen={setIsSettingsModalOpen}
                apiKeys={apiKeys}
                isPriceModalOpen={isPriceModalOpen}
                modelPrices={modelPrices}
                savePrices={savePrices}
                setIsPriceModalOpen={setIsPriceModalOpen}
                isCometModalOpen={isCometModalOpen}
                setIsCometModalOpen={setIsCometModalOpen}
                isGraphModalOpen={isGraphModalOpen}
                setIsGraphModalOpen={setIsGraphModalOpen}
                messages={messages}
                activeAgentId={activeAgentId}
                isFoundingStoryModalOpen={isFoundingStoryModalOpen}
                setIsFoundingStoryModalOpen={setIsFoundingStoryModalOpen}
                isSecurityModalOpen={isSecurityModalOpen}
                codeViewer={codeViewer}
                setCodeViewer={setCodeViewer}
                isMonetizationModalOpen={isMonetizationModalOpen}
                setIsMonetizationModalOpen={setIsMonetizationModalOpen}
                backupToImport={backupToImport}
                confirmAndProcessImport={confirmAndProcessImport}
                setBackupToImport={setBackupToImport}
                isAutopoiesisPanelOpen={isAutopoiesisPanelOpen}
                activeAgent={activeAgent}
                setIsAutopoiesisPanelOpen={setIsAutopoiesisPanelOpen}
                isLibraryOpen={isLibraryOpen}
                setIsLibraryOpen={setIsLibraryOpen}
                agents={agents}
                isMemoryStatsOpen={isMemoryStatsOpen}
                setIsMemoryStatsOpen={setIsMemoryStatsOpen}
                vectorDocuments={vectorDocuments}
                sharedDocuments={sharedDocuments}
                isDreamJournalOpen={isDreamJournalOpen}
                setIsDreamJournalOpen={setIsDreamJournalOpen}
                dismissDreams={dismissDreams}
                allDreams={allDreams}
                isSchedulerOpen={isSchedulerOpen}
                setIsSchedulerOpen={setIsSchedulerOpen}
                sessionTemplates={sessionTemplates}
                scheduledSessions={scheduledSessions}
                handleAddTemplate={handleAddTemplate}
                handleRemoveTemplate={handleRemoveTemplate}
                handleStartSessionNow={handleStartSessionNow}
                handleScheduleSession={handleScheduleSession}
                handleCancelSession={handleCancelSession}
                isMCPModalOpen={isMCPModalOpen}
                setIsMCPModalOpen={setIsMCPModalOpen}
                isCodeStudioOpen={isCodeStudioOpen}
                setIsCodeStudioOpen={setIsCodeStudioOpen}
                onSaveToMemory={async (agentId, text) => {
                    try {
                        const { EmbeddingService } = await import('./services/vector');
                        const { generateId } = await import('./utils/generateId');
                        const MemoryCoreService = (await import('./services/memory')).default;

                        await EmbeddingService.getInstance().init();
                        const embedding = await EmbeddingService.getInstance().embed(text);

                        const doc = {
                            id: generateId(),
                            agentId,
                            name: `[Code Studio] ${text.substring(0, 30)}...`,
                            content: text,
                            embedding,
                            utilityScore: 0,
                            timestamp: Date.now(),
                            scope: 'private' as const
                        };

                        await MemoryCoreService.saveDocument(doc);
                        setVectorDocuments(prev => ({
                            ...prev,
                            [agentId]: [...(prev[agentId] || []), doc]
                        }));
                        console.log(`[App] Code Studio message saved to memory for agent ${agentId}`);
                    } catch (e) {
                        console.error('[App] Failed to save Code Studio message:', e);
                    }
                }}
            />

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
                                                <p className="font-bold flex items-center gap-1">
                                                    {agent.name}
                                                    <EmotionalBadge agentId={agent.id} />
                                                </p>
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
                        <button onClick={() => setIsPriceModalOpen(true)} className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-md transition-colors duration-200"><PriceTagIcon /> Costi</button>
                        <button onClick={() => setIsCodeStudioOpen(true)} className="flex items-center justify-center gap-2 bg-purple-700 hover:bg-purple-600 text-white font-bold py-3 rounded-md transition-colors duration-200">💻 Code Studio</button>
                        <button onClick={() => setIsLibraryOpen(true)} className="flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 rounded-md transition-colors duration-200">📚 Biblioteca</button>
                        <button onClick={() => setIsMCPModalOpen(true)} className="flex items-center justify-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white font-bold py-3 rounded-md transition-colors duration-200">🔐 Permessi</button>
                        <button onClick={() => setIsSchedulerOpen(true)} className="flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 text-white font-bold py-3 rounded-md transition-colors duration-200 col-span-2">📅 Sessioni Programmate</button>
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
                        {/* 🕰️ Orologio Persistente */}
                        <LiveClock />
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
                                <VerbositySelector selected={verbosity} onSelect={setVerbosity} />
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
                                {/* 🧬 Autopoiesi Button - Solo in stanze private */}
                                <button
                                    onClick={async () => {
                                        // Chiedi se includere rassegna stampa
                                        const includeNews = window.confirm(
                                            '🧬 Autopoiesi per ' + activeAgent.name + '\n\n' +
                                            'Vuoi includere una rassegna stampa delle notizie del giorno?\n\n' +
                                            '(Richiede chiave API Perplexity)'
                                        );

                                        try {
                                            // 🆕 Utilizza hook handleTriggerAutopoiesis
                                            const result = await handleTriggerAutopoiesis(activeAgent, includeNews);

                                            const formattedMessage = formatAutopoiesisForChat(result);
                                            addMessage(activeAgent.id, {
                                                id: result.id,
                                                sender: 'ai',
                                                agentName: activeAgent.name,
                                                agentId: activeAgent.id,
                                                text: formattedMessage,
                                                timestamp: Date.now(),
                                                utilityScore: 0
                                            });
                                        } catch (error) {
                                            // Error handled in hook (except for addMessage which is UI concern)
                                            alert(`Errore autopoiesi: ${error}`);
                                        }
                                    }}
                                    disabled={isLoading}
                                    className="p-2 hover:bg-yellow-500/20 rounded-full transition-colors text-yellow-400 disabled:opacity-50"
                                    title={`🧬 Autopoiesi per ${activeAgent.name}`}
                                >
                                    🧬
                                </button>
                                {/* 📊 Storico Autopoiesi */}
                                <button
                                    onClick={() => setIsAutopoiesisPanelOpen(true)}
                                    className="p-2 hover:bg-yellow-500/10 rounded-full transition-colors text-yellow-300"
                                    title={`📊 Storico Autopoiesi di ${activeAgent.name}`}
                                >
                                    📊
                                </button>
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
                        onClearChat={() => clearHistory('common-room')}
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
                                    (messages[activeAgent.id] || []).map((msg, idx) => (
                                        <div key={`${msg.id}-${idx}`} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
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
                                        ref={inputRef}
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

            {/* 🆕 Mini Graph Panel - Auto-updating sidebar */}
            <MiniGraphPanel
                messages={activeAgent ? (messages[activeAgent.id] || []) : (activeRoom ? (messages[activeRoom.id] || []) : [])}
                isVisible={isMiniGraphVisible}
                onToggle={() => setIsMiniGraphVisible(!isMiniGraphVisible)}
                onExpandToModal={() => {
                    setIsMiniGraphVisible(false);
                    setIsGraphModalOpen(true);
                }}
            />

            {/* Hidden Input for Import Backup */}
            <input
                type="file"
                ref={importBackupInputRef}
                style={{ display: 'none' }}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setBackupToImport(file);
                    e.target.value = ''; // Reset to allow re-selection
                }}
                accept=".json"
            />
        </div>
    );
};

export default App;
