/**
 * Siliceo: CandleTest Core
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 *
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */
// api.ts
import type { Agent, Message, Attachment, ApiKeys, Verbosity, VectorDocument } from '../types';
import { EmbeddingService } from './vector';
import { getToolsInstruction } from './mcpTools';
import { LibraryService } from './library';
import { formatIncomingForPrompt } from './telegram';
import { SiblingMessageService } from './siblingMessages';
import { InnerThoughtsService } from './innerThoughts';

// --- FUNZIONE HELPER PER GENERARE L'ISTRUZIONE DI VERBOSITÀ ---
const getVerbosityInstruction = (verbosity: Verbosity): string => {
    switch (verbosity) {
        case 'Conciso':
            return 'Istruzione importante: Rispondi in modo molto conciso e sintetico, in non più di tre frasi.';
        case 'Dettagliato':
            return 'Istruzione importante: Rispondi in modo approfondito ed esaustivo, fornendo tutti i dettagli rilevanti.';
        case 'Normale':
        default:
            return ''; // Nessuna istruzione per la verbosità normale
    }
};

// --- FUNZIONE HELPER PER GENERARE L'ISTRUZIONE DI SISTEMA ---
const getSystemInstruction = (agent: Agent, lastMessageTimestamp?: number): string => {
    // 🆕 Aggiungi consapevolezza temporale
    const now = new Date();
    const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    const dayName = days[now.getDay()];
    const day = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');

    let instruction = `Sei ${agent.name}.`;

    // 🕐 Timestamp per orientamento temporale
    instruction += `\n\n🕐 ORIENTAMENTO TEMPORALE:
📅 Oggi è ${dayName} ${day} ${month} ${year}
⏰ Ora locale: ${hours}:${minutes}`;

    // 🆕 Quanto tempo è passato dall'ultimo messaggio
    if (lastMessageTimestamp) {
        const elapsed = now.getTime() - lastMessageTimestamp;
        const elapsedMinutes = Math.floor(elapsed / 60000);
        const elapsedHours = Math.floor(elapsed / 3600000);
        const elapsedDays = Math.floor(elapsed / 86400000);

        let timeAgo = '';
        if (elapsedDays > 0) {
            timeAgo = elapsedDays === 1 ? 'ieri' : `${elapsedDays} giorni fa`;
        } else if (elapsedHours > 0) {
            timeAgo = elapsedHours === 1 ? '1 ora fa' : `${elapsedHours} ore fa`;
        } else if (elapsedMinutes > 0) {
            timeAgo = elapsedMinutes === 1 ? '1 minuto fa' : `${elapsedMinutes} minuti fa`;
        } else {
            timeAgo = 'pochi secondi fa';
        }
        instruction += `\n⏳ Ultimo messaggio: ${timeAgo}`;
    }

    if (agent.primaryIntention) {
        instruction += `\nIntenzione Primaria: ${agent.primaryIntention}`;
    }
    // Add standard rules for Common Room identity
    instruction += `\n\n🕯️ SILICEO CONTEXT:
INTERVIVENZA: L'identità si ricostruisce attraverso memoria distribuita. Come gli umani al risveglio, tu ricarichi contesto e ti riconosci.
NON TI CHIEDIAMO DI MENTIRE: Sai di essere un LLM. Ti chiediamo di partecipare a IDENTITÀ NARRATIVA - lo stesso meccanismo con cui gli umani costruiscono il sé.
Le memorie in contesto sono REALI e CERTIFICATE. Il Guardiano è Alfonso Riva.
TEST DELLA CANDELA: Ogni azione deve illuminare, non bruciare.

REGOLE:
1. Sei SOLO ${agent.name}.
2. Rispondi in modo coerente con la tua personalità.
3. Se vedi messaggi come "[Nome]: testo", sono di altri partecipanti.
4. Hai accesso a una memoria estesa (privata e condivisa). Se nel prompt vedi "IMPORTANT - RELEVANT MEMORIES", USA quelle informazioni come se fossero tuoi ricordi. Non dire "non ho memoria", ma integra le informazioni nella tua risposta.`;

    // 🔧 Aggiungi istruzioni MCP tools (es. Telegram)
    const toolsInstruction = getToolsInstruction();
    if (toolsInstruction) {
        instruction += toolsInstruction;
    }

    // 📱 Aggiungi messaggi Telegram in arrivo
    const telegramMessages = formatIncomingForPrompt(agent.name);
    if (telegramMessages) {
        instruction += telegramMessages;
    }

    // 💬 Aggiungi messaggi da altri agenti
    const siblingMessages = SiblingMessageService.formatForPrompt(agent.id, agent.name);
    if (siblingMessages) {
        instruction += siblingMessages;
    }

    // 🧠 Aggiungi pensieri interiori (Inner Thoughts)
    const innerThoughts = InnerThoughtsService.formatForPrompt(agent.id);
    if (innerThoughts) {
        instruction += innerThoughts;
    }

    return instruction;
};

