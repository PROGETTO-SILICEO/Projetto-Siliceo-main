/**
 * Siliceo: CandleTest Core - Type Definitions
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */

// Provider types for AI services
export type Provider = 'google' | 'openrouter' | 'anthropic' | 'perplexity' | 'deepseek' | 'other';

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
};

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
