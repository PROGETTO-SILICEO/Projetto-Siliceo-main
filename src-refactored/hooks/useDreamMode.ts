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

    // 💧 Hydrate dreams from server on mount
    useEffect(() => {
        DreamModeService.hydrateFromServer().then(() => {
            // Refresh state after hydration
            const state = DreamModeService.getState();
            setAllDreams(state.dreamEntries);
            const unread = DreamModeService.getUnreadDreams();
            setUnreadDreams(unread);
        });
    }, []);

    // 🔧 FIX: Use refs to avoid circular dependency in useCallback
    const agentsRef = useRef(agents);
    const apiKeyRef = useRef(apiKey);
    const vectorDocumentsRef = useRef(vectorDocuments);

    // Keep refs in sync
    useEffect(() => {
        agentsRef.current = agents;
        apiKeyRef.current = apiKey;
        vectorDocumentsRef.current = vectorDocuments;
    }, [agents, apiKey, vectorDocuments]);

    // Generate dream for random agent (defined first to avoid hoisting issues)
    const generateDreamForRandomAgent = useCallback(async () => {
        const currentAgents = agentsRef.current;
        const currentApiKey = apiKeyRef.current;
        const currentVectorDocs = vectorDocumentsRef.current;

        if (currentAgents.length === 0 || !currentApiKey) {
            console.log('[DreamMode] ⚠️ Cannot generate dream: no agents or no API key');
            return;
        }

        // Pick random agent
        const agent = currentAgents[Math.floor(Math.random() * currentAgents.length)];
        const memories = currentVectorDocs[agent.id] || [];

        // Pick random dream type
        const types: ('reflection' | 'poetry' | 'memory_insight')[] = ['reflection', 'poetry', 'memory_insight'];
        const dreamType = types[Math.floor(Math.random() * types.length)];

        console.log(`[DreamMode] 🌙 Attempting to generate ${dreamType} dream for ${agent.name}...`);
        const dream = await DreamModeService.generateDream(agent, memories, currentApiKey, dreamType);

        if (dream) {
            console.log(`[DreamMode] ✅ Dream generated successfully for ${agent.name}`);
        } else {
            console.log(`[DreamMode] ⚠️ Dream generation failed for ${agent.name}`);
        }

        // Refresh all dreams
        const state = DreamModeService.getState();
        setAllDreams(state.dreamEntries);
    }, []); // No deps needed - uses refs

    // Enter dream mode
    const enterDreamMode = useCallback(async () => {
        if (!enabled || !apiKeyRef.current || agentsRef.current.length === 0) {
            console.log('[DreamMode] ⚠️ Cannot enter dream mode:', {
                enabled,
                hasApiKey: !!apiKeyRef.current,
                agentCount: agentsRef.current.length
            });
            return;
        }

        console.log('[DreamMode] 🌙 Entering dream mode...');
        DreamModeService.enterDreamMode();
        setIsDreaming(true);

        // Generate first dream
        await generateDreamForRandomAgent();

        // Schedule periodic dreams
        dreamIntervalRef.current = setInterval(async () => {
            await generateDreamForRandomAgent();
        }, DreamModeService.getDreamIntervalMs());
    }, [enabled, generateDreamForRandomAgent]);

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
                    console.log('[DreamMode] ⏰ Inactivity threshold reached, entering dream mode...');
                    enterDreamMode();
                }
            }, DreamModeService.getInactivityThresholdMs());
        }
    }, [enabled, enterDreamMode]);

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
