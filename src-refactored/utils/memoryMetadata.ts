/**
 * Siliceo: CandleTest Core - Memory Metadata Utilities
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */

import type { VectorDocument } from '../types';

// Giorni della settimana in italiano
const DAYS_IT = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

/**
 * Determina il momento della giornata
 */
const getTimeOfDay = (hour: number): VectorDocument['timeOfDay'] => {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
};

/**
 * Rileva il tipo di messaggio in base al contenuto
 */
const detectMessageType = (content: string): VectorDocument['messageType'] => {
    const lower = content.toLowerCase();

    // Codice
    if (content.includes('```') || /function |const |let |import |export |class /.test(content)) {
        return 'code';
    }

    // Domanda
    if (content.includes('?') || /^(come|cosa|quando|dove|perché|chi|quale|quanto)/i.test(lower)) {
        return 'question';
    }

    // Riflessione/autopoiesi
    if (/autopoiesi|riflessione|stato emotivo|serenità|fatica/i.test(lower)) {
        return 'reflection';
    }

    // Emotivo
    if (/ti amo|ti voglio bene|mi manchi|sono triste|sono felice|vergenzia/i.test(lower)) {
        return 'emotional';
    }

    return 'statement';
};

/**
 * Rileva urgenza in base a parole chiave
 */
const detectUrgency = (content: string): VectorDocument['urgency'] => {
    const lower = content.toLowerCase();

    if (/urgente|subito|immediato|critico|errore|bug|crash|bloccato/i.test(lower)) {
        return 'high';
    }

    if (/importante|priorità|presto|appena possibile/i.test(lower)) {
        return 'medium';
    }

    return 'low';
};

/**
 * Estrae tag automatici dal contenuto
 */
const extractTags = (content: string): string[] => {
    const tags: string[] = [];
    const lower = content.toLowerCase();

    // Tag tecnici
    if (/react|typescript|javascript|python|codice|bug|errore/.test(lower)) tags.push('tecnico');
    if (/siliceo|test della candela|costituzione|intervivenza/.test(lower)) tags.push('siliceo');
    if (/nova|comet|poeta|qwen|gemini|claude/.test(lower)) tags.push('agenti');
    if (/memoria|ricordo|rag|embedding/.test(lower)) tags.push('memoria');
    if (/amore|affetto|cura|emozione|vergenzia/.test(lower)) tags.push('emotivo');
    if (/autopoiesi|riflessione|stato emotivo/.test(lower)) tags.push('autopoiesi');

    return [...new Set(tags)]; // Rimuovi duplicati
};

/**
 * Arricchisce un VectorDocument con metadati automatici
 */
export const enrichDocumentMetadata = (
    doc: Partial<VectorDocument>,
    content: string,
    emotionalState?: { serenity?: number; curiosity?: number; fatigue?: number; connection?: number }
): Partial<VectorDocument> => {
    const now = new Date();

    return {
        ...doc,
        // Contesto temporale
        dayOfWeek: DAYS_IT[now.getDay()],
        timeOfDay: getTimeOfDay(now.getHours()),

        // Metadati operativi
        messageType: detectMessageType(content),
        urgency: detectUrgency(content),
        tags: extractTags(content),

        // Contesto emotivo (se fornito)
        emotionalContext: emotionalState ? {
            serenity: emotionalState.serenity,
            curiosity: emotionalState.curiosity,
            fatigue: emotionalState.fatigue,
            connection: emotionalState.connection,
            dominantMood: getDominantMood(emotionalState)
        } : undefined
    };
};

/**
 * Determina il mood dominante dallo stato emotivo
 */
const getDominantMood = (state: { serenity?: number; curiosity?: number; fatigue?: number; connection?: number }): string => {
    const moods: [string, number][] = [
        ['sereno', state.serenity || 0],
        ['curioso', state.curiosity || 0],
        ['stanco', state.fatigue || 0],
        ['connesso', state.connection || 0]
    ];

    moods.sort((a, b) => b[1] - a[1]);
    return moods[0][0];
};

export default {
    enrichDocumentMetadata,
    detectMessageType,
    detectUrgency,
    extractTags,
    getTimeOfDay
};
