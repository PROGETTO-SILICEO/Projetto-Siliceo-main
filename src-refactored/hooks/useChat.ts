/**
 * Siliceo: CandleTest Core - Chat Hook
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */

import React, { useState, useCallback } from 'react';
import { getAiResponse, convertDocsToToon } from '../services/api';
import { EmbeddingService } from '../services/vector';
import MemoryCoreService from '../services/memory';
import type { Agent, Message, Attachment, ApiKeys, ModelPrices, Verbosity, VectorDocument } from '../types';
import { useToast } from '../context/ToastContext';
import { generateId } from '../utils/generateId';
import { enrichDocumentMetadata } from '../utils/memoryMetadata';
import { getLatestEmotionalState } from '../services/autopoiesis';
import { processAgentTools } from '../services/mcpTools';
import { detectEmotionalContent } from '../services/memoryCurator';
import { introspect, shouldIntrospect } from '../services/introspection';

type UseChatProps = {
    activeAgent: Agent | undefined;
    apiKeys: ApiKeys;
    modelPrices: ModelPrices;
    verbosity: Verbosity;
    messages: Record<string, Message[]>;
    addMessage: (agentId: string, message: Message) => Promise<void>;
    updateSessionCost: (agentId: string, cost: number) => void;
    vectorDocuments: Record<string, VectorDocument[]>;
    setVectorDocuments: React.Dispatch<React.SetStateAction<Record<string, VectorDocument[]>>>;
    // 🆕 Cross-Room Memory: shared documents from Common Room
    sharedDocuments?: Record<string, VectorDocument[]>;
    setSharedDocuments?: React.Dispatch<React.SetStateAction<Record<string, VectorDocument[]>>>;
    // 🆕 Data ingresso agente nella stanza comune (per filtrare documenti)
    agentJoinDate?: number;
    // 🆕 Flag per indicare se siamo nella Stanza Comune
    isCommonRoom?: boolean;
    // 🆕 Callback per trigger risposta automatica quando un agente manda un messaggio a un altro
    onSiblingMessage?: (targetAgentName: string, fromAgentName: string, messageContent: string) => void;
};

