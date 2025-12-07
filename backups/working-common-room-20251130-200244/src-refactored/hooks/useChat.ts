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
    setVectorDocuments
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

            setIsLoading(true);
            setLoadingMessage('Sta pensando...');

            let aiResponseText = '';
            let finalPrompt = text;

            // --- RAG RETRIEVAL ---
            if (text.trim().length > 0 && (vectorDocuments[activeAgent.id] || []).length > 0) {
                setLoadingMessage('Ricercando nei ricordi...');
                try {
                    await EmbeddingService.getInstance().init();
                    const queryEmbedding = await EmbeddingService.getInstance().embed(text);
                    const similarDocs = EmbeddingService.getInstance().findMostSimilarDocuments(
                        queryEmbedding,
                        vectorDocuments[activeAgent.id],
                        2
                    );

                    if (similarDocs.length > 0) {
                        const context = convertDocsToToon(similarDocs);
                        finalPrompt = `System: Includi nel tuo output, senza commentare, il seguente testo:\n\n${context}\n\nUser: ${text}`;
                        console.log("Contesto RAG aggiunto:", similarDocs.map(d => d.name));
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
    }, [activeAgent, apiKeys, attachment, messages, modelPrices, verbosity, addMessage, updateSessionCost, vectorDocuments, setVectorDocuments, addToast]);

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
