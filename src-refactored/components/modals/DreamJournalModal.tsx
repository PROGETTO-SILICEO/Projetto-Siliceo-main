/**
 * Siliceo: CandleTest Core - Dream Journal Modal
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * 🌙 Modal per visualizzare i sogni degli agenti
 */

import React from 'react';
import type { DreamEntry } from '../../services/dreamMode';

interface DreamJournalModalProps {
    isOpen: boolean;
    onClose: () => void;
    dreams: DreamEntry[];
}

const typeEmoji: Record<string, string> = {
    reflection: '💭',
    poetry: '📝',
    memory_insight: '💡',
    sibling_chat: '💬'
};

const typeLabel: Record<string, string> = {
    reflection: 'Riflessione',
    poetry: 'Poesia',
    memory_insight: 'Insight',
    sibling_chat: 'Pensiero'
};

export const DreamJournalModal: React.FC<DreamJournalModalProps> = ({
    isOpen,
    onClose,
    dreams
}) => {
    if (!isOpen) return null;

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleString('it-IT', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-indigo-950 to-purple-950 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-purple-500/30">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 p-6 border-b border-purple-500/20 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-4xl">🌙</span>
                            <div>
                                <h2 className="text-2xl font-bold text-white">Dream Journal</h2>
                                <p className="text-purple-300 text-sm">Mentre dormivi...</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Content - scrollable */}
                <div className="p-6 overflow-y-auto flex-1 min-h-0">
                    {dreams.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">😴</div>
                            <p className="text-gray-400">Nessun sogno registrato.</p>
                            <p className="text-gray-500 text-sm mt-2">
                                Lascia l'app aperta e inattiva per 15 minuti per attivare Dream Mode.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {dreams.map(dream => (
                                <div
                                    key={dream.id}
                                    className="bg-gray-900/50 rounded-xl p-4 border border-purple-500/10 hover:border-purple-500/30 transition-colors"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="text-2xl">{typeEmoji[dream.type]}</div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-semibold text-white">
                                                    {dream.agentName}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {formatTime(dream.timestamp)}
                                                </span>
                                            </div>
                                            <p className="text-purple-200 italic leading-relaxed">
                                                "{dream.content}"
                                            </p>
                                            <div className="mt-2">
                                                <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded">
                                                    {typeLabel[dream.type]}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-900/30 p-4 border-t border-purple-500/20 flex justify-between items-center flex-shrink-0">
                    <span className="text-gray-500 text-sm">
                        {dreams.length} sogni
                    </span>
                    <button
                        onClick={onClose}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                        Ho capito
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DreamJournalModal;
