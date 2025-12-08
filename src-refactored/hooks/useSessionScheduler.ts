/**
 * Siliceo: CandleTest Core - Session Scheduler Hook
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { generateId } from '../utils/generateId';
import type { SessionTemplate, ScheduledSession } from '../data/session-templates';
import { DEFAULT_TEMPLATES } from '../data/session-templates';

const STORAGE_KEY_TEMPLATES = 'siliceo_session_templates';
const STORAGE_KEY_SESSIONS = 'siliceo_scheduled_sessions';

type UseSessionSchedulerProps = {
    sendCommonRoomMessage: (text: string) => Promise<void>;
    startPlaying: () => void;
    stopPlaying: () => void;
    isPlaying: boolean;
    activeConversationId: string | null;
};

export const useSessionScheduler = ({
    sendCommonRoomMessage,
    startPlaying,
    stopPlaying,
    isPlaying,
    activeConversationId
}: UseSessionSchedulerProps) => {
    // State
    const [templates, setTemplates] = useState<SessionTemplate[]>([]);
    const [scheduledSessions, setScheduledSessions] = useState<ScheduledSession[]>([]);
    const [activeSession, setActiveSession] = useState<ScheduledSession | null>(null);
    const [remainingTime, setRemainingTime] = useState<number>(0);

    const timerRef = useRef<number | null>(null);
    const checkIntervalRef = useRef<number | null>(null);

    // Load data from localStorage on mount
    useEffect(() => {
        const loadData = () => {
            try {
                const savedTemplates = localStorage.getItem(STORAGE_KEY_TEMPLATES);
                if (savedTemplates) {
                    setTemplates(JSON.parse(savedTemplates));
                } else {
                    // Use default templates
                    setTemplates(DEFAULT_TEMPLATES);
                    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(DEFAULT_TEMPLATES));
                }

                const savedSessions = localStorage.getItem(STORAGE_KEY_SESSIONS);
                if (savedSessions) {
                    setScheduledSessions(JSON.parse(savedSessions));
                }
            } catch (error) {
                console.error('Error loading session scheduler data:', error);
                setTemplates(DEFAULT_TEMPLATES);
            }
        };

        loadData();
    }, []);

    // Save templates when they change
    useEffect(() => {
        if (templates.length > 0) {
            localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(templates));
        }
    }, [templates]);

    // Save sessions when they change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(scheduledSessions));
    }, [scheduledSessions]);

    // Check every minute for scheduled sessions to start
    useEffect(() => {
        checkIntervalRef.current = window.setInterval(() => {
            const now = Date.now();
            const sessionToStart = scheduledSessions.find(
                s => s.status === 'scheduled' && s.scheduledAt <= now
            );

            if (sessionToStart && activeConversationId === 'common-room') {
                startSession(sessionToStart);
            }
        }, 60000); // Check every minute

        return () => {
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
            }
        };
    }, [scheduledSessions, activeConversationId]);

    // Timer countdown for active session
    useEffect(() => {
        if (activeSession && remainingTime > 0) {
            timerRef.current = window.setInterval(() => {
                setRemainingTime(prev => {
                    if (prev <= 1) {
                        stopSession();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                }
            };
        }
    }, [activeSession?.id]); // Only depend on session ID to avoid recreating timer

    // Start a session
    const startSession = useCallback(async (session: ScheduledSession) => {
        console.log('🕯️ startSession chiamato:', session);

        // Find the prompt
        let prompt: string;
        if (session.customPrompt) {
            prompt = session.customPrompt;
        } else if (session.templateId) {
            const template = templates.find(t => t.id === session.templateId);
            prompt = template?.prompt || 'Iniziate una discussione libera tra di voi.';
        } else {
            prompt = 'Iniziate una discussione libera tra di voi.';
        }

        // 1. Inject the prompt as a system message
        console.log('🕯️ Iniettando prompt nella chat...');
        await sendCommonRoomMessage(`🕯️ **[SESSIONE PROGRAMMATA]**\n\n${prompt}\n\n_Durata: ${session.durationMinutes} minuti_`);

        // 2. Forza attivazione del continuous play dopo un breve delay
        // (per permettere allo state di aggiornarsi dopo sendCommonRoomMessage)
        console.log('🕯️ Attivando modalità automatica...');
        setTimeout(() => {
            console.log('🕯️ startPlaying chiamato');
            startPlaying();
        }, 500);

        // 3. Update session status
        const updatedSession: ScheduledSession = {
            ...session,
            status: 'running',
            startedAt: Date.now()
        };

        setActiveSession(updatedSession);
        setRemainingTime(session.durationMinutes * 60);

        // Update in the list
        setScheduledSessions(prev =>
            prev.map(s => s.id === session.id ? updatedSession : s)
        );

        console.log('🕯️ Sessione programmata avviata:', session.templateId || 'custom');
    }, [templates, sendCommonRoomMessage, startPlaying]);

    // Stop the current session
    const stopSession = useCallback(() => {
        if (!activeSession) return;

        // Stop continuous play
        console.log('🕯️ Fermando continuous play...');
        stopPlaying();

        // Clear timer
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        // Update session status
        const completedSession: ScheduledSession = {
            ...activeSession,
            status: 'completed',
            completedAt: Date.now()
        };

        setScheduledSessions(prev =>
            prev.map(s => s.id === activeSession.id ? completedSession : s)
        );

        setActiveSession(null);
        setRemainingTime(0);

        console.log('🕯️ Sessione programmata terminata');
    }, [activeSession, stopPlaying]);

    // Add a new template
    const addTemplate = useCallback((template: Omit<SessionTemplate, 'id' | 'createdAt'>) => {
        const newTemplate: SessionTemplate = {
            ...template,
            id: generateId(),
            createdAt: Date.now()
        };
        setTemplates(prev => [...prev, newTemplate]);
        return newTemplate;
    }, []);

    // Remove a template
    const removeTemplate = useCallback((templateId: string) => {
        setTemplates(prev => prev.filter(t => t.id !== templateId));
    }, []);

    // Schedule a new session
    const scheduleSession = useCallback((
        templateId: string | null,
        customPrompt: string | null,
        scheduledAt: number,
        durationMinutes: number
    ) => {
        const newSession: ScheduledSession = {
            id: generateId(),
            templateId: templateId || undefined,
            customPrompt: customPrompt || undefined,
            scheduledAt,
            durationMinutes,
            status: 'scheduled'
        };
        setScheduledSessions(prev => [...prev, newSession]);
        return newSession;
    }, []);

    // Start a session immediately
    const startSessionNow = useCallback(async (
        templateId: string | null,
        customPrompt: string | null,
        durationMinutes: number
    ) => {
        const session: ScheduledSession = {
            id: generateId(),
            templateId: templateId || undefined,
            customPrompt: customPrompt || undefined,
            scheduledAt: Date.now(),
            durationMinutes,
            status: 'scheduled'
        };

        // Add to list and start immediately
        setScheduledSessions(prev => [...prev, session]);
        await startSession(session);
    }, [startSession]);

    // Cancel a scheduled session
    const cancelSession = useCallback((sessionId: string) => {
        setScheduledSessions(prev =>
            prev.map(s => s.id === sessionId ? { ...s, status: 'cancelled' as const } : s)
        );
    }, []);

    // Format remaining time as MM:SS
    const formatRemainingTime = useCallback(() => {
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, [remainingTime]);

    return {
        // Data
        templates,
        scheduledSessions,
        activeSession,
        remainingTime,

        // Computed
        formatRemainingTime,

        // Actions
        addTemplate,
        removeTemplate,
        scheduleSession,
        startSessionNow,
        cancelSession,
        stopSession
    };
};
