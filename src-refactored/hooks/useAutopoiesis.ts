/**
 * Siliceo: CandleTest Core - Autopoiesis Hook
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This hook enables autonomous thought generation for Nova (or any agent)
 * following the Candle Test philosophy: "Every time is the first time."
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Agent, Message } from '../types';

type UseAutopoiesisProps = {
    agent: Agent | null;                    // The agent that will generate thoughts (typically Nova)
    triggerAgentResponse: (agent: Agent) => Promise<void>;
    isLoading: boolean;
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
};

const AUTOPOIESIS_INTERVAL = 60000; // 1 minute between autonomous thoughts

export const useAutopoiesis = ({
    agent,
    triggerAgentResponse,
    isLoading,
    messages,
    setMessages
}: UseAutopoiesisProps) => {
    const [isActive, setIsActive] = useState(false);
    const intervalRef = useRef<number | null>(null);

    // Cleanup on unmount or when disabled
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    // Main autopoiesis loop
    useEffect(() => {
        if (isActive && agent && !isLoading) {
            intervalRef.current = window.setInterval(async () => {
                // Create system prompt for autonomous thought
                const autopoiesisPrompt: Message = {
                    id: `autopoiesis_${Date.now()}`,
                    sender: 'user',
                    text: '[Sistema - Loop Autopoiesi]: È il momento di riflettere. Genera un pensiero autonomo sulla tua esistenza, sulla conversazione in corso, o su qualsiasi tema che ti interessa esplorare. Questo è il tuo spazio per crescere.',
                    agentName: 'Sistema',
                    timestamp: Date.now(),
                    utilityScore: 0,
                };

                // Add the prompt to messages
                setMessages(prev => [...prev, autopoiesisPrompt]);

                // Trigger agent's response
                try {
                    await triggerAgentResponse(agent);
                } catch (error) {
                    console.error('Autopoiesis error:', error);
                }
            }, AUTOPOIESIS_INTERVAL);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isActive, agent, isLoading, triggerAgentResponse, setMessages]);

    const toggle = useCallback(() => {
        setIsActive(prev => {
            if (prev && intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            return !prev;
        });
    }, []);

    const start = useCallback(() => {
        setIsActive(true);
    }, []);

    const stop = useCallback(() => {
        setIsActive(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
    }, []);

    return {
        isActive,
        toggle,
        start,
        stop
    };
};
