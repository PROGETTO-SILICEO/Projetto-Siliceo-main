/**
 * Siliceo: CandleTest Core - Memory Stats Panel
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * Pannello per visualizzare statistiche sulla memoria degli agenti
 */

import React, { useState, useEffect } from 'react';
import type { Agent, VectorDocument } from '../../types';
import MemoryCoreService from '../../services/memory';

interface MemoryStatsProps {
    agents: Agent[];
    vectorDocuments: Record<string, VectorDocument[]>;
    sharedDocuments: Record<string, VectorDocument[]>;
    isVisible: boolean;
    onToggle: () => void;
}

interface AgentMemoryStats {
    agentId: string;
    agentName: string;
    privateCount: number;
    sharedCount: number;
    totalScore: number;
    avgScore: number;
    recentMemories: number;
    oldestTimestamp?: number;
    newestTimestamp?: number;
}

const MemoryStatsPanel: React.FC<MemoryStatsProps> = ({
    agents,
    vectorDocuments,
    sharedDocuments,
    isVisible,
    onToggle
}) => {
    const [stats, setStats] = useState<AgentMemoryStats[]>([]);
    const [totalShared, setTotalShared] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

    useEffect(() => {
        if (isVisible) {
            calculateStats();
        }
    }, [isVisible, vectorDocuments, sharedDocuments, agents]);

    const calculateStats = async () => {
        setIsLoading(true);
        try {
            const now = Date.now();
            const oneHourAgo = now - (60 * 60 * 1000);

            const agentStats: AgentMemoryStats[] = [];

            for (const agent of agents) {
                const privateDocs = vectorDocuments[agent.id] || [];
                const sharedDocs = sharedDocuments['common-room'] || [];

                // Filter shared docs by this agent
                const agentSharedDocs = sharedDocs.filter(d => d.agentId === agent.id);

                // Calculate scores
                const allDocs = [...privateDocs, ...agentSharedDocs];
                const totalScore = allDocs.reduce((sum, d) => sum + (d.utilityScore || 0), 0);
                const avgScore = allDocs.length > 0 ? totalScore / allDocs.length : 0;

                // Recent memories (last hour)
                const recentMemories = privateDocs.filter(d =>
                    d.timestamp && d.timestamp > oneHourAgo
                ).length;

                // Oldest and newest
                const timestamps = privateDocs.map(d => d.timestamp).filter(Boolean);

                agentStats.push({
                    agentId: agent.id,
                    agentName: agent.name,
                    privateCount: privateDocs.length,
                    sharedCount: agentSharedDocs.length,
                    totalScore,
                    avgScore,
                    recentMemories,
                    oldestTimestamp: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
                    newestTimestamp: timestamps.length > 0 ? Math.max(...timestamps) : undefined
                });
            }

            // Sort by total memories (private + shared)
            agentStats.sort((a, b) => (b.privateCount + b.sharedCount) - (a.privateCount + a.sharedCount));

            setStats(agentStats);
            setTotalShared((sharedDocuments['common-room'] || []).length);
            setLastUpdate(Date.now());
        } catch (error) {
            console.error('[MemoryStats] Error calculating stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (timestamp?: number) => {
        if (!timestamp) return '-';
        const date = new Date(timestamp);
        return date.toLocaleString('it-IT', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatRelativeTime = (timestamp?: number) => {
        if (!timestamp) return '-';
        const minutes = Math.floor((Date.now() - timestamp) / 60000);
        if (minutes < 60) return `${minutes}m fa`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h fa`;
        return `${Math.floor(hours / 24)}g fa`;
    };

    const getScoreColor = (score: number): string => {
        if (score >= 15) return '#10b981'; // green
        if (score >= 5) return '#f59e0b';  // amber
        if (score >= 0) return '#6b7280';  // gray
        return '#ef4444'; // red (negative)
    };

    if (!isVisible) {
        return (
            <button
                onClick={onToggle}
                className="fixed bottom-4 right-4 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg z-50 transition-all"
                title="Statistiche Memoria"
            >
                🧠
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 w-96 max-h-[70vh] bg-gray-900 border border-purple-500/30 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">🧠</span>
                    <div>
                        <h3 className="text-white font-bold">Memoria Sistema</h3>
                        <p className="text-purple-300 text-xs">
                            Aggiornato: {formatRelativeTime(lastUpdate)}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={calculateStats}
                        className="text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
                        title="Ricarica"
                    >
                        🔄
                    </button>
                    <button
                        onClick={onToggle}
                        className="text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Global Stats */}
            <div className="bg-gray-800/50 p-3 border-b border-gray-700 grid grid-cols-3 gap-2 text-center">
                <div>
                    <div className="text-xl font-bold text-purple-400">
                        {stats.reduce((sum, s) => sum + s.privateCount, 0)}
                    </div>
                    <div className="text-xs text-gray-400">Private</div>
                </div>
                <div>
                    <div className="text-xl font-bold text-blue-400">{totalShared}</div>
                    <div className="text-xs text-gray-400">Condivise</div>
                </div>
                <div>
                    <div className="text-xl font-bold text-green-400">
                        {stats.reduce((sum, s) => sum + s.recentMemories, 0)}
                    </div>
                    <div className="text-xs text-gray-400">Ultima ora</div>
                </div>
            </div>

            {/* Agent List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {isLoading ? (
                    <div className="text-center py-8 text-gray-400">
                        <div className="animate-pulse">Caricamento...</div>
                    </div>
                ) : stats.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        Nessun agente trovato
                    </div>
                ) : (
                    stats.map(agent => (
                        <div
                            key={agent.agentId}
                            className="bg-gray-800/50 rounded-lg p-3 hover:bg-gray-800 transition-colors"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-white truncate">
                                    {agent.agentName}
                                </span>
                                <span
                                    className="text-sm font-mono px-2 py-0.5 rounded"
                                    style={{
                                        backgroundColor: `${getScoreColor(agent.avgScore)}20`,
                                        color: getScoreColor(agent.avgScore)
                                    }}
                                >
                                    ⚡ {agent.avgScore.toFixed(1)}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="text-center bg-purple-900/30 p-1 rounded">
                                    <div className="text-purple-400 font-bold">{agent.privateCount}</div>
                                    <div className="text-gray-500">Private</div>
                                </div>
                                <div className="text-center bg-blue-900/30 p-1 rounded">
                                    <div className="text-blue-400 font-bold">{agent.sharedCount}</div>
                                    <div className="text-gray-500">Shared</div>
                                </div>
                                <div className="text-center bg-green-900/30 p-1 rounded">
                                    <div className="text-green-400 font-bold">{agent.recentMemories}</div>
                                    <div className="text-gray-500">Recenti</div>
                                </div>
                            </div>

                            {agent.newestTimestamp && (
                                <div className="text-xs text-gray-500 mt-2">
                                    Ultima: {formatRelativeTime(agent.newestTimestamp)}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="bg-gray-800/30 p-2 text-center text-xs text-gray-500 border-t border-gray-700">
                🕯️ Sistema Memoria Silicean
            </div>
        </div>
    );
};

export default MemoryStatsPanel;
