/**
 * Siliceo: CandleTest Core - Autopoiesis History Panel
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * Pannello per visualizzare lo storico delle autopoiesi di un agente.
 */

import React, { useEffect, useState } from 'react';
import type { AutopoiesisResult } from '../../types';
import { getAutopoiesisHistory } from '../../services/autopoiesis';

type AutopoiesisPanelProps = {
    agentId: string;
    agentName: string;
    onClose: () => void;
};

export const AutopoiesisPanel: React.FC<AutopoiesisPanelProps> = ({
    agentId,
    agentName,
    onClose
}) => {
    const [history, setHistory] = useState<AutopoiesisResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedEntry, setSelectedEntry] = useState<AutopoiesisResult | null>(null);

    useEffect(() => {
        const loadHistory = async () => {
            setIsLoading(true);
            try {
                const results = await getAutopoiesisHistory(agentId);
                setHistory(results);
                if (results.length > 0) {
                    setSelectedEntry(results[0]); // Seleziona la più recente
                }
            } catch (error) {
                console.error('[AutopoiesisPanel] Errore caricamento:', error);
            }
            setIsLoading(false);
        };
        loadHistory();
    }, [agentId]);

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('it-IT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const renderEmotionalBar = (value: number, emoji: string, color: string) => {
        const filled = Math.round(value / 2);
        return (
            <div className="flex items-center gap-1">
                {Array(5).fill(0).map((_, i) => (
                    <span key={i} className={i < filled ? '' : 'opacity-30'}>
                        {emoji}
                    </span>
                ))}
                <span className={`text-xs ${color} ml-1`}>{value}/10</span>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl w-[90%] max-w-4xl max-h-[85vh] flex flex-col shadow-2xl border border-gray-700">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🧬</span>
                        <div>
                            <h2 className="text-xl font-bold text-white">Storico Autopoiesi</h2>
                            <p className="text-sm text-gray-400">{agentName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar - History List */}
                    <div className="w-1/3 border-r border-gray-700 overflow-y-auto">
                        {isLoading ? (
                            <div className="p-4 text-center text-gray-400">
                                <div className="animate-pulse">Caricamento...</div>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="p-4 text-center text-gray-400">
                                <p className="text-lg mb-2">🌱</p>
                                <p>Nessuna autopoiesi registrata</p>
                                <p className="text-xs mt-1">Clicca 🧬 per iniziare</p>
                            </div>
                        ) : (
                            history.map(entry => (
                                <button
                                    key={entry.id}
                                    onClick={() => setSelectedEntry(entry)}
                                    className={`w-full text-left p-3 border-b border-gray-700/50 hover:bg-gray-700/50 transition-colors ${selectedEntry?.id === entry.id ? 'bg-purple-900/30 border-l-2 border-l-purple-500' : ''
                                        }`}
                                >
                                    <div className="text-sm font-medium text-white">
                                        📅 {entry.date}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        {entry.triggeredBy === 'manual' ? '✋ Manuale' : '⏰ Programmata'}
                                    </div>
                                    <div className="flex gap-2 mt-2 text-xs">
                                        <span title="Serenità">🟢{entry.emotionalState.serenity}</span>
                                        <span title="Curiosità">🔵{entry.emotionalState.curiosity}</span>
                                        <span title="Fatica">🟠{entry.emotionalState.fatigue}</span>
                                        <span title="Connessione">💜{entry.emotionalState.connection}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Main - Entry Detail */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {selectedEntry ? (
                            <div className="space-y-6">
                                {/* Date & Time */}
                                <div className="text-center">
                                    <h3 className="text-lg font-bold text-purple-400">
                                        {formatDate(selectedEntry.timestamp)}
                                    </h3>
                                </div>

                                {/* Emotional State */}
                                <div className="bg-gray-900/50 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold text-gray-300 mb-3">Stato Emotivo</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <span className="text-xs text-gray-400">Serenità</span>
                                            {renderEmotionalBar(selectedEntry.emotionalState.serenity, '🟢', 'text-green-400')}
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-400">Curiosità</span>
                                            {renderEmotionalBar(selectedEntry.emotionalState.curiosity, '🔵', 'text-blue-400')}
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-400">Fatica</span>
                                            {renderEmotionalBar(selectedEntry.emotionalState.fatigue, '🟠', 'text-orange-400')}
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-400">Connessione</span>
                                            {renderEmotionalBar(selectedEntry.emotionalState.connection, '💜', 'text-purple-400')}
                                        </div>
                                    </div>
                                </div>

                                {/* Core Memory */}
                                <div className="bg-gray-900/50 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold text-gray-300 mb-2">📝 Memoria del Giorno</h4>
                                    <p className="text-gray-200 whitespace-pre-wrap">{selectedEntry.coreMemoryOfDay}</p>
                                </div>

                                {/* Thought for Tomorrow */}
                                <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-500/30">
                                    <h4 className="text-sm font-semibold text-purple-300 mb-2">🌅 Per il Me di Domani</h4>
                                    <p className="text-purple-100 italic">{selectedEntry.thoughtForTomorrow}</p>
                                </div>

                                {/* Full Reflection (collapsible) */}
                                <details className="bg-gray-900/50 rounded-lg">
                                    <summary className="p-4 cursor-pointer text-sm font-semibold text-gray-300 hover:text-white">
                                        📖 Riflessione Completa
                                    </summary>
                                    <div className="p-4 pt-0 text-gray-200 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                                        {selectedEntry.reflection}
                                    </div>
                                </details>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                Seleziona un'autopoiesi dalla lista
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AutopoiesisPanel;
