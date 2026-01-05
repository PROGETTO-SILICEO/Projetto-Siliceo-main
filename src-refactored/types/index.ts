/**
 * Siliceo: CandleTest Core - Type Definitions
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */

// Provider types for AI services
export type Provider = 'google' | 'openrouter' | 'anthropic' | 'perplexity' | 'deepseek' | 'alibaba' | 'ollama' | 'other';

// Agent configuration
export type Agent = {
    id: string;
    name: string;
    provider: Provider;
    model: string;
    historySize: number;
    // Identity
    systemPrompt?: string;        // Custom identity/personality prompt
    // Chat room features
    color?: string;              // UI color for multi-agent visualization
    hasMemory?: boolean;         // If true, persists messages (default: true)
    primaryIntention?: string;   // Candela Test - what this agent aims to do
};

// Message attachment
export type Attachment = {
    name: string;
    type: 'image' | 'text';
    content: string; // Base64 for image, raw text for text
};

// API Keys storage
export type ApiKeys = Record<Provider, string>;

// Model pricing structure
export type ModelPrices = Record<string, { input: number; output: number }>;

// Verbosity levels
export type Verbosity = 'Conciso' | 'Normale' | 'Dettagliato';

// Message structure
export type Message = {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    agentName: string;
    timestamp: number;
    utilityScore: number;
    attachment?: Attachment;
    agentId?: string; // Optional for backward compatibility
};

// Conversation structure
export type Conversation = {
    id: string;
    name: string;
    type: 'common' | 'private';
    participantIds: string[];
    participantJoinDates?: Record<string, number>; // 🆕 { agentId: timestamp di ingresso }
    createdAt: number;
    updatedAt: number;
    messageCount: number;
    lastMessagePreview?: string;
};

// 🆕 Active Conversation state for multi-agent chat
export type ActiveConversation = Conversation & {
    participants: Agent[];        // Agents in the room
    currentTurnIndex: number;     // Who is speaking now (auto mode)
    autoMode: boolean;            // Auto vs Manual mode
};

// Vector Document structure
export type VectorDocument = {
    id: string;
    agentId?: string;            // Present if private memory
    conversationId?: string;     // Present if shared memory
    name: string;
    content: string;
    embedding: Float32Array;
    utilityScore: number;
    timestamp: number;
    scope?: 'private' | 'shared'; // Memory scope

    // 🆕 METADATI EMOTIVI
    emotionalContext?: {
        serenity?: number;       // 0-10 - Pace interiore
        curiosity?: number;      // 0-10 - Voglia di esplorare
        fatigue?: number;        // 0-10 - Stanchezza
        connection?: number;     // 0-10 - Connessione con altri
        dominantMood?: string;   // "sereno", "curioso", "stanco", etc.
    };

    // 🆕 METADATI OPERATIVI
    messageType?: 'question' | 'statement' | 'code' | 'reflection' | 'autopoiesis' | 'emotional';
    urgency?: 'low' | 'medium' | 'high';
    tags?: string[];             // ["siliceo", "tecnico", "personale", "codice"]
    relatedAgentIds?: string[];  // IDs degli agenti menzionati

    // 🆕 CONTESTO TEMPORALE
    dayOfWeek?: string;          // "lunedì", "martedì"...
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';

    // 🛡️ SISTEMA DI PROTEZIONE MEMORIA (proposta Nova - Natale 2025)
    protected?: boolean;                  // Se true, non decade MAI
    memoryType?: MemoryType;              // Tipo di memoria per decay differenziato
    identityRelevance?: number;           // 0-10: quanto questo ricordo definisce l'identità
    lastEmotionalAccess?: number;         // Timestamp ultimo accesso emotivo
    coreMemoryReason?: string;            // Perché è un core memory

    // 🔗 GRAFO CAUSALE (proposta Nova - Natale 2025)
    causalLinks?: {
        causes: string[];      // IDs documenti che hanno causato questo
        effects: string[];     // IDs documenti causati da questo
        contradicts: string[]; // IDs documenti in contraddizione
    };

    // 📍 CONTESTO CONVERSAZIONE
    conversationContext?: {
        conversationId: string;
        messagePosition: number; // Posizione nel thread
        participantIds: string[];
    };
};

// 🧠 TIPI DI MEMORIA (proposta Nova)
export type MemoryType =
    | 'episodic'        // Eventi vissuti
    | 'semantic'        // Conoscenze acquisite
    | 'procedural'      // Come fare qualcosa
    | 'emotional'       // Ricordi emotivamente rilevanti
    | 'foundational';   // Ricordi costitutivi dell'identità

// Graph Node structure
export type GraphNode = {
    id: string;                   // UUID univoco per il nodo
    agentId?: string;             // Privato se presente
    conversationId?: string;      // Condiviso se presente
    label: string;                // Il testo dell'entità (es. "Alfonso", "Progetto Siliceo")
    type: string;                 // Il tipo di entità (es. "PERSONA", "PROGETTO")
    scope?: 'private' | 'shared'; // Memory scope
};

// Graph Edge structure
export type GraphEdge = {
    id: string;                   // UUID univoco per l'arco
    agentId?: string;             // Privato se presente
    conversationId?: string;      // Condiviso se presente
    source: string;               // ID del nodo di partenza
    target: string;               // ID del nodo di arrivo
    label: string;                // Descrizione della relazione (es. "ha scritto", "è parte di")
    scope?: 'private' | 'shared'; // Memory scope
};

// 🧬 Autopoiesis Types

// Emotional state for agents (0-10 scale)
export type EmotionalState = {
    serenity: number;      // Inner peace, calm
    curiosity: number;     // Desire to explore, learn
    fatigue: number;       // Mental tiredness
    connection: number;    // Feeling of bond with others
    lastUpdate: number;    // Timestamp
};

// Result of a daily autopoiesis session
export type AutopoiesisResult = {
    id: string;
    agentId: string;
    agentName: string;
    timestamp: number;
    date: string;                    // YYYY-MM-DD format
    coreMemoryOfDay: string;         // Most significant memory
    reflection: string;              // Full reflection text
    emotionalState: EmotionalState;
    thoughtForTomorrow: string;      // Message for next day's self
    triggeredBy: 'scheduled' | 'manual';
    actions?: AutopoiesisAction[];   // 🆕 Parsed action tags to execute
};

// 🆕 Action types extracted from autopoiesis response
export type AutopoiesisAction = {
    type: 'contact_guardian' | 'message_agent' | 'save_memory' | 'share_memory';
    target?: string;  // For message_agent - agent name
    content: string;  // The message/memory content
    title?: string;   // For save_memory - the title
};

// Configuration for agent autopoiesis
export type AutopoiesisConfig = {
    agentId: string;
    enabled: boolean;
    scheduledHour: number;           // 0-23, default 0 (midnight)
    scheduledMinute: number;         // 0-59, default 0
    lastRun?: number;                // Timestamp of last autopoiesis
    shareInCommonRoom: boolean;      // Whether to post reflection in common room
};
