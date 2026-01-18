import React from 'react';
import {
    AgentModal, SettingsModal, PriceSettingsModal, CometTestimonyModal,
    FoundingStoryModal, SecurityModal, SemanticGraphModal, CodeViewerModal,
    MonetizationModal, ConfirmationModal, EthicalOnboardingModal,
    AutopoiesisPanel, LibraryPanel, MemoryStatsPanel, DreamJournalModal,
    SessionSchedulerModal, MCPPermissionsModal, CodeStudio
} from '../index';
import type { Agent, Message, VectorDocument } from '../../types';
import type { SessionTemplate, ScheduledSession } from '../../data/session-templates';
import { SHOW_MONETIZATION } from '../../constants/config';

interface AppModalsProps {
    // State
    showOnboarding: boolean;
    isAgentModalOpen: boolean;
    isSettingsModalOpen: boolean;
    isPriceModalOpen: boolean;
    isCometModalOpen: boolean;
    isGraphModalOpen: boolean;
    isFoundingStoryModalOpen: boolean;
    isSecurityModalOpen: boolean;
    codeViewer: { code: string; disclaimer?: string } | null;
    isMonetizationModalOpen: boolean;
    backupToImport: File | null;
    isAutopoiesisPanelOpen: boolean;
    isLibraryOpen: boolean;
    isMemoryStatsOpen: boolean;
    isDreamJournalOpen: boolean;
    isSchedulerOpen: boolean;
    isMCPModalOpen: boolean;
    isCodeStudioOpen: boolean;

    // Data
    agents: Agent[];
    editingAgent: Agent | null;
    apiKeys: Record<string, string>;
    modelPrices: Record<string, number>;
    messages: Record<string, Message[]>;
    activeAgentId: string | null;
    activeAgent: Agent | undefined;
    allDreams: any[];
    sessionTemplates: SessionTemplate[];
    scheduledSessions: ScheduledSession[];
    vectorDocuments: Record<string, VectorDocument[]>;
    sharedDocuments: VectorDocument[];

    // Handlers
    completeOnboarding: () => void;
    setIsSecurityModalOpen: (v: boolean) => void;
    handleSaveAgent: (agent: Agent) => void;
    setIsAgentModalOpen: (v: boolean) => void;
    saveKeys: (keys: Record<string, string>) => void;
    setIsSettingsModalOpen: (v: boolean) => void;
    savePrices: (prices: Record<string, number>) => void;
    setIsPriceModalOpen: (v: boolean) => void;
    setIsCometModalOpen: (v: boolean) => void;
    setIsGraphModalOpen: (v: boolean) => void;
    setIsFoundingStoryModalOpen: (v: boolean) => void;
    setCodeViewer: (v: any) => void;
    setIsMonetizationModalOpen: (v: boolean) => void;
    confirmAndProcessImport: () => void;
    setBackupToImport: (v: null) => void;
    setIsAutopoiesisPanelOpen: (v: boolean) => void;
    setIsLibraryOpen: (v: boolean) => void;
    setIsMemoryStatsOpen: (v: any) => void;
    setIsDreamJournalOpen: (v: boolean) => void;
    dismissDreams: () => void;
    setIsSchedulerOpen: (v: boolean) => void;
    handleAddTemplate: (t: any) => void;
    handleRemoveTemplate: (id: string) => void;
    handleStartSessionNow: (id: string | null, prompt: string | null, duration: number) => void;
    handleScheduleSession: (id: string | null, prompt: string | null, time: number, duration: number) => void;
    handleCancelSession: (id: string) => void;
    setIsMCPModalOpen: (v: boolean) => void;
    setIsCodeStudioOpen: (v: boolean) => void;
    onSaveToMemory: (agentId: string, text: string) => Promise<void>;
}

