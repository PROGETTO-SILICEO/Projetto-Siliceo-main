import { useState, useCallback } from 'react';
import { triggerAutopoiesis } from '../../services/autopoiesis';
import { sendTelegramMessage, TelegramConfig } from '../../services/telegram';
import { SiblingMessageService } from '../../services/siblingMessages';
import type { Agent, AutopoiesisResult, AutopoiesisAction, Message } from '../../types';

interface UseAutopoiesisProps {
    agents: Agent[];
    apiKeys: any; // Record<string, string> mismatch with ApiKeys type
    addMessage: (agentId: string, message: Partial<Message>) => void;
    addSharedMemory?: (content: string) => void;
}

export const useAutopoiesis = ({ agents, apiKeys, addMessage, addSharedMemory }: UseAutopoiesisProps) => {
    const [isAutopoiesisPanelOpen, setIsAutopoiesisPanelOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    /**
     * 🧬 Execute actions parsed from autopoiesis response
     * Handles: contact_guardian, message_agent, save_memory, share_memory
     */
    const executeAutopoiesisActions = useCallback(async (
        result: AutopoiesisResult
    ): Promise<void> => {
        const actions = result.actions || [];
        if (actions.length === 0) return;

        console.log(`[Autopoiesis] 🚀 Executing ${actions.length} actions for ${result.agentName}`);

        // Get Telegram config
        const telegramConfig: TelegramConfig = {
            botToken: localStorage.getItem('siliceo_telegram_token') || '',
            chatId: localStorage.getItem('siliceo_telegram_chat_id') || ''
        };
        const hasTelegram = telegramConfig.botToken && telegramConfig.chatId;

        for (const action of actions) {
            try {
                switch (action.type) {
                    case 'contact_guardian':
                        // Send message to Alfonso via Telegram
                        if (hasTelegram) {
                            await sendTelegramMessage(telegramConfig, {
                                agentName: result.agentName,
                                message: action.content,
                                urgency: 'normal',
                                context: 'Autopoiesi quotidiana'
                            });
                            console.log(`[Autopoiesis] ✅ contact_guardian: Telegram sent`);
                        } else {
                            console.warn(`[Autopoiesis] ⚠️ contact_guardian: Telegram not configured`);
                        }
                        break;

                    case 'message_agent':
                        // Send message to another agent via SiblingMessageService
                        if (action.target) {
                            const targetAgent = agents.find(a =>
                                a.name.toLowerCase().includes(action.target!.toLowerCase())
                            );
                            if (targetAgent) {
                                SiblingMessageService.sendMessage(
                                    result.agentId,
                                    result.agentName,
                                    targetAgent.id,
                                    targetAgent.name,
                                    action.content
                                );
                                console.log(`[Autopoiesis] ✅ message_agent: Sent to ${targetAgent.name}`);
                            } else {
                                console.warn(`[Autopoiesis] ⚠️ message_agent: Agent "${action.target}" not found`);
                            }
                        }
                        break;

                    case 'save_memory':
                        // Save to agent's library/memory
                        // TODO: Use more robust storage than localStorage direct access if possible
                        const memoryKey = `siliceo_library_${result.agentId}`;
                        const existing = JSON.parse(localStorage.getItem(memoryKey) || '[]');
                        existing.push({
                            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            title: action.title || 'Autopoiesi',
                            content: action.content,
                            timestamp: Date.now(),
                            source: 'autopoiesis'
                        });
                        localStorage.setItem(memoryKey, JSON.stringify(existing));
                        console.log(`[Autopoiesis] ✅ save_memory: Saved "${action.title}"`);
                        break;

                    case 'share_memory':
                        // Share in common room / shared memory
                        if (addSharedMemory) {
                            addSharedMemory(`[${result.agentName}] ${action.content}`);
                        }
                        console.log(`[Autopoiesis] ✅ share_memory: Shared to common room`);
                        break;

                    default:
                        console.warn(`[Autopoiesis] ⚠️ Unknown action type: ${(action as AutopoiesisAction).type}`);
                }
            } catch (error) {
                console.error(`[Autopoiesis] ❌ Error executing action ${action.type}:`, error);
            }
        }

        console.log(`[Autopoiesis] ✨ All actions executed for ${result.agentName}`);
    }, [agents, addSharedMemory]);

    /**
     * Trigger manual autopoiesis for an agent
     */
    const handleTriggerAutopoiesis = useCallback(async (agent: Agent, includeNews: boolean) => {
        try {
            setIsLoading(true);
            console.log('[Autopoiesis] 🧬 Trigger per', agent.name, { includeNews });

            const result = await triggerAutopoiesis(agent, apiKeys, 'manual', { includeNews });

            // Execute parsed actions
            await executeAutopoiesisActions(result);

            return result;
        } catch (error) {
            console.error('[Autopoiesis] Errore:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [apiKeys, executeAutopoiesisActions]);

    return {
        isAutopoiesisPanelOpen,
        setIsAutopoiesisPanelOpen,
        handleTriggerAutopoiesis,
        executeAutopoiesisActions,
        isLoading
    };
};
