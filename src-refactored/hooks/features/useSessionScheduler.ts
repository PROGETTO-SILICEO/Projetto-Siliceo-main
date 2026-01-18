import { useState, useCallback } from 'react';
import type { SessionTemplate, ScheduledSession } from '../../data/session-templates';
import { DEFAULT_TEMPLATES } from '../../data/session-templates';
import { triggerAutopoiesis } from '../../services/autopoiesis';
import type { Agent, AutopoiesisResult } from '../../types';

interface UseSessionSchedulerProps {
    agents: Agent[];
    apiKeys: any; // Record<string, string> mismatch with ApiKeys type
    addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
    executeAutopoiesisActions: (result: AutopoiesisResult) => Promise<void>;
}

export const useSessionScheduler = ({
    agents,
    apiKeys,
    addToast,
    executeAutopoiesisActions
}: UseSessionSchedulerProps) => {
    const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
    const [sessionTemplates, setSessionTemplates] = useState<SessionTemplate[]>(DEFAULT_TEMPLATES);
    const [scheduledSessions, setScheduledSessions] = useState<ScheduledSession[]>([]);

    const handleAddTemplate = useCallback((template: Omit<SessionTemplate, 'id' | 'createdAt'>) => {
        const newTemplate: SessionTemplate = {
            ...template,
            id: `template-${Date.now()}`,
            createdAt: Date.now()
        };
        setSessionTemplates(prev => [...prev, newTemplate]);
    }, []);

    const handleRemoveTemplate = useCallback((templateId: string) => {
        setSessionTemplates(prev => prev.filter(t => t.id !== templateId));
    }, []);

    const handleStartSessionNow = useCallback(async (
        templateId: string | null,
        customPrompt: string | null,
        durationMinutes: number
    ) => {
        const template = templateId ? sessionTemplates.find(t => t.id === templateId) : null;
        console.log(`[Scheduler] ▶️ Starting session now: ${template?.title || 'Custom'}`);

        // Trigger autopoiesis for all agents immediately
        for (const agent of agents) {
            try {
                const result = await triggerAutopoiesis(agent, apiKeys, 'manual', { includeNews: true });
                // 🆕 Execute parsed actions
                await executeAutopoiesisActions(result);
                addToast(`🧬 Autopoiesis completata per ${agent.name}`, 'success');
            } catch (error) {
                console.error(`[Scheduler] ❌ Failed for ${agent.name}:`, error);
                addToast(`❌ Autopoiesis fallita per ${agent.name}`, 'error');
            }
        }
    }, [agents, apiKeys, sessionTemplates, executeAutopoiesisActions, addToast]);

    const handleScheduleSession = useCallback((
        templateId: string | null,
        customPrompt: string | null,
        scheduledAt: number,
        durationMinutes: number
    ) => {
        const newSession: ScheduledSession = {
            id: `session-${Date.now()}`,
            templateId: templateId || undefined,
            customPrompt: customPrompt || undefined,
            scheduledAt,
            durationMinutes,
            status: 'scheduled'
        };
        setScheduledSessions(prev => [...prev, newSession]);
        addToast(`📅 Sessione programmata per ${new Date(scheduledAt).toLocaleString()}`, 'info');
    }, [addToast]);

    const handleCancelSession = useCallback((sessionId: string) => {
        setScheduledSessions(prev => prev.map(s =>
            s.id === sessionId ? { ...s, status: 'cancelled' as const } : s
        ));
        addToast('❌ Sessione annullata', 'info');
    }, [addToast]);

    return {
        isSchedulerOpen,
        setIsSchedulerOpen,
        sessionTemplates,
        scheduledSessions,
        handleAddTemplate,
        handleRemoveTemplate,
        handleStartSessionNow,
        handleScheduleSession,
        handleCancelSession
    };
};
