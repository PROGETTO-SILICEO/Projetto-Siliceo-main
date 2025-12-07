import { useState, useEffect, useRef, useCallback } from 'react';
import type { Agent, ActiveConversation, Message } from '../types';

type UseConversationOrchestratorProps = {
    activeConversation: ActiveConversation | null;
    agents: Agent[];
    triggerAgentResponse: (agent: Agent) => Promise<void>;
    isLoading: boolean;
    lastMessage?: Message;
};

export const useConversationOrchestrator = ({
    activeConversation,
    agents,
    triggerAgentResponse,
    isLoading,
    lastMessage
}: UseConversationOrchestratorProps) => {
    // State for modes
    const [isAutoMode, setIsAutoMode] = useState(false); // 'auto' vs 'manual' in legacy
    const [isPlaying, setIsPlaying] = useState(false);   // 'continuous' play
    const [currentTurnIndex, setCurrentTurnIndex] = useState(0);

    const autoplayTimeoutRef = useRef<number | null>(null);
    const lastProcessedMessageId = useRef<string | null>(null);
    const AUTOPLAY_DELAY = 10000;

    // Reset state when conversation changes
    useEffect(() => {
        setIsAutoMode(false);
        setIsPlaying(false);
        setCurrentTurnIndex(0);
        lastProcessedMessageId.current = null;
    }, [activeConversation?.id]);

    // --- LOGIC 1: USER MESSAGE HANDLING ---
    // Legacy Behavior: 
    // - If Auto Mode: Trigger next agent immediately.
    // - If Manual Mode: Do nothing (wait for user click).
    useEffect(() => {
        if (!activeConversation || !lastMessage || isLoading) return;

        // Only react to USER messages here
        if (lastMessage.sender === 'user') {
            // Prevent duplicate triggers for the same message
            if (lastProcessedMessageId.current === lastMessage.id) {
                return;
            }

            if (isAutoMode) {
                console.log("Orchestrator [AUTO]: User spoke, triggering next agent.");
                lastProcessedMessageId.current = lastMessage.id; // Mark as processed

                const participants = activeConversation.participants;
                if (participants.length === 0) return;

                const responder = participants[currentTurnIndex % participants.length];

                // Small delay for natural feel
                setTimeout(() => {
                    triggerAgentResponse(responder)
                        .then(() => {
                            // Advance turn after response
                            setCurrentTurnIndex(prev => (prev + 1) % participants.length);
                        })
                        .catch(err => console.error("Orchestrator Error:", err));
                }, 1000);
            } else {
                // In manual mode, we just log it but don't "process" it in a way that prevents future actions if mode changes?
                // Actually, we should mark it processed so we don't log spam.
                if (lastProcessedMessageId.current !== lastMessage.id) {
                    console.log("Orchestrator [MANUAL]: User spoke, waiting for manual selection.");
                    lastProcessedMessageId.current = lastMessage.id;
                }
            }
        }
    }, [lastMessage, activeConversation, isAutoMode, isLoading, triggerAgentResponse, currentTurnIndex]);

    // --- LOGIC 2: CONTINUOUS PLAY (The "Play" button) ---
    // Legacy Behavior: Agents talk to each other automatically
    useEffect(() => {
        if (isPlaying && !isLoading && activeConversation) {
            const participants = activeConversation.participants;
            if (participants.length === 0) return;

            autoplayTimeoutRef.current = window.setTimeout(() => {
                const currentAgent = participants[currentTurnIndex % participants.length];

                triggerAgentResponse(currentAgent).then(() => {
                    setCurrentTurnIndex(prev => (prev + 1) % participants.length);
                }).catch(err => {
                    console.error("Auto-play error:", err);
                    setIsPlaying(false);
                });

            }, AUTOPLAY_DELAY);
        }

        return () => {
            if (autoplayTimeoutRef.current) {
                clearTimeout(autoplayTimeoutRef.current);
            }
        };
    }, [isPlaying, isLoading, currentTurnIndex, activeConversation, triggerAgentResponse]);

    // --- CONTROLS ---
    const toggleAutoMode = useCallback(() => {
        setIsAutoMode(prev => !prev);
        // Note: In legacy, toggling mode didn't necessarily stop playing, but let's keep it safe
        setIsPlaying(false);
    }, []);

    const togglePlayPause = useCallback(() => {
        setIsPlaying(prev => !prev);
    }, []);

    const forceTurn = useCallback(async (agent: Agent) => {
        // Manual intervention always stops continuous play
        setIsPlaying(false);

        await triggerAgentResponse(agent);

        // Update index to next person after this agent
        if (activeConversation) {
            const idx = activeConversation.participants.findIndex(p => p.id === agent.id);
            if (idx !== -1) {
                setCurrentTurnIndex((idx + 1) % activeConversation.participants.length);
            }
        }
    }, [triggerAgentResponse, activeConversation]);

    return {
        isAutoMode,
        isPlaying,
        currentTurnIndex,
        currentSpeaker: activeConversation?.participants[currentTurnIndex % activeConversation.participants.length],
        toggleAutoMode,
        togglePlayPause,
        forceTurn
    };
};
