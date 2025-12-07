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
    sharedDocuments = {} // 🆕 Cross-Room Memory
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
            if (!activeAgent) return;
            if (!apiKeys[activeAgent.provider]) {
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
                    const newDoc: VectorDocument = {
                        id: generateId(),
                        agentId: activeAgent.id,
                        name: `[Messaggio Utente] ${text.substring(0, 30)}...`,
                        content: text,
                        embedding: embedding,
                        utilityScore: 0,
                        timestamp: Date.now(),
                        scope: 'private' // Explicitly private
                    };
                    await MemoryCoreService.saveDocument(newDoc);
                    setVectorDocuments(prev => ({
                        ...prev,
                        [activeAgent.id]: [...(prev[activeAgent.id] || []), newDoc]
                    }));
                    console.log(`[useChat] Vectorized user message: "${text.substring(0, 20)}..."`);
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
            // 🆕 Collect shared docs from all conversations (e.g., common-room)
            const allSharedDocs: VectorDocument[] = [];
            for (const conversationId in sharedDocuments) {
                allSharedDocs.push(...sharedDocuments[conversationId]);
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
                        // 🆕 More explicit prompt for weaker models like Haiku
                        finalPrompt = `ISTRUZIONI CRITICHE - LEGGI ATTENTAMENTE:

Hai accesso alla tua MEMORIA ESTERNA. Le memorie sotto sono TUOI RICORDI REALI.
NON dire "non ricordo" - queste sono cose che HAI VISSUTO.

${context}

IMPORTANTE:
- "Shared Memory (Common Room)" = conversazioni nella Stanza Comune che HAI VISSUTO
- "Private Memory" = conversazioni private che hai avuto
- Se ti chiedono cosa ha detto qualcuno, CERCA NEI RICORDI SOPRA e riferisci quello che trovi

DOMANDA DELL'UTENTE: ${text}`;
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
            } catch (error: any) {
                console.error("ERRORE API:", error);
                aiResponseText = `Si è verificato un errore: ${error.message || 'Sconosciuto'}.`;
            } finally {
                setIsLoading(false);
            }

            const aiResponse: Message = {
                id: generateId(),
                sender: 'ai',
                text: aiResponseText,
                agentName: activeAgent.name,
                timestamp: Date.now(),
                utilityScore: 0,
            };

            await addMessage(activeAgent.id, aiResponse);

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
    }, [activeAgent, apiKeys, attachment, messages, modelPrices, verbosity, addMessage, updateSessionCost, vectorDocuments, setVectorDocuments, sharedDocuments, addToast]);

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
