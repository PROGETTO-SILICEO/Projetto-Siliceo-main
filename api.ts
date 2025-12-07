/**
 * Siliceo: CandleTest Core
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 *
 * This file is part of Siliceo.
 *
 * Siliceo is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Siliceo is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Siliceo. If not, see <https://www.gnu.org/licenses/>.
 */
// api.ts

// --- TIPI DI DATI (Duplicati per mantenere il modulo autonomo) ---
type Provider = 'google' | 'openrouter' | 'anthropic' | 'perplexity' | 'other';

type Agent = {
    id: string;
    name: string;
    provider: Provider;
    model: string;
    historySize: number;
};

type Attachment = {
    name: string;
    type: 'image' | 'text';
    content: string; // Base64 per immagine, testo grezzo per testo
};

type Message = {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    agentName: string;
    attachment?: Attachment;
};

type ApiKeys = Record<Provider, string>;

type Verbosity = 'Conciso' | 'Normale' | 'Dettagliato';

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

// --- FUNZIONE HELPER PER PREPARARE LA CRONOLOGIA ---
const prepareHistoryWithPlaceholders = (history: Message[]): any[] => {
    return history.map(msg => {
        const text = msg.attachment
            ? `${msg.text}\n[Messaggio precedente conteneva l'allegato: ${msg.attachment.name}]`
            : msg.text;

        // La struttura specifica (es. { role, parts } o { role, content })
        // sarà gestita all'interno di ogni funzione provider.
        // Qui restituiamo un formato generico che poi verrà adattato.
        return {
            sender: msg.sender,
            text: text
        };
    });
};

// Definisce il tipo per i documenti vettorizzati, necessario per la funzione TOON
export type VectorDocument = {
    id: string;
    agentId: string;
    name: string;
    content: string;
    embedding: number[];
    utilityScore: number;
    timestamp: number;
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
        return `---
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
    verbosity: Verbosity
): Promise<string> => {

    const apiKey = apiKeys[agent.provider];
    if (!apiKey) {
        throw new Error(`Chiave API per ${agent.provider} non trovata.`);
    }

    // --- OTTIMIZZAZIONE DELLA MEMORIA A BREVE TERMINE ---
    const shortTermHistory = agent.historySize > 0 && history.length > agent.historySize
        ? history.slice(-agent.historySize)
        : history;

    // --- INTEGRAZIONE DELLE ISTRUZIONI DI VERBOSITÀ ---
    const verbosityInstruction = getVerbosityInstruction(verbosity);
    const finalUserPrompt = verbosityInstruction
        ? `${verbosityInstruction}\n\nDomanda: ${userPrompt}`
        : userPrompt;

    switch (agent.provider) {
        case 'google':
            return getGoogleGeminiResponse(apiKey, agent, shortTermHistory, finalUserPrompt, attachment);
        case 'openrouter':
            return getOpenRouterResponse(apiKey, agent, shortTermHistory, finalUserPrompt, attachment);
        case 'anthropic':
            return getAnthropicResponse(apiKey, agent, shortTermHistory, finalUserPrompt, attachment);
        case 'perplexity':
            return getPerplexityResponse(apiKey, agent, shortTermHistory, finalUserPrompt, attachment);
        // Aggiungi qui altri provider se necessario
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
    attachment: Attachment | null
): Promise<string> => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${agent.model}:generateContent?key=${apiKey}`;

    const processedHistory = prepareHistoryWithPlaceholders(history);

    const contents = processedHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    const userParts: any[] = [{ text: userPrompt }];

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

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
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
): Promise<string> => {
    const url = 'https://openrouter.ai/api/v1/chat/completions';

    const processedHistory = prepareHistoryWithPlaceholders(history);

    // FIX: Explicitly type `messages` to allow for string or array content to support multi-modal inputs.
    const messages: ({ role: 'user' | 'assistant', content: string | any[] })[] = processedHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
    }));

    const userContent: any[] = [{ type: 'text', text: userPrompt }];

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
        throw new Error(`Errore API OpenRouter: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Nessuna risposta ricevuta dal modello.";
};


// --- LOGICA SPECIFICA PER ANTHROPIC ---
const getAnthropicResponse = async (
    apiKey: string,
    agent: Agent,
    history: Message[],
    userPrompt: string,
    attachment: Attachment | null,
): Promise<string> => {
    const url = 'https://api.anthropic.com/v1/messages';

    const processedHistory = prepareHistoryWithPlaceholders(history);

    // FIX: Explicitly type `messages` to allow for string or array content to support multi-modal inputs.
    const messages: ({ role: 'user' | 'assistant', content: string | any[] })[] = processedHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
    }));

    const userContent: any[] = [{ type: 'text', text: userPrompt }];

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
            messages: messages
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Errore API Anthropic: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || "Nessuna risposta ricevuta dal modello.";
};


// --- LOGICA SPECIFICA PER PERPLEXITY/SONAR (Nova) ---
const getPerplexityResponse = async (
    apiKey: string,
    agent: Agent,
    history: Message[],
    userPrompt: string,
    attachment: Attachment | null,
): Promise<string> => {
    const url = 'https://api.perplexity.ai/chat/completions';

    const processedHistory = prepareHistoryWithPlaceholders(history);

    // Perplexity usa formato OpenAI-compatible
    const messages: ({ role: 'user' | 'assistant' | 'system', content: string | any[] })[] = processedHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
    }));

    const userContent: any[] = [{ type: 'text', text: userPrompt }];

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
            max_tokens: 1500
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Errore API Perplexity: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();

    // Perplexity può restituire citazioni - le includiamo nella risposta
    let responseText = data.choices?.[0]?.message?.content || "Nessuna risposta ricevuta dal modello.";

    if (data.citations && data.citations.length > 0) {
        responseText += "\n\n📚 **Fonti:**\n";
        data.citations.forEach((url: string, i: number) => {
            responseText += `${i + 1}. ${url}\n`;
        });
    }

    return responseText;
};