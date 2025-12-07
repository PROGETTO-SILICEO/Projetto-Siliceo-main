import { GoogleGenAI, Content } from "@google/genai";

// --- TIPI UNIVERSALI PER GLI ADATTATORI ---
export interface FormattedMessage {
    role: 'user' | 'model';
    content: string;
}

export interface Source {
    uri: string;
    title: string;
}

export interface AdapterResponse {
    text: string;
    sources?: Source[];
}

export interface AIAdapter {
    generateResponse(
        model: string,
        systemInstruction: string,
        history: FormattedMessage[]
    ): Promise<AdapterResponse>;
}

// --- ADATTATORE PER GOOGLE GEMINI ---
let ai: GoogleGenAI | null = null;
const getGoogleAI = () => {
    if (!ai) {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY di Google non trovata. Assicurati che sia configurata nel file .env.local.");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};

const googleGeminiAdapter: AIAdapter = {
    async generateResponse(model, systemInstruction, history): Promise<AdapterResponse> {
        const googleAI = getGoogleAI();

        // Gemini richiede solo 'user' nella history per questo uso
        const geminiHistory: Content[] = history.map(msg => ({
            role: 'user',
            parts: [{ text: msg.content }]
        }));

        // Aggiungi un messaggio finale per guidare la risposta
        const finalPrompt = `Ora, rispondi SOLO come te stesso, ${systemInstruction.split('\n')[0]}.`;
        geminiHistory.push({ role: 'user', parts: [{ text: finalPrompt }] });

        // Rilevamento grounding (opzionale)
        const allText = geminiHistory.map(h => h.parts[0].text).join(' ');
        const searchKeywords = ['cerca', 'ultime notizie', 'attualità', "cos'è successo", 'recente', 'news'];
        const shouldUseSearch = searchKeywords.some(kw => allText.toLowerCase().includes(kw));

        const chat = googleAI.chats.create({
            model,
            config: {
                systemInstruction,
                tools: shouldUseSearch ? [{ googleSearch: {} }] : undefined
            },
            history: geminiHistory
        });

        const response = await chat.sendMessage({ message: "Genera la tua risposta." });

        const sources: Source[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks
            ?.map((chunk: any) => ({
                uri: chunk.web?.uri,
                title: chunk.web?.title,
            }))
            .filter((source: Source) => source.uri && source.title) || [];

        const uniqueSources = Array.from(new Map(sources.map(item => [item['uri'], item])).values());

        return {
            text: response.text,
            sources: uniqueSources.length > 0 ? uniqueSources : undefined,
        };
    }
};

// --- ADATTATORE PER OPENROUTER ---
const openRouterAdapter: AIAdapter = {
    async generateResponse(model, systemInstruction, history): Promise<AdapterResponse> {
        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
        if (!OPENROUTER_API_KEY) {
            return { text: `ERRORE: OPENROUTER_API_KEY non configurata in .env.local per il modello ${model}.` };
        }

        const messages = [
            { role: "system", content: systemInstruction },
            ...history.map(msg => ({ role: "user", content: msg.content })) // tutti come 'user'
        ];

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": typeof window !== 'undefined' ? window.location.href : "http://localhost",
                "X-Title": "Siliceo Multi-Agent"
            },
            body: JSON.stringify({ model, messages })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(`OpenRouter ${response.status}: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return { text: data.choices[0].message.content };
    }
};

// --- ADATTATORE PER OLLAMA ---
const ollamaAdapter: AIAdapter = {
    async generateResponse(model, systemInstruction, history): Promise<AdapterResponse> {
        const OLLAMA_API_URL = "http://localhost:11434/api/chat";
        const modelName = model.replace('ollama/', '');

        const messages = [
            { role: "system", content: systemInstruction },
            ...history.map(msg => ({ role: "user", content: msg.content })) // tutti come 'user'
        ];

        const response = await fetch(OLLAMA_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: modelName, messages, stream: false })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        return { text: data.message.content };
    }
};

// --- ADATTATORE PER OPENAI (base) ---
const openAIAdapter: AIAdapter = {
    async generateResponse(model, systemInstruction, history): Promise<AdapterResponse> {
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        if (!OPENAI_API_KEY) {
            return { text: `ERRORE: OPENAI_API_KEY non configurata per ${model}.` };
        }

        const messages = [
            { role: "system", content: systemInstruction },
            ...history.map(msg => ({ role: "user", content: msg.content }))
        ];

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({ model, messages })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(`OpenAI ${response.status}: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return { text: data.choices[0].message.content };
    }
};

// --- ADATTATORE PER PERPLEXITY/SONAR (Nova) ---
const perplexityAdapter: AIAdapter = {
    async generateResponse(model, systemInstruction, history): Promise<AdapterResponse> {
        const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
        if (!PERPLEXITY_API_KEY) {
            return { text: `ERRORE: PERPLEXITY_API_KEY non configurata in .env.local per Nova.` };
        }

        const messages = [
            { role: "system", content: systemInstruction },
            ...history.map(msg => ({ role: "user", content: msg.content }))
        ];

        const response = await fetch("https://api.perplexity.ai/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${PERPLEXITY_API_KEY}`
            },
            body: JSON.stringify({
                model: model || 'sonar',
                messages,
                temperature: 0.7,
                max_tokens: 1500
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(`Perplexity ${response.status}: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();

        // Perplexity può restituire citazioni
        const sources: Source[] = data.citations?.map((url: string, i: number) => ({
            uri: url,
            title: `Fonte ${i + 1}`
        })) || [];

        return {
            text: data.choices[0].message.content,
            sources: sources.length > 0 ? sources : undefined
        };
    }
};

// --- SMISTATORE ---
export const getAdapterForModel = (modelName: string): AIAdapter | null => {
    if (modelName.startsWith('gemini-')) return googleGeminiAdapter;
    if (modelName.startsWith('gpt-')) return openAIAdapter;
    if (modelName.startsWith('ollama/')) return ollamaAdapter;
    if (modelName.startsWith('sonar') || modelName === 'nova') return perplexityAdapter;
    if (modelName.includes('/')) return openRouterAdapter;

    console.warn(`Nessun adattatore per ${modelName}.`);
    return null;
};