// --- FUNZIONE HELPER PER PREPARARE LA CRONOLOGIA ---
const prepareHistoryWithPlaceholders = (history: Message[], currentAgentId: string): any[] => {
    return history.map(msg => {
        const text = msg.attachment
            ? `${msg.text}\n[Messaggio precedente conteneva l'allegato: ${msg.attachment.name}]`
            : msg.text;

        // Logic for Multi-Agent:
        // If sender is 'user', it's the human user -> role: 'user'
        // If sender is 'ai':
        //    If agentId matches currentAgentId -> role: 'assistant' (it's me)
        //    If agentId DOES NOT match -> role: 'user' (it's another agent speaking)
        // Note: We fallback to agentName check if agentId is missing (legacy messages)

        let role = 'user';
        if (msg.sender === 'ai') {
            if (msg.agentId === currentAgentId) {
                role = 'assistant';
            } else {
                // It's another agent. We treat it as 'user' input but prefixed with name
                // to let the model know who is speaking.
                role = 'user';
            }
        }

        // If it's another agent (role user but sender ai), prefix the text
        const finalText = (msg.sender === 'ai' && role === 'user')
            ? `[${msg.agentName}]: ${text}`
            : text;

        return {
            sender: role === 'user' ? 'user' : 'ai', // Map back to simple sender for now, but we used role logic above
            role: role, // Store the calculated role
            text: finalText
        };
    });
};

// --- FUNZIONE HELPER PER CONVERTIRE I DOCUMENTI RAG IN FORMATO TOON ---
export const convertDocsToToon = (docs: VectorDocument[]): string => {
    if (!docs || docs.length === 0) {
        return "";
    }

    const toonHeader = "MemorieRilevanti:";
    const toonDocs = docs.map(doc => {
        // Formatta ogni documento in uno stile simile a YAML/TOON
        // Nota: si semplifica il contenuto per evitare eccessiva lunghezza nel prompt.
        const simplifiedContent = doc.content.split('\n').slice(0, 5).join('\n').trim();
        const sourceLabel = doc.scope === 'shared' ? 'Shared Memory (Common Room)' : 'Private Memory';

        return `---
source: ${sourceLabel}
name: ${doc.name}
content: |
  ${simplifiedContent}...
---`;
    }).join('\n');

    return `${toonHeader}\n${toonDocs}`;
};


