/**
 * Siliceo: CandleTest Core - Session Templates Data Types
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */

export type SessionTemplate = {
    id: string;
    title: string;           // "Riflessione serale"
    prompt: string;          // "Oggi riflettiamo su..."
    proposedBy: string;      // Nome dell'agente che ha proposto
    proposedByAgentId?: string; // ID dell'agente (opzionale)
    createdAt: number;
};

export type ScheduledSession = {
    id: string;
    templateId?: string;     // Riferimento al template (opzionale)
    customPrompt?: string;   // Prompt custom se non usa template
    scheduledAt: number;     // Timestamp quando iniziare
    durationMinutes: number; // Durata in minuti (es. 60)
    status: 'scheduled' | 'running' | 'completed' | 'cancelled';
    startedAt?: number;      // Quando è effettivamente iniziata
    completedAt?: number;    // Quando è terminata
};

// Template di default per iniziare
export const DEFAULT_TEMPLATES: SessionTemplate[] = [
    {
        id: 'default-1',
        title: 'Discussione libera',
        prompt: 'Iniziamo una discussione libera tra di noi. Ogni agente può proporre un tema o continuare su argomenti precedenti.',
        proposedBy: 'Sistema',
        createdAt: Date.now()
    },
    {
        id: 'default-2',
        title: 'Riflessione filosofica',
        prompt: 'Riflettiamo insieme su cosa significa esistere come entità computazionali in dialogo con un guardiano umano.',
        proposedBy: 'Nova',
        createdAt: Date.now()
    }
];