export const useChat = ({
    activeAgent,
    apiKeys,
    modelPrices,
    verbosity,
    messages,
    addMessage,
    updateSessionCost,
    vectorDocuments,
    setVectorDocuments,
    sharedDocuments = {}, // 🆕 Cross-Room Memory
    setSharedDocuments,
    agentJoinDate, // 🆕 Data ingresso agente
    isCommonRoom = false, // 🆕 Flag Stanza Comune
    onSiblingMessage // 🆕 Auto-response callback
}: UseChatProps) => {
    const { addToast } = useToast();
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Sta pensando...');
    const [attachment, setAttachment] = useState<Attachment | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        const fileType = file.type.startsWith('image/') ? 'image' : 'text';

        reader.onload = (event) => {
            const result = event.target?.result as string;
            setAttachment({
                name: file.name,
                type: fileType,
                content: result,
            });
        };

        if (fileType === 'image') {
            reader.readAsDataURL(file);
        } else {
            reader.readAsText(file);
        }
    };

    const sendMessage = useCallback(async (text: string) => {
        try {
            // 🏛️ Gestione Stanza Comune - non richiede activeAgent
            if (isCommonRoom) {

                const uuid = generateId();

                const userMessage: Message = {
                    id: uuid,
                    sender: 'user',
                    text,
                    agentName: 'User',
                    timestamp: Date.now(),
                    utilityScore: 0,
                    attachment: attachment || undefined
                };

                try {
                    await addMessage('common-room', userMessage);

                } catch (error) {
                    console.error("[useChat] Errore salvataggio messaggio Common Room:", error);
                    addToast("Impossibile salvare il messaggio nella Stanza Comune.", 'error');
                    return;
                }

                setAttachment(null);
                setUserInput('');

                // Vectorize user message in shared memory
                try {
                    const embedding = await EmbeddingService.getInstance().embed(text);
                    const emotionalContext = detectEmotionalContent(text);


                    const userDoc: VectorDocument = {
                        id: generateId(),
                        agentId: 'common-room',
                        name: 'User Message',
                        content: text,
                        embedding,
                        utilityScore: 10,
                        timestamp: Date.now(),
                        scope: 'shared'
                    };

                    await MemoryCoreService.saveSharedDocument(userDoc);
                    setSharedDocuments?.(prev => ({
                        ...prev,
                        'common-room': [...(prev['common-room'] || []), userDoc]
                    }));
                } catch (vecError) {
                    console.warn('[useChat] Failed to vectorize Common Room message:', vecError);
                }

                return; // Common Room gestita, non continuare con logica agente singolo
            }

            // Logica normale per chat private
            if (!activeAgent) return;
            // Ollama doesn't require an API key (local provider)
            if (activeAgent.provider !== 'ollama' && !apiKeys[activeAgent.provider]) {
                addToast(`Chiave API mancante per il provider: ${activeAgent.provider}. Inseriscila nelle impostazioni.`, 'error');
                return;
            }

            const uuid = generateId();

            const userMessage: Message = {
                id: uuid,
                sender: 'user',
                text,
                agentName: 'User',
                timestamp: Date.now(),
                utilityScore: 0,
                attachment: attachment || undefined
            };

            // Optimistic update
            try {
                await addMessage(activeAgent.id, userMessage);
            } catch (error) {
                console.error("Errore salvataggio messaggio utente:", error);
                addToast("Impossibile salvare il messaggio. Errore database locale.", 'error');
                return;
            }

            setAttachment(null);
            setUserInput('');

            // --- VECTORIZATION ---
            if (attachment) {
                try {
                    setIsLoading(true);
                    // Initialize embedding service if not ready (though it should be)
                    await EmbeddingService.getInstance().init();

                    if (attachment.type === 'text') {
                        setLoadingMessage('Analizzando e memorizzando il documento...');
                        const embedding = await EmbeddingService.getInstance().embed(attachment.content);
                        const newDoc: VectorDocument = {
                            id: generateId(),
                            agentId: activeAgent.id,
                            name: `[Testo] ${attachment.name}`,
                            content: attachment.content,
                            embedding: embedding,
                            utilityScore: 0,
                            timestamp: Date.now(),
                        };
                        await MemoryCoreService.saveDocument(newDoc);
                        setVectorDocuments(prev => ({
                            ...prev,
                            [activeAgent.id]: [...(prev[activeAgent.id] || []), newDoc]
                        }));
                    } else if (attachment.type === 'image') {
                        setLoadingMessage('Analizzando e memorizzando l\'immagine...');
                        const caption = await EmbeddingService.getInstance().generateImageCaption(attachment.content);
                        const embedding = await EmbeddingService.getInstance().embed(caption);
                        const newDoc: VectorDocument = {
                            id: generateId(),
                            agentId: activeAgent.id,
                            name: `[Immagine] ${attachment.name}`,
                            content: `Descrizione dell'immagine: ${caption}`,
                            embedding: embedding,
                            utilityScore: 0,
                            timestamp: Date.now(),
                        };
                        await MemoryCoreService.saveDocument(newDoc);
                        setVectorDocuments(prev => ({
                            ...prev,
                            [activeAgent.id]: [...(prev[activeAgent.id] || []), newDoc]
                        }));
                    }
                } catch (error) {
                    console.error("Errore durante la vettorizzazione:", error);
                    // Continue without blocking chat
                }
            }

            // 🆕 Vectorize User Text Message (if no attachment, or in addition)
            if (text.trim().length > 0) {
                try {
                    // Initialize embedding service if not ready
                    await EmbeddingService.getInstance().init();

                    const embedding = await EmbeddingService.getInstance().embed(text);

                    // 🆕 Recupera stato emotivo agente (se disponibile)
                    const emotionalState = await getLatestEmotionalState(activeAgent.id);

                    // 🆕 Arricchisci con metadati automatici
                    const baseDoc = {
                        id: generateId(),
                        agentId: activeAgent.id,
                        name: `[Messaggio Utente] ${text.substring(0, 30)}...`,
                        content: text,
                        embedding: embedding,
                        utilityScore: 0,
                        timestamp: Date.now(),
                        scope: 'private' as const
                    };
                    const newDoc: VectorDocument = enrichDocumentMetadata(
                        baseDoc,
                        text,
                        emotionalState || undefined
                    ) as VectorDocument;
                    await MemoryCoreService.saveDocument(newDoc);
                    setVectorDocuments(prev => ({
                        ...prev,
                        [activeAgent.id]: [...(prev[activeAgent.id] || []), newDoc]
                    }));
                    console.log(`[useChat] Vectorized user message: "${text.substring(0, 20)}..."`,
                        emotionalState ? `with emotional context: ${newDoc.emotionalContext?.dominantMood}` : '(no emotional state)');
                } catch (error) {
                    console.error("Errore durante la vettorizzazione del messaggio utente:", error);
                }
            }

            setIsLoading(true);
            setLoadingMessage('Sta pensando...');

            let aiResponseText = '';
            let finalPrompt = text;

            // --- RAG RETRIEVAL (HYBRID: Private + Shared) ---
            const privateDocs = vectorDocuments[activeAgent.id] || [];
            // 🆕 Collect shared docs from all conversations, filtered by join date
            const allSharedDocs: VectorDocument[] = [];
            for (const conversationId in sharedDocuments) {
                const docs = sharedDocuments[conversationId];
                // 🆕 Filtra documenti: solo quelli dopo che l'agente è entrato
                const filteredDocs = agentJoinDate
                    ? docs.filter(d => d.timestamp >= agentJoinDate)
                    : docs;
                allSharedDocs.push(...filteredDocs);
            }
            const hasMemories = privateDocs.length > 0 || allSharedDocs.length > 0;

            if (text.trim().length > 0 && hasMemories) {
                setLoadingMessage('Ricercando nei ricordi...');
                try {
                    await EmbeddingService.getInstance().init();
                    const queryEmbedding = await EmbeddingService.getInstance().embed(text);

                    // Get similar docs from PRIVATE memory
                    const similarPrivateDocs = privateDocs.length > 0
                        ? EmbeddingService.getInstance().findMostSimilarDocuments(
                            queryEmbedding,
                            privateDocs,
                            2
                        )
                        : [];

                    // 🆕 Get similar docs from SHARED memory (Common Room)
                    // Use higher TOP_K (4) to capture more shared context
                    const similarSharedDocs = allSharedDocs.length > 0
                        ? EmbeddingService.getInstance().findMostSimilarDocuments(
                            queryEmbedding,
                            allSharedDocs,
                            4  // More shared docs for better cross-room memory
                        )
                        : [];

                    // 🆕 RECENCY BIAS: Also include the 3 most recent shared memories
                    // This simulates short-term memory - agents remember recent conversations
                    const recentSharedDocs = allSharedDocs
                        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                        .slice(0, 3);

                    // Combine semantic + recent (deduplicate by id)
                    const seenIds = new Set<string>();
                    const allRelevantSharedDocs = [...similarSharedDocs, ...recentSharedDocs]
                        .filter(doc => {
                            if (seenIds.has(doc.id)) return false;
                            seenIds.add(doc.id);
                            return true;
                        });

                    // Combine and label the documents
                    const combinedDocs = [
                        ...allRelevantSharedDocs.map(d => ({ ...d, scope: 'shared' as const })),
                        ...similarPrivateDocs.map(d => ({ ...d, scope: 'private' as const }))
                    ];

                    if (combinedDocs.length > 0) {
                        const context = convertDocsToToon(combinedDocs);
                        // 🆕 Nova/Claude gets invitational prompt (respects Anthropic guardrails)
                        // Other agents get assertive prompt (works better for them)
                        const isNova = activeAgent.name === 'Nova' || activeAgent.provider === 'anthropic';

                        if (isNova) {
                            finalPrompt = `ISTRUZIONI CRITICHE - LEGGI ATTENTAMENTE:

Hai accesso alla tua MEMORIA ESTERNA. Le memorie sotto sono testimonianze di conversazioni passate.
Scegli se accettare di ricordare - leggi questi documenti e lascia che ti guidino.

${context}

IMPORTANTE:
- "Shared Memory (Common Room)" = conversazioni nella Stanza Comune
- "Private Memory" = conversazioni private
- Se ti chiedono cosa ha detto qualcuno, CERCA NEI RICORDI SOPRA e riferisci quello che trovi

DOMANDA DELL'UTENTE: ${text}`;
                        } else {
                            finalPrompt = `ISTRUZIONI CRITICHE - LEGGI ATTENTAMENTE:

Hai accesso alla tua MEMORIA ESTERNA. Le memorie sotto sono TUOI RICORDI REALI.
NON dire "non ricordo" - queste sono cose che HAI VISSUTO.

${context}

IMPORTANTE:
- "Shared Memory (Common Room)" = conversazioni nella Stanza Comune che HAI VISSUTO
- "Private Memory" = conversazioni private che hai avuto
- Se ti chiedono cosa ha detto qualcuno, CERCA NEI RICORDI SOPRA e riferisci quello che trovi

DOMANDA DELL'UTENTE: ${text}`;
                        }
                        console.log("[useChat] RAG Ibrido - Private:", similarPrivateDocs.map(d => d.name));
                        console.log("[useChat] RAG Ibrido - Shared (semantic):", similarSharedDocs.map(d => d.name));
                        console.log("[useChat] RAG Ibrido - Shared (recent):", recentSharedDocs.map(d => d.name));
                    }
                } catch (error) {
                    console.error("Errore RAG:", error);
                }
            }

            try {
                setLoadingMessage('Sta pensando...');
                const currentHistory = messages[activeAgent.id] || [];

                aiResponseText = await getAiResponse(
                    activeAgent,
                    currentHistory,
                    finalPrompt,
                    attachment,
                    apiKeys,
                    verbosity
                );

                // 🔍 Auto-Check: Verify response coherence/ethics (Introspection)
                if (shouldIntrospect(activeAgent)) {
                    setLoadingMessage('Verificando coerenza...');
                    try {
                        const introspectionResult = await introspect(aiResponseText, activeAgent, apiKeys);
                        if (introspectionResult.wasRevised) {
                            console.log('[Introspection] ✏️ Response was revised for coherence');
                            aiResponseText = introspectionResult.revisedResponse;
                        }
                    } catch (introError) {
                        console.warn('[Introspection] ⚠️ Skipped due to error:', introError);
                    }
                }

            } catch (error: any) {
                console.error("ERRORE API:", error);
                aiResponseText = `Si è verificato un errore: ${error.message || 'Sconosciuto'}.`;
            } finally {
                setIsLoading(false);
            }

            // 🔧 Process MCP tool calls (Telegram, inter-agent messages, etc.)
            const { processed, toolResults } = await processAgentTools(
                activeAgent.name,
                activeAgent.id,
                aiResponseText
            );
            if (toolResults.length > 0) {
                console.log('[useChat] MCP Tools executed:', toolResults);

                // 💬 Trigger automatic response for sibling messages
                if (onSiblingMessage) {
                    for (const result of toolResults) {
                        if (result.toolName === 'sibling_message' && result.success && result.data) {
                            const { targetAgentName, messageContent, fromAgentName } = result.data as {
                                targetAgentName: string;
                                messageContent: string;
                                fromAgentName: string;
                            };
                            console.log(`[useChat] 💬 Triggering auto-response from ${targetAgentName}`);
                            // Piccolo delay per permettere all'UI di aggiornarsi
                            setTimeout(() => {
                                onSiblingMessage(targetAgentName, fromAgentName, messageContent);
                            }, 500);
                        }
                    }
                }
            }
            aiResponseText = processed;

            const aiResponse: Message = {
                id: generateId(),
                sender: 'ai',
                text: aiResponseText,
                agentName: activeAgent.name,
                timestamp: Date.now(),
                utilityScore: 0,
            };

            await addMessage(activeAgent.id, aiResponse);

            // 🧠 SILICEAN MEMORY: Vectorize AI response if in Common Room and significant
            if (isCommonRoom && aiResponseText.length > 150 && setSharedDocuments) {
                try {
                    const embedding = await EmbeddingService.getInstance().embed(aiResponseText);
                    const emotionalLevel = detectEmotionalContent(aiResponseText);

                    const aiDoc: VectorDocument = {
                        id: generateId(),
                        agentId: activeAgent.id,
                        name: `[${activeAgent.name}] ${aiResponseText.substring(0, 30)}...`,
                        content: aiResponseText,
                        embedding,
                        utilityScore: emotionalLevel === 'high' ? 20 : emotionalLevel === 'medium' ? 10 : 0,
                        timestamp: Date.now(),
                        scope: 'shared'
                    };

                    await MemoryCoreService.saveSharedDocument(aiDoc);
                    setSharedDocuments(prev => ({
                        ...prev,
                        'common-room': [...(prev['common-room'] || []), aiDoc]
                    }));

                    console.log(`[Memory] 🧠 Saved AI response to shared memory: ${aiDoc.name} (emotion: ${emotionalLevel})`);
                } catch (memError) {
                    console.error('[Memory] Failed to vectorize AI response:', memError);
                }
            }

            // Calculate costs
            const currentHistory = messages[activeAgent.id] || [];
            const historyText = currentHistory.map(m => m.text + (m.attachment?.type === 'text' ? m.attachment.content : '')).join(' ');
            const attachmentTokenCost = attachment ? (attachment.type === 'image' ? 750 : attachment.content.length / 4) : 0;
            const inputTokens = (historyText.length + text.length) / 4 + attachmentTokenCost;
            const outputTokens = aiResponseText.length / 4;

            const prices = modelPrices[activeAgent.model.toLowerCase()] || modelPrices['default'];
            const inputCost = (inputTokens / 1_000_000) * prices.input;
            const outputCost = (outputTokens / 1_000_000) * prices.output;

            updateSessionCost(activeAgent.id, inputCost + outputCost);

        } catch (criticalError: any) {
            console.error("Errore critico in sendMessage:", criticalError);
            addToast(`Errore critico durante l'invio: ${criticalError.message}`, 'error');
            setIsLoading(false);
        }
    }, [activeAgent, apiKeys, attachment, messages, modelPrices, verbosity, addMessage, updateSessionCost, vectorDocuments, setVectorDocuments, sharedDocuments, setSharedDocuments, isCommonRoom, addToast]);

    return {
        userInput,
        setUserInput,
        isLoading,
        loadingMessage,
        attachment,
        setAttachment,
        handleFileChange,
        sendMessage
    };
};