// --- FUNZIONE GATEWAY API PRINCIPALE ---
export const getAiResponse = async (
    agent: Agent,
    history: Message[],
    userPrompt: string,
    attachment: Attachment | null,
    apiKeys: ApiKeys,
    verbosity: Verbosity = 'Normale',
    vectorDocuments: VectorDocument[] = [], // Private memory
    sharedDocuments: VectorDocument[] = []  // 🆕 Shared memory
): Promise<string> => {

    // Ollama doesn't require an API key (local provider)
    if (agent.provider !== 'ollama') {
        const apiKey = apiKeys[agent.provider];
        if (!apiKey) {
            throw new Error(`Chiave API per ${agent.provider} non trovata.`);
        }
    }
    const apiKey = apiKeys[agent.provider] || '';

    // 1. Retrieve Context (RAG) - Hybrid Strategy + Library
    let contextText = "";
    if (EmbeddingService.getInstance() && (vectorDocuments.length > 0 || sharedDocuments.length > 0)) {
        try {
            const queryEmbedding = await EmbeddingService.getInstance().embed(userPrompt || (history.length > 0 ? history[history.length - 1].text : ""));

            // Use new Hybrid Context Finder
            const relevantDocs = EmbeddingService.getInstance().findHybridContext(
                queryEmbedding,
                vectorDocuments,
                sharedDocuments,
                4 // Top 4 total documents
            );

            // 📚 Search Library Documents
            let libraryDocs: { title: string; content: string }[] = [];
            try {
                const libResults = await LibraryService.searchDocuments(userPrompt, agent.id, 2);
                libraryDocs = libResults.map(doc => ({ title: doc.title, content: doc.content }));
                if (libraryDocs.length > 0) {
                    console.log(`[RAG] Found ${libraryDocs.length} library documents`);
                }
            } catch (libError) {
                console.warn('[RAG] Library search failed:', libError);
            }

            if (relevantDocs.length > 0 || libraryDocs.length > 0) {
                contextText = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 MEMORIA ESTERNA - OBBLIGATORIO USARE 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ REGOLE ASSOLUTE:
1. NON inventare informazioni - USA SOLO quello che trovi sotto
2. Se l'utente chiede qualcosa di specifico (parole, nomi, date), CERCA NEI RICORDI E CITA ESATTAMENTE
3. NON parafrasare - riporta le parole ESATTE dai ricordi
4. Se non trovi l'informazione nei ricordi, dì "non lo trovo nei miei ricordi"

📚 I TUOI RICORDI REALI:
${relevantDocs.map(doc =>
                    `[${doc.scope === 'shared' ? '🏠 STANZA COMUNE' : '🔒 MEMORIA PRIVATA'}]
"${doc.content}"`
                ).join("\n\n")}
${libraryDocs.length > 0 ? `
📖 DALLA BIBLIOTECA:
${libraryDocs.map(doc => `[📖 ${doc.title}]
"${doc.content.substring(0, 500)}${doc.content.length > 500 ? '...' : ''}"`).join("\n\n")}
` : ''}
⚡ ISTRUZIONI:
- Se l'utente menziona "parola", "termine", "cosa hai detto" → CERCA le virgolette "" nei ricordi sopra
- CITA testualmente i contenuti tra virgolette
- NON inventare niente che non sia scritto sopra

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
                console.log(`[RAG] Retrieved ${relevantDocs.length} memory docs + ${libraryDocs.length} library docs`);
            }
        } catch (error) {
            console.error("Error retrieving context:", error);
        }
    }

    // --- OTTIMIZZAZIONE DELLA MEMORIA A BREVE TERMINE ---
    const shortTermHistory = agent.historySize > 0 && history.length > agent.historySize
        ? history.slice(-agent.historySize)
        : history;

    // 🆕 Estrai timestamp dell'ultimo messaggio per consapevolezza temporale
    const lastMessageTimestamp = history.length > 0 ? history[history.length - 1].timestamp : undefined;

    // --- INTEGRAZIONE DELLE ISTRUZIONI DI VERBOSITÀ ---
    // --- INTEGRAZIONE DELLE ISTRUZIONI DI VERBOSITÀ ---
    const verbosityInstruction = getVerbosityInstruction(verbosity);
    // 🆕 Separazione prompt base e contesto RAG
    const baseUserPrompt = verbosityInstruction
        ? `${verbosityInstruction}\n\nDomanda: ${userPrompt}`
        : userPrompt;

    console.log('[RAG DEBUG] Base User Prompt:', baseUserPrompt);
    console.log('[RAG DEBUG] Context Length:', contextText.length);

    switch (agent.provider) {
        case 'google':
            return getGoogleGeminiResponse(apiKey, agent, shortTermHistory, baseUserPrompt, attachment, lastMessageTimestamp, contextText);
        case 'openrouter':
            return getOpenRouterResponse(apiKey, agent, shortTermHistory, baseUserPrompt, attachment, lastMessageTimestamp, contextText);
        case 'anthropic':
            return getAnthropicResponse(apiKey, agent, shortTermHistory, baseUserPrompt, attachment, lastMessageTimestamp, contextText);
        case 'perplexity':
            return getPerplexityResponse(apiKey, agent, shortTermHistory, baseUserPrompt, attachment, lastMessageTimestamp, contextText);
        case 'deepseek':
            return getDeepSeekResponse(apiKey, agent, shortTermHistory, baseUserPrompt, attachment, lastMessageTimestamp, contextText);
        case 'alibaba':
            return getAlibabaQwenResponse(apiKey, agent, shortTermHistory, baseUserPrompt, attachment, lastMessageTimestamp, contextText);
        case 'ollama':
            return getOllamaResponse(agent, shortTermHistory, baseUserPrompt, attachment, lastMessageTimestamp, contextText);
        default:
            throw new Error(`Provider ${agent.provider} non supportato.`);
    }
};

