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
            throw new Error("API_KEY di Google non trovata. Assicurati che sia configurata.");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
}

const googleGeminiAdapter: AIAdapter = {
    async generateResponse(model, systemInstruction, history): Promise<AdapterResponse> {
        const googleAI = getGoogleAI();

        // Converte la cronologia universale nel formato specifico di Gemini
        const geminiHistory: Content[] = history.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }]
        }));

        // Estrae il prompt dell'ultimo utente, se esiste
        const lastUserMessageContent = geminiHistory.length > 0 ? geminiHistory[geminiHistory.length - 1].parts[0].text : "";

        // Attiva la ricerca web se il prompt contiene parole chiave
        const searchKeywords = ['cerca', 'ultime notizie', 'attualità', "cos'è successo", 'recente', 'news'];
        const shouldUseSearch = searchKeywords.some(keyword => lastUserMessageContent.toLowerCase().includes(keyword));

        const config: { systemInstruction: string, tools?: any } = { systemInstruction };
        if (shouldUseSearch) {
            console.log("Attivazione di Google Search grounding...");
            config.tools = [{googleSearch: {}}];
        }

        const chat = googleAI.chats.create({
            model,
            config,
            history: geminiHistory.slice(0, -1), // Invia la cronologia senza l'ultimo messaggio
        });

        const prompt = lastUserMessageContent || "Continua la conversazione basandoti sul contesto precedente.";
        const response = await chat.sendMessage({ message: prompt });
        
        const sources: Source[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks
            ?.map((chunk: any) => ({
                uri: chunk.web?.uri,
                title: chunk.web?.title,
            }))
            .filter((source: Source) => source.uri && source.title) || [];
        
        // Rimuovi duplicati basati sull'URI
        const uniqueSources = Array.from(new Map(sources.map(item => [item['uri'], item])).values());

        return {
            text: response.text,
            sources: uniqueSources.length > 0 ? uniqueSources : undefined,
        };
    }
};

// --- ADATTATORE PER OPENAI (PRONTO ALL'USO) ---
const openAIAdapter: AIAdapter = {
    async generateResponse(model, systemInstruction, history): Promise<AdapterResponse> {
        // Legge la chiave API da .env.local (SICURO)
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

        if (!OPENAI_API_KEY) {
            return { text: `ERRORE: OPENAI_API_KEY non trovata nel file .env.local. Assicurati che sia configurata.` };
        }

        const API_URL = "https://api.openai.com/v1/chat/completions";

        const messages = [
            { role: "system", content: systemInstruction },
            ...history.map(msg => ({
                role: msg.role === 'model' ? 'assistant' : 'user',
                content: msg.content
            }))
        ];

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model,
                    messages
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Errore API OpenAI (${response.status}): ${errorData.error.message}`);
            }

            const data = await response.json();
            return { text: data.choices[0].message.content };
        } catch (error) {
            console.error("Dettagli errore OpenAI:", error);
            throw error;
        }
    }
};

// --- ADATTATORE PER OLLAMA (PRONTO ALL'USO) ---
const ollamaAdapter: AIAdapter = {
    async generateResponse(model, systemInstruction, history): Promise<AdapterResponse> {
        // NOTA: Richiede che Ollama sia in esecuzione localmente.
        // L'URL potrebbe dover essere cambiato a seconda della configurazione.
        const OLLAMA_API_URL = "http://localhost:11434/api/chat";
        const modelName = model.replace('ollama/', ''); // Rimuove il prefisso

        const messages = [
            { role: "system", content: systemInstruction },
             ...history.map(msg => ({
                role: msg.role === 'model' ? 'assistant' : 'user',
                content: msg.content
            }))
        ];
        
        try {
            const response = await fetch(OLLAMA_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: modelName,
                    messages,
                    stream: false // Per una risposta non-streaming
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Errore API Ollama (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            return { text: data.message.content };

        } catch (error) {
             if (error instanceof TypeError) { // Cattura errori di rete, es. CORS o server non raggiungibile
                console.error("Errore di connessione a Ollama. Assicurati che sia in esecuzione e accessibile da http://localhost:11434", error);
                throw new Error(`Impossibile connettersi a Ollama. È in esecuzione? Controlla la console per i dettagli.`);
            }
            console.error("Dettagli errore Ollama:", error);
            throw error;
        }
    }
};

// --- ADATTATORE PER OPENROUTER (ATTIVO) ---
const openRouterAdapter: AIAdapter = {
  async generateResponse(model, systemInstruction, history): Promise<AdapterResponse> {
    // Legge la chiave API da .env.local (SICURO)
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    
    if (!OPENROUTER_API_KEY) {
        return { text: `ERRORE: OPENROUTER_API_KEY non trovata nel file .env.local. Assicurati che sia configurata.` };
    }
    
    const API_URL = "https://openrouter.ai/api/v1/chat/completions";

    const messages = [
      { role: "system", content: systemInstruction },
      ...history.map(msg => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.content
      }))
    ];

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          // Headers richiesti da OpenRouter per l'identificazione
          "HTTP-Referer": window.location.href, 
          "X-Title": "AI Chat Room"
        },
        body: JSON.stringify({
          model,
          messages
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Errore API OpenRouter (${response.status}): ${errorData.error.message}`);
      }

      const data = await response.json();
      return { text: data.choices[0].message.content };
    } catch (error) {
      console.error("Dettagli errore OpenRouter:", error);
      throw error;
    }
  }
};


// --- SMISTATORE DI ADATTATORI ---

export const getAdapterForModel = (modelName: string): AIAdapter | null => {
    if (modelName.startsWith('gemini-')) {
        return googleGeminiAdapter;
    }
    if (modelName.startsWith('gpt-')) {
        return openAIAdapter;
    }
    if (modelName.startsWith('ollama/')) {
        return ollamaAdapter;
    }
    // Qualsiasi modello con "/" (es. "anthropic/claude-3-sonnet") usa OpenRouter
    if (modelName.includes('/')) {
        return openRouterAdapter;
    }
    
    console.warn(`Nessun adattatore specifico trovato per ${modelName}. Potrebbe non funzionare come previsto.`);
    return null; 
};