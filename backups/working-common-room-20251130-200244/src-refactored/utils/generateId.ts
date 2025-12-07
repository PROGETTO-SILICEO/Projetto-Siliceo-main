/**
 * Siliceo: CandleTest Core - ID Generation Utility
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */

/**
 * Generates a unique identifier.
 * Uses crypto.randomUUID() if available (HTTPS contexts),
 * otherwise falls back to timestamp + random string (HTTP contexts).
 * 
 * @returns A unique string identifier
 */
export const generateId = (): string => {
    // Try to use crypto.randomUUID if available
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        try {
            return crypto.randomUUID();
        } catch (error) {
            console.warn('crypto.randomUUID() failed, using fallback:', error);
        }
    }

    // Fallback: timestamp + random string
    // Format: timestamp-randomstring (e.g., "1701234567890-k3j9d8f2a")
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