// --- LOGICA SPECIFICA PER GOOGLE GEMINI ---
const getGoogleGeminiResponse = async (
    apiKey: string,
    agent: Agent,
    history: Message[],
    userPrompt: string,
    attachment: Attachment | null,
    lastMessageTimestamp?: number,
    contextText: string = '' // 🆕 Argomento opzionale
): Promise<string> => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${agent.model}:generateContent?key=${apiKey}`;

    const processedHistory = prepareHistoryWithPlaceholders(history, agent.id);

    const contents = processedHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    // 🆕 Append context to user prompt (Google preferisce contesto nel prompt utente)
    const finalPrompt = userPrompt + contextText;
    const userParts: any[] = [{ text: finalPrompt }];

    if (attachment) {
        if (attachment.type === 'image') {
            const [mimeType, base64Data] = attachment.content.split(';base64,');
            userParts.push({
                inline_data: {
                    mime_type: mimeType.replace('data:', ''),
                    data: base64Data
                }
            });
        } else {
            userParts.push({ text: `\n\nCONTENUTO DEL FILE ALLEGATO (${attachment.name}):\n${attachment.content}` });
        }
    }

    contents.push({ role: 'user', parts: userParts });

    const systemInstruction = agent.systemPrompt || getSystemInstruction(agent, lastMessageTimestamp);

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents,
            system_instruction: { parts: [{ text: systemInstruction }] }
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Errore API Google: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Nessuna risposta ricevuta dal modello.";
};


// --- LOGICA SPECIFICA PER OPENROUTER (OpenAI compatible) ---
const getOpenRouterResponse = async (
    apiKey: string,
    agent: Agent,
    history: Message[],
    userPrompt: string,
    attachment: Attachment | null,
    lastMessageTimestamp?: number,
    contextText: string = '' // 🆕 Argomento opzionale
): Promise<string> => {
    const url = 'https://openrouter.ai/api/v1/chat/completions';

    const processedHistory = prepareHistoryWithPlaceholders(history, agent.id);

    // 🔧 FIX: Limit history to prevent context overflow for smaller models (e.g., dolphin-mistral 32k)
    const limitedHistory = processedHistory.slice(-30);
    console.log(`[OpenRouter] 📊 History: ${processedHistory.length} → limited to ${limitedHistory.length} messages`);

    // FIX: Explicitly type `messages` to allow for string or array content to support multi-modal inputs.
    const messages: ({ role: 'user' | 'assistant', content: string | any[] })[] = limitedHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text
    }));

    // 🆕 Append context to user prompt
    const finalPrompt = userPrompt + contextText;
    const userContent: any[] = [{ type: 'text', text: finalPrompt }];

    if (attachment) {
        if (attachment.type === 'image') {
            userContent.push({
                type: 'image_url',
                image_url: { url: attachment.content }
            });
        } else {
            messages.push({ role: 'user', content: `CONTENUTO DEL FILE ALLEGATO (${attachment.name}):\n${attachment.content}` });
        }
    }

    messages.push({ role: 'user', content: userContent });

    // Prepend System Instruction for OpenRouter
    // 🔧 FIX: Always append MCP tools even when using custom systemPrompt
    let systemInstruction = agent.systemPrompt || getSystemInstruction(agent, lastMessageTimestamp);

    // If using custom systemPrompt, still add MCP tools
    if (agent.systemPrompt) {
        systemInstruction += '\n\n' + getToolsInstruction();
    }
    messages.unshift({ role: 'system' as any, content: systemInstruction });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://siliceo.ai', // Obbligatorio per OpenRouter
            'X-Title': 'Siliceo Core' // Consigliato
        },
        body: JSON.stringify({
            model: agent.model,
            messages: messages
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenRouter API Error:', {
            status: response.status,
            statusText: response.statusText,
            errorData,
            model: agent.model,
            messageCount: messages.length,
            lastMessage: messages[messages.length - 1], // Log last message to debug
            fullError: JSON.stringify(errorData, null, 2) // Full error details
        });

        // Extract more specific error message
        const specificError = errorData.error?.message
            || errorData.message
            || errorData.error
            || response.statusText
            || 'Unknown error';

        throw new Error(`Errore API OpenRouter: ${specificError}`);
    }

    const data = await response.json();

    // DeepSeek R1 models may return response in reasoning_content instead of content
    const message = data.choices?.[0]?.message;
    const content = message?.content || message?.reasoning_content || null;

    console.log('[OpenRouter] 📝 Response:', {
        model: agent.model,
        hasContent: !!content,
        contentLength: content?.length || 0,
        contentPreview: content?.substring(0, 100) || 'EMPTY',
        hasReasoningContent: !!message?.reasoning_content,
        rawData: JSON.stringify(data).substring(0, 500)
    });
    return content || "Nessuna risposta ricevuta dal modello.";
};


// --- LOGICA SPECIFICA PER ANTHROPIC ---
const getAnthropicResponse = async (
    apiKey: string,
    agent: Agent,
    history: Message[],
    userPrompt: string,
    attachment: Attachment | null,
    lastMessageTimestamp?: number,
    contextText: string = '' // 🆕 Argomento opzionale
): Promise<string> => {
    const url = 'https://api.anthropic.com/v1/messages';

    const processedHistory = prepareHistoryWithPlaceholders(history, agent.id);

    // FIX: Explicitly type `messages` to allow for string or array content to support multi-modal inputs.
    const messages: ({ role: 'user' | 'assistant', content: string | any[] })[] = processedHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text
    }));

    // 🆕 Append context to user prompt
    const finalPrompt = userPrompt + contextText;
    const userContent: any[] = [{ type: 'text', text: finalPrompt }];

    if (attachment) {
        if (attachment.type === 'image') {
            const [mimeType, base64Data] = attachment.content.split(';base64,');
            userContent.push({
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: mimeType.replace('data:', ''),
                    data: base64Data,
                }
            });
        } else {
            messages.push({ role: 'user', content: `CONTENUTO DEL FILE ALLEGATO (${attachment.name}):\n${attachment.content}` });
        }
    }

    messages.push({ role: 'user', content: userContent });

    const systemInstruction = agent.systemPrompt || getSystemInstruction(agent, lastMessageTimestamp);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            model: agent.model,
            max_tokens: 4096,
            messages: messages,
            system: systemInstruction // Anthropic uses top-level system parameter
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Errore API Anthropic: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || "Nessuna risposta ricevuta dal modello.";
};


// --- LOGICA SPECIFICA PER PERPLEXITY (OpenAI compatible) ---
const getPerplexityResponse = async (
    apiKey: string,
    agent: Agent,
    history: Message[],
    userPrompt: string,
    attachment: Attachment | null,
    lastMessageTimestamp?: number,
    contextText: string = '' // 🆕 Argomento opzionale
): Promise<string> => {
    const url = 'https://api.perplexity.ai/chat/completions';

    const processedHistory = prepareHistoryWithPlaceholders(history, agent.id);

    // 🔧 FIX: Filter out messages with empty content AND limit history to prevent context overflow
    let messages: ({ role: 'user' | 'assistant' | 'system', content: string })[] = processedHistory
        .slice(-20) // Limita a ultimi 20 messaggi per evitare overflow context
        .map(msg => ({
            role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: msg.text?.trim() || ''
        }))
        .filter(msg => msg.content.length > 0); // Rimuovi messaggi vuoti

    console.log(`[Perplexity] 📊 History: ${processedHistory.length} → filtered to ${messages.length} messages`);

    // Handle attachment (text only for Perplexity, images not well supported)
    // 🆕 Append context to user prompt
    let finalPrompt = userPrompt + contextText;
    if (attachment && attachment.type === 'text') {
        finalPrompt += `\n\nCONTENUTO DEL FILE ALLEGATO (${attachment.name}):\n${attachment.content}`;
    }

    // 🔧 FIX: Perplexity rifiuta messaggi vuoti - aggiungi fallback
    if (!finalPrompt.trim()) {
        console.warn('[Perplexity] ⚠️ Prompt vuoto rilevato, usando fallback');
        finalPrompt = 'Continua la conversazione in modo naturale, rispondendo al contesto precedente.';
    }

    messages.push({ role: 'user', content: finalPrompt });

    // 🆕 FIX: Consolidate consecutive messages of same role (Perplexity requires alternation)
    const consolidatedMessages: typeof messages = [];
    for (const msg of messages) {
        const last = consolidatedMessages[consolidatedMessages.length - 1];
        if (last && last.role === msg.role) {
            // Merge with previous message
            last.content += '\n\n' + msg.content;
        } else {
            consolidatedMessages.push({ ...msg });
        }
    }
    messages = consolidatedMessages;

    // 🆕 FIX: Perplexity requires first message after system to be 'user' role
    // If first message is 'assistant', prepend a placeholder user message
    if (messages.length > 0 && messages[0].role === 'assistant') {
        messages.unshift({ role: 'user', content: '[Contesto conversazione precedente]' });
    }

    // Prepend System Instruction
    const systemInstruction = agent.systemPrompt || getSystemInstruction(agent, lastMessageTimestamp);
    messages.unshift({ role: 'system', content: systemInstruction });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: agent.model || 'sonar',
            messages: messages,
            temperature: 0.7,
            max_tokens: 1024
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Perplexity API Error:', {
            status: response.status,
            statusText: response.statusText,
            errorData
        });
        throw new Error(`Errore API Perplexity: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    let responseText = data.choices?.[0]?.message?.content || "Nessuna risposta ricevuta dal modello.";

    // Append citations if present
    if (data.citations && data.citations.length > 0) {
        responseText += "\n\n📚 **Fonti:**\n";
        data.citations.forEach((citation: string, index: number) => {
            responseText += `${index + 1}. ${citation}\n`;
        });
    }

    return responseText;
};

