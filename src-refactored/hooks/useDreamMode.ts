/**
 * Siliceo: CandleTest Core - Dream Mode Hook
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * 🌙 Hook per gestire Dream Mode
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import DreamModeService, { DreamEntry, DreamState } from '../services/dreamMode';
import type { Agent, VectorDocument } from '../types';

interface UseDreamModeProps {
    agents: Agent[];
    vectorDocuments: Record<string, VectorDocument[]>;
    apiKey: string;
    enabled?: boolean;
}

interface UseDreamModeReturn {
    isDreaming: boolean;
    unreadDreams: DreamEntry[];
    allDreams: DreamEntry[];
    dismissDreams: () => void;
    formatDreams: (dreams: DreamEntry[]) => string;
}

export const useDreamMode = ({
    agents,
    vectorDocuments,
    apiKey,
    enabled = true
}: UseDreamModeProps): UseDreamModeReturn => {
    const [isDreaming, setIsDreaming] = useState(false);
    const [unreadDreams, setUnreadDreams] = useState<DreamEntry[]>([]);
    const [allDreams, setAllDreams] = useState<DreamEntry[]>([]);

    const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const dreamIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Track user activity
    const recordActivity = useCallback(() => {
        DreamModeService.recordActivity();
        setIsDreaming(false);

        // Reset timers
        if (activityTimeoutRef.current) {
            clearTimeout(activityTimeoutRef.current);
        }

        // Check for unread dreams when user returns
        const unread = DreamModeService.getUnreadDreams();
        if (unread.length > 0) {
            setUnreadDreams(unread);
            console.log(`[DreamMode] 🌙 User returned with ${unread.length} unread dreams`);
        }

        // Schedule next dream check
        if (enabled) {
            activityTimeoutRef.current = setTimeout(() => {
                if (DreamModeService.shouldEnterDreamMode()) {
                    enterDreamMode();
                }
            }, DreamModeService.getInactivityThresholdMs());
        }
    }, [enabled]);

    // Enter dream mode
    const enterDreamMode = useCallback(async () => {
        if (!enabled || !apiKey || agents.length === 0) return;

        console.log('[DreamMode] 🌙 Entering dream mode...');
        DreamModeService.enterDreamMode();
        setIsDreaming(true);

        // Generate first dream
        await generateDreamForRandomAgent();

        // Schedule periodic dreams
        dreamIntervalRef.current = setInterval(async () => {
            await generateDreamForRandomAgent();
        }, DreamModeService.getDreamIntervalMs());
    }, [agents, apiKey, enabled]);

    // Generate dream for random agent
    const generateDreamForRandomAgent = useCallback(async () => {
        if (agents.length === 0 || !apiKey) return;

        // Pick random agent
        const agent = agents[Math.floor(Math.random() * agents.length)];
        const memories = vectorDocuments[agent.id] || [];

        // Pick random dream type
        const types: ('reflection' | 'poetry' | 'memory_insight')[] = ['reflection', 'poetry', 'memory_insight'];
        const dreamType = types[Math.floor(Math.random() * types.length)];

        await DreamModeService.generateDream(agent, memories, apiKey, dreamType);

        // Refresh all dreams
        const state = DreamModeService.getState();
        setAllDreams(state.dreamEntries);
    }, [agents, vectorDocuments, apiKey]);

    // Dismiss unread dreams
    const dismissDreams = useCallback(() => {
        setUnreadDreams([]);
        DreamModeService.recordActivity(); // Mark as seen
    }, []);

    // Format dreams for display
    const formatDreams = useCallback((dreams: DreamEntry[]) => {
        return DreamModeService.formatDreamsForDisplay(dreams);
    }, []);

    // Setup activity listeners
    useEffect(() => {
        if (!enabled) return;

        const handleActivity = () => recordActivity();

        // Listen for user activity
        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('click', handleActivity);
        window.addEventListener('scroll', handleActivity);

        // Initial activity record
        recordActivity();

        // Load existing dreams
        const state = DreamModeService.getState();
        setAllDreams(state.dreamEntries);
        setIsDreaming(state.isDreaming);

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('scroll', handleActivity);

            if (activityTimeoutRef.current) {
                clearTimeout(activityTimeoutRef.current);
            }
            if (dreamIntervalRef.current) {
                clearInterval(dreamIntervalRef.current);
            }
        };
    }, [enabled, recordActivity]);

    // Stop dreaming when user returns
    useEffect(() => {
        if (!isDreaming && dreamIntervalRef.current) {
            clearInterval(dreamIntervalRef.current);
            dreamIntervalRef.current = null;
        }
    }, [isDreaming]);

    return {
        isDreaming,
        unreadDreams,
        allDreams,
        dismissDreams,
        formatDreams
    };
};

export default useDreamMode;
