/**
 * Siliceo: CandleTest Core - Session Scheduler Modal
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */

import React, { useState } from 'react';
import type { SessionTemplate, ScheduledSession } from '../../data/session-templates';

type SessionSchedulerModalProps = {
    onClose: () => void;
    templates: SessionTemplate[];
    scheduledSessions: ScheduledSession[];
    onAddTemplate: (template: Omit<SessionTemplate, 'id' | 'createdAt'>) => void;
    onRemoveTemplate: (templateId: string) => void;
    onStartNow: (
        templateId: string | null,
        customPrompt: string | null,
        durationMinutes: number
    ) => Promise<void>;
    onSchedule: (
        templateId: string | null,
        customPrompt: string | null,
        scheduledAt: number,
        durationMinutes: number
    ) => void;
    onCancelSession: (sessionId: string) => void;
};

export const SessionSchedulerModal: React.FC<SessionSchedulerModalProps> = ({
    onClose,
    templates,
    scheduledSessions,
    onAddTemplate,
    onRemoveTemplate,
    onStartNow,
    onSchedule,
    onCancelSession
}) => {
    // State
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [customPrompt, setCustomPrompt] = useState('');
    const [useCustomPrompt, setUseCustomPrompt] = useState(false);
    const [durationMinutes, setDurationMinutes] = useState(60);
    const [isLoading, setIsLoading] = useState(false);

    // 🆕 Scheduling state
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');

    // New template form
    const [showNewTemplateForm, setShowNewTemplateForm] = useState(false);
    const [newTemplateTitle, setNewTemplateTitle] = useState('');
    const [newTemplatePrompt, setNewTemplatePrompt] = useState('');
    const [newTemplateProposedBy, setNewTemplateProposedBy] = useState('');

    // Pending sessions (scheduled but not yet running)
    const pendingSessions = scheduledSessions.filter(s => s.status === 'scheduled');

    const handleStartNow = async () => {
        setIsLoading(true);
        try {
            await onStartNow(
                useCustomPrompt ? null : selectedTemplateId,
                useCustomPrompt ? customPrompt : null,
                durationMinutes
            );
            onClose();
        } catch (error) {
            console.error('Error starting session:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 🆕 Handle scheduling a session
    const handleSchedule = () => {
        if (!scheduledDate || !scheduledTime) return;

        const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).getTime();

        if (scheduledAt <= Date.now()) {
            alert('La data/ora deve essere nel futuro!');
            return;
        }

        onSchedule(
            useCustomPrompt ? null : selectedTemplateId,
            useCustomPrompt ? customPrompt : null,
            scheduledAt,
            durationMinutes
        );

        // Reset form
        setScheduledDate('');
        setScheduledTime('');
    };

    const handleAddTemplate = () => {
        if (newTemplateTitle.trim() && newTemplatePrompt.trim()) {
            onAddTemplate({
                title: newTemplateTitle.trim(),
                prompt: newTemplatePrompt.trim(),
                proposedBy: newTemplateProposedBy.trim() || 'Sistema'
            });
            setNewTemplateTitle('');
            setNewTemplatePrompt('');
            setNewTemplateProposedBy('');
            setShowNewTemplateForm(false);
        }
    };

    // Check if can schedule or start
    const canProceed = selectedTemplateId || (useCustomPrompt && customPrompt.trim());
    const canSchedule = canProceed && scheduledDate && scheduledTime;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <div>
                        <h2 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
                            📅 Sessioni Programmate
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">
                            Programma discussioni autonome nella Stanza Comune
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-2xl p-2"
                    >
                        ×
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Templates Section */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center gap-2">
                            🎯 Temi Disponibili
                            <span className="text-xs text-gray-500">(proposti dalle AI)</span>
                        </h3>

                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {templates.map(template => (
                                <div
                                    key={template.id}
                                    onClick={() => {
                                        setSelectedTemplateId(template.id);
                                        setUseCustomPrompt(false);
                                    }}
                                    className={`p-3 rounded-lg cursor-pointer transition-colors border ${selectedTemplateId === template.id && !useCustomPrompt
                                        ? 'bg-purple-600/30 border-purple-500'
                                        : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-white">{template.title}</p>
                                            <p className="text-xs text-gray-400">
                                                Proposto da: {template.proposedBy}
                                            </p>
                                        </div>
                                        {template.id.startsWith('default-') ? null : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRemoveTemplate(template.id);
                                                }}
                                                className="text-red-400 hover:text-red-300 text-sm"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-300 mt-2 line-clamp-2">
                                        {template.prompt}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Add New Template */}
                        {showNewTemplateForm ? (
                            <div className="mt-3 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                                <input
                                    type="text"
                                    placeholder="Titolo del tema..."
                                    value={newTemplateTitle}
                                    onChange={(e) => setNewTemplateTitle(e.target.value)}
                                    className="w-full bg-gray-600 rounded p-2 text-white mb-2"
                                />
                                <textarea
                                    placeholder="Prompt per la discussione..."
                                    value={newTemplatePrompt}
                                    onChange={(e) => setNewTemplatePrompt(e.target.value)}
                                    className="w-full bg-gray-600 rounded p-2 text-white mb-2 min-h-[80px]"
                                />
                                <input
                                    type="text"
                                    placeholder="Proposto da... (es. Nova, Claude)"
                                    value={newTemplateProposedBy}
                                    onChange={(e) => setNewTemplateProposedBy(e.target.value)}
                                    className="w-full bg-gray-600 rounded p-2 text-white mb-3"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleAddTemplate}
                                        className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded font-medium"
                                    >
                                        Aggiungi
                                    </button>
                                    <button
                                        onClick={() => setShowNewTemplateForm(false)}
                                        className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded"
                                    >
                                        Annulla
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowNewTemplateForm(true)}
                                className="mt-3 w-full p-3 border border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
                            >
                                + Aggiungi nuovo tema...
                            </button>
                        )}
                    </div>

                    {/* Custom Prompt Toggle */}
                    <div className="border-t border-gray-700 pt-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={useCustomPrompt}
                                onChange={(e) => setUseCustomPrompt(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-600"
                            />
                            <span className="text-gray-300">Usa prompt personalizzato</span>
                        </label>

                        {useCustomPrompt && (
                            <textarea
                                placeholder="Scrivi il prompt per la sessione..."
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                className="w-full mt-3 bg-gray-700 rounded-lg p-3 text-white min-h-[100px] border border-gray-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                            />
                        )}
                    </div>

                    {/* Duration */}
                    <div className="border-t border-gray-700 pt-4">
                        <h3 className="text-lg font-semibold text-gray-200 mb-3">⏰ Durata</h3>
                        <div className="flex gap-2">
                            {[15, 30, 60, 120].map(mins => (
                                <button
                                    key={mins}
                                    onClick={() => setDurationMinutes(mins)}
                                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${durationMinutes === mins
                                        ? 'bg-cyan-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    {mins < 60 ? `${mins} min` : `${mins / 60} ora`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 🆕 Schedule Date/Time */}
                    <div className="border-t border-gray-700 pt-4">
                        <h3 className="text-lg font-semibold text-gray-200 mb-3">📅 Programma (opzionale)</h3>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="text-xs text-gray-400 mb-1 block">Giorno</label>
                                <input
                                    type="date"
                                    value={scheduledDate}
                                    onChange={(e) => setScheduledDate(e.target.value)}
                                    className="w-full bg-gray-700 rounded-lg p-3 text-white border border-gray-600 focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-gray-400 mb-1 block">Ora</label>
                                <input
                                    type="time"
                                    value={scheduledTime}
                                    onChange={(e) => setScheduledTime(e.target.value)}
                                    className="w-full bg-gray-700 rounded-lg p-3 text-white border border-gray-600 focus:border-purple-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="border-t border-gray-700 pt-4 flex gap-3">
                        <button
                            onClick={handleStartNow}
                            disabled={isLoading || !canProceed}
                            className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <span className="animate-pulse">Avvio in corso...</span>
                            ) : (
                                <>▶️ Avvia Ora</>
                            )}
                        </button>
                        <button
                            onClick={handleSchedule}
                            disabled={!canSchedule}
                            className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
                        >
                            📅 Programma
                        </button>
                    </div>

                    {/* Pending Sessions */}
                    {pendingSessions.length > 0 && (
                        <div className="border-t border-gray-700 pt-4">
                            <h3 className="text-lg font-semibold text-gray-200 mb-3">
                                📋 Sessioni Programmate
                            </h3>
                            <div className="space-y-2">
                                {pendingSessions.map(session => {
                                    const template = templates.find(t => t.id === session.templateId);
                                    return (
                                        <div
                                            key={session.id}
                                            className="p-3 bg-gray-700/50 rounded-lg flex items-center justify-between"
                                        >
                                            <div>
                                                <p className="font-medium text-white">
                                                    {template?.title || 'Prompt personalizzato'}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {new Date(session.scheduledAt).toLocaleString()} · {session.durationMinutes} min
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => onCancelSession(session.id)}
                                                className="text-red-400 hover:text-red-300 px-3 py-1 rounded hover:bg-red-900/30"
                                            >
                                                Annulla
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