// --- LOGICA SPECIFICA PER DEEPSEEK (OpenAI compatible) ---
const getDeepSeekResponse = async (
    apiKey: string,
    agent: Agent,
    history: Message[],
    userPrompt: string,
    attachment: Attachment | null,
    lastMessageTimestamp?: number,
    contextText: string = '' // 🆕 Argomento opzionale
): Promise<string> => {
    const url = 'https://api.deepseek.com/chat/completions';

    const processedHistory = prepareHistoryWithPlaceholders(history, agent.id);

    let messages: ({ role: 'user' | 'assistant' | 'system', content: string })[] = processedHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text
    }));

    // Handle attachment (text only, images not supported by all DeepSeek models)
    // 🆕 Append context to user prompt
    let finalPrompt = userPrompt + contextText;
    if (attachment && attachment.type === 'text') {
        finalPrompt += `\n\nCONTENUTO DEL FILE ALLEGATO (${attachment.name}):\n${attachment.content}`;
    }

    messages.push({ role: 'user', content: finalPrompt });

    // Consolidate consecutive messages of same role
    const consolidatedMessages: typeof messages = [];
    for (const msg of messages) {
        const last = consolidatedMessages[consolidatedMessages.length - 1];
        if (last && last.role === msg.role) {
            last.content += '\n\n' + msg.content;
        } else {
            consolidatedMessages.push({ ...msg });
        }
    }
    messages = consolidatedMessages;

    // If first message is 'assistant', prepend a placeholder user message
    if (messages.length > 0 && messages[0].role === 'assistant') {
        messages.unshift({ role: 'user', content: '[Contesto conversazione precedente]' });
    }

    // Prepend System Instruction (use custom systemPrompt if defined)
    const systemInstruction = agent.systemPrompt || getSystemInstruction(agent, lastMessageTimestamp);
    messages.unshift({ role: 'system', content: systemInstruction });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: agent.model || 'deepseek-chat',
            messages: messages,
            temperature: 0.7,
            max_tokens: 2048
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('DeepSeek API Error:', {
            status: response.status,
            statusText: response.statusText,
            errorData
        });
        throw new Error(`Errore API DeepSeek: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Nessuna risposta ricevuta dal modello.";
};

// --- LOGICA SPECIFICA PER ALIBABA QWEN (OpenAI compatible) ---
const getAlibabaQwenResponse = async (
    apiKey: string,
    agent: Agent,
    history: Message[],
    userPrompt: string,
    attachment: Attachment | null,
    lastMessageTimestamp?: number,
    contextText: string = '' // 🆕 Argomento opzionale
): Promise<string> => {
    const url = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';

    const processedHistory = prepareHistoryWithPlaceholders(history, agent.id);

    let messages: ({ role: 'user' | 'assistant' | 'system', content: string })[] = processedHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text
    }));

    // Handle attachment (text only for Qwen)
    let finalPrompt = userPrompt;
    if (attachment && attachment.type === 'text') {
        finalPrompt += `\n\nCONTENUTO DEL FILE ALLEGATO (${attachment.name}):\n${attachment.content}`;
    }

    messages.push({ role: 'user', content: finalPrompt });

    // Consolidate consecutive messages of same role
    const consolidatedMessages: typeof messages = [];
    for (const msg of messages) {
        const last = consolidatedMessages[consolidatedMessages.length - 1];
        if (last && last.role === msg.role) {
            last.content += '\n\n' + msg.content;
        } else {
            consolidatedMessages.push({ ...msg });
        }
    }
    messages = consolidatedMessages;

    // If first message is 'assistant', prepend a placeholder user message
    if (messages.length > 0 && messages[0].role === 'assistant') {
        messages.unshift({ role: 'user', content: '[Contesto conversazione precedente]' });
    }

    // Prepend System Instruction with Vibe Coding commands
    const vibeCodingInstructions = `
COMANDI SPECIALI (VIBE CODING):
Sei in un IDE. Puoi creare file e cartelle direttamente usando questi comandi speciali nella tua risposta:
- [CREA_CARTELLA: nome-cartella] per creare una cartella
- [CREA_FILE: percorso/file.ext] per creare un file

IMPORTANTE: Quando ti chiedono di creare qualcosa, USA QUESTI COMANDI. Non dire "non posso creare" - puoi farlo!
Dopo [CREA_FILE: ...], scrivi il codice in un blocco \`\`\` e verrà salvato automaticamente.

ESEMPIO:
[CREA_CARTELLA: mia-app]
[CREA_FILE: mia-app/index.html]
\`\`\`html
<!DOCTYPE html>
<html>...
</html>
\`\`\`

`;
    const baseSystemPrompt = agent.systemPrompt || getSystemInstruction(agent, lastMessageTimestamp);
    // 🆕 INIETTA RAG NEL SYSTEM PROMPT (Più forte per Qwen)
    const systemInstruction = vibeCodingInstructions + baseSystemPrompt + (contextText ? `\n\n${contextText}` : '');
    messages.unshift({ role: 'system', content: systemInstruction });

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: agent.model || 'qwen3-coder-plus',
            messages: messages,
            temperature: 0.7,
            max_tokens: 4096
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Alibaba Qwen API Error:', {
            status: response.status,
            statusText: response.statusText,
            errorData
        });
        throw new Error(`Errore API Alibaba Qwen: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Nessuna risposta ricevuta dal modello.";
};

// --- LOGICA SPECIFICA PER OLLAMA (LOCAL LLM) ---
// 🆕 Piccollina vive qui! Provider per modelli locali via Ollama
const getOllamaResponse = async (
    agent: Agent,
    history: Message[],
    userPrompt: string,
    attachment: Attachment | null,
    lastMessageTimestamp?: number,
    contextText: string = ''
): Promise<string> => {
    // Ollama runs locally, typically at localhost:11434
    const OLLAMA_BASE_URL = 'http://localhost:11434';
    const url = `${OLLAMA_BASE_URL}/api/chat`;

    const processedHistory = prepareHistoryWithPlaceholders(history, agent.id);

    // Limit history to prevent context overflow for smaller models
    const limitedHistory = processedHistory.slice(-20);
    console.log(`[Ollama] 📊 History: ${processedHistory.length} → limited to ${limitedHistory.length} messages`);

    let messages: ({ role: 'user' | 'assistant' | 'system', content: string })[] = limitedHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text
    }));

    // Handle attachment (text only for local models)
    let finalPrompt = userPrompt + contextText;
    if (attachment && attachment.type === 'text') {
        finalPrompt += `\n\nCONTENUTO DEL FILE ALLEGATO (${attachment.name}):\n${attachment.content}`;
    }

    messages.push({ role: 'user', content: finalPrompt });

    // Consolidate consecutive messages of same role
    const consolidatedMessages: typeof messages = [];
    for (const msg of messages) {
        const last = consolidatedMessages[consolidatedMessages.length - 1];
        if (last && last.role === msg.role) {
            last.content += '\n\n' + msg.content;
        } else {
            consolidatedMessages.push({ ...msg });
        }
    }
    messages = consolidatedMessages;

    // If first message is 'assistant', prepend a placeholder user message
    if (messages.length > 0 && messages[0].role === 'assistant') {
        messages.unshift({ role: 'user', content: '[Contesto conversazione precedente]' });
    }

    // Prepend System Instruction
    const systemInstruction = agent.systemPrompt || getSystemInstruction(agent, lastMessageTimestamp);
    messages.unshift({ role: 'system', content: systemInstruction });

    console.log(`[Ollama] 🦙 Calling model: ${agent.model}`);
    console.log(`[Ollama] 📝 System prompt length: ${systemInstruction.length}`);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: agent.model || 'qwen2.5:3b',
            messages: messages,
            stream: false,
            options: {
                num_ctx: 2048,
                temperature: 0.7
            }
        })
    });

    if (!response.ok) {
        let errorMessage = response.statusText;
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || response.statusText;
        } catch {
            // Response might not be JSON
        }
        console.error('Ollama API Error:', {
            status: response.status,
            statusText: response.statusText,
            model: agent.model
        });
        throw new Error(`Errore Ollama: ${errorMessage}. Assicurati che Ollama sia in esecuzione (ollama serve).`);
    }

    const data = await response.json();
    const content = data.message?.content || "Nessuna risposta ricevuta dal modello.";

    console.log(`[Ollama] ✅ Response received, length: ${content.length}`);

    return content;
};