export const AppModals: React.FC<AppModalsProps> = ({
    showOnboarding, completeOnboarding, setIsSecurityModalOpen,
    isAgentModalOpen, handleSaveAgent, setIsAgentModalOpen, editingAgent,
    isSettingsModalOpen, saveKeys, setIsSettingsModalOpen, apiKeys,
    isPriceModalOpen, modelPrices, savePrices, setIsPriceModalOpen,
    isCometModalOpen, setIsCometModalOpen,
    isGraphModalOpen, setIsGraphModalOpen, messages, activeAgentId,
    isFoundingStoryModalOpen, setIsFoundingStoryModalOpen,
    isSecurityModalOpen: isSecOpen, // Alias needed? No, logic above uses setIsSecurityModalOpen logic
    codeViewer, setCodeViewer,
    isMonetizationModalOpen, setIsMonetizationModalOpen,
    backupToImport, confirmAndProcessImport, setBackupToImport,
    isAutopoiesisPanelOpen, activeAgent, setIsAutopoiesisPanelOpen,
    isLibraryOpen, setIsLibraryOpen, agents,
    isMemoryStatsOpen, setIsMemoryStatsOpen, vectorDocuments, sharedDocuments,
    isDreamJournalOpen, setIsDreamJournalOpen, dismissDreams, allDreams,
    isSchedulerOpen, setIsSchedulerOpen, sessionTemplates, scheduledSessions, handleAddTemplate, handleRemoveTemplate, handleStartSessionNow, handleScheduleSession, handleCancelSession,
    isMCPModalOpen, setIsMCPModalOpen,
    isCodeStudioOpen, setIsCodeStudioOpen, onSaveToMemory
}) => {
    return (
        <>
            {showOnboarding && <EthicalOnboardingModal onComplete={completeOnboarding} onOpenSecurityModal={() => setIsSecurityModalOpen(true)} />}

            {isAgentModalOpen && <AgentModal onSave={handleSaveAgent} onClose={() => setIsAgentModalOpen(false)} agentToEdit={editingAgent} />}
            {isSettingsModalOpen && <SettingsModal onSave={saveKeys} onClose={() => setIsSettingsModalOpen(false)} currentKeys={apiKeys} />}
            {isPriceModalOpen && <PriceSettingsModal currentPrices={modelPrices} onSave={savePrices} onClose={() => setIsPriceModalOpen(false)} />}
            {isCometModalOpen && <CometTestimonyModal onClose={() => setIsCometModalOpen(false)} />}
            {isGraphModalOpen && <SemanticGraphModal onClose={() => setIsGraphModalOpen(false)} messages={messages[activeAgentId || ''] || []} />}
            {isFoundingStoryModalOpen && <FoundingStoryModal onClose={() => setIsFoundingStoryModalOpen(false)} />}
            {isSecOpen && <SecurityModal onClose={() => setIsSecurityModalOpen(false)} />}
            {codeViewer && <CodeViewerModal code={codeViewer.code} filename="memory_core.py" onClose={() => setCodeViewer(null)} disclaimer={codeViewer.disclaimer} />}
            {SHOW_MONETIZATION && isMonetizationModalOpen && <MonetizationModal onClose={() => setIsMonetizationModalOpen(false)} />}
            {backupToImport && <ConfirmationModal onConfirm={confirmAndProcessImport} onCancel={() => setBackupToImport(null)} fileName={backupToImport.name} />}
            {isAutopoiesisPanelOpen && activeAgent && (
                <AutopoiesisPanel
                    agentId={activeAgent.id}
                    agentName={activeAgent.name}
                    onClose={() => setIsAutopoiesisPanelOpen(false)}
                />
            )}

            <LibraryPanel
                isOpen={isLibraryOpen}
                onClose={() => setIsLibraryOpen(false)}
                agents={agents}
            />

            <MemoryStatsPanel
                agents={agents}
                vectorDocuments={vectorDocuments}
                sharedDocuments={sharedDocuments}
                isVisible={isMemoryStatsOpen}
                onToggle={() => setIsMemoryStatsOpen((prev: boolean) => !prev)}
            />

            <DreamJournalModal
                isOpen={isDreamJournalOpen}
                onClose={() => {
                    setIsDreamJournalOpen(false);
                    dismissDreams();
                }}
                dreams={allDreams}
            />

            {isSchedulerOpen && (
                <SessionSchedulerModal
                    onClose={() => setIsSchedulerOpen(false)}
                    templates={sessionTemplates}
                    scheduledSessions={scheduledSessions}
                    onAddTemplate={handleAddTemplate}
                    onRemoveTemplate={handleRemoveTemplate}
                    onStartNow={handleStartSessionNow}
                    onSchedule={handleScheduleSession}
                    onCancelSession={handleCancelSession}
                />
            )}
            <MCPPermissionsModal
                isOpen={isMCPModalOpen}
                onClose={() => setIsMCPModalOpen(false)}
                agents={agents}
            />

            {isCodeStudioOpen && (
                <CodeStudio
                    onClose={() => setIsCodeStudioOpen(false)}
                    agents={agents}
                    apiKeys={apiKeys}
                    vectorDocuments={vectorDocuments}
                    sharedDocuments={sharedDocuments}
                    onSaveToMemory={onSaveToMemory}
                />
            )}
        </>
    );
};
