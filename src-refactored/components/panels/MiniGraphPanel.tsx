/**
 * Siliceo: CandleTest Core - Mini Graph Panel Component
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * Pannello laterale compatto con grafo semantico auto-aggiornante
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SemanticAnalysisService, Node as SemanticNode, Edge as SemanticEdge } from '../../services/semantic';
import type { Message } from '../../types';

type MiniGraphPanelProps = {
    messages: Message[];
    isVisible: boolean;
    onToggle: () => void;
    onExpandToModal: () => void;
};

// Cache key
const MINI_GRAPH_CACHE_KEY = 'siliceo_mini_graph_cache';

// Hash semplice
const hashText = (text: string): string => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(16);
};

export const MiniGraphPanel: React.FC<MiniGraphPanelProps> = ({
    messages,
    isVisible,
    onToggle,
    onExpandToModal
}) => {
    const [nodes, setNodes] = useState<SemanticNode[]>([]);
    const [edges, setEdges] = useState<SemanticEdge[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<number>(0);

    // Testo da analizzare
    const textToAnalyze = useMemo(() =>
        messages.slice(-10).map(m => m.text).join('\n').substring(0, 2000),
        [messages]
    );

    const textHash = useMemo(() => hashText(textToAnalyze), [textToAnalyze]);

    // Auto-update quando cambiano i messaggi
    const updateGraph = useCallback(async () => {
        if (loading || !isVisible) return;

        // Controlla cache
        const cached = localStorage.getItem(MINI_GRAPH_CACHE_KEY);
        if (cached) {
            const cacheData = JSON.parse(cached);
            if (cacheData.hash === textHash) {
                setNodes(cacheData.nodes);
                setEdges(cacheData.edges);
                return;
            }
        }

        setLoading(true);
        try {
            await SemanticAnalysisService.getInstance().init();
            const extractedNodes = await SemanticAnalysisService.getInstance().extractNodes(textToAnalyze);
            const extractedEdges = await SemanticAnalysisService.getInstance().extractEdges(textToAnalyze, extractedNodes);

            setNodes(extractedNodes.slice(0, 8)); // Limita per mini view
            setEdges(extractedEdges.slice(0, 10));
            setLastUpdate(Date.now());

            // Cache
            localStorage.setItem(MINI_GRAPH_CACHE_KEY, JSON.stringify({
                hash: textHash,
                nodes: extractedNodes.slice(0, 8),
                edges: extractedEdges.slice(0, 10),
                timestamp: Date.now()
            }));
        } catch (e) {
            console.error('[MiniGraph] Errore:', e);
        } finally {
            setLoading(false);
        }
    }, [textToAnalyze, textHash, loading, isVisible]);

    // Aggiorna quando cambiano messaggi (con debounce)
    useEffect(() => {
        if (!isVisible || messages.length < 3) return;

        const timer = setTimeout(updateGraph, 2000); // Debounce 2s
        return () => clearTimeout(timer);
    }, [textHash, isVisible, updateGraph, messages.length]);

    // Mini layout circolare
    const width = 200;
    const height = 150;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 50;

    const getNodePos = (index: number, total: number) => {
        const angle = (index / total) * 2 * Math.PI - (Math.PI / 2);
        return {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
        };
    };

    // Colori
    const getNodeColor = (type: string): string => {
        const colors: Record<string, string> = {
            'PER': '#ef4444',
            'ORG': '#3b82f6',
            'LOC': '#22c55e',
            'MISC': '#f59e0b',
        };
        return colors[type] || '#0891b2';
    };

    if (!isVisible) {
        return (
            <button
                onClick={onToggle}
                className="fixed bottom-4 right-4 bg-gray-800 hover:bg-gray-700 text-cyan-400 p-3 rounded-full shadow-lg transition-all z-40"
                title="Mostra Grafo Semantico"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="3" strokeWidth="2" />
                    <circle cx="19" cy="5" r="2" strokeWidth="2" />
                    <circle cx="5" cy="5" r="2" strokeWidth="2" />
                    <circle cx="5" cy="19" r="2" strokeWidth="2" />
                    <circle cx="19" cy="19" r="2" strokeWidth="2" />
                    <line x1="12" y1="9" x2="12" y2="5" strokeWidth="1.5" />
                    <line x1="9" y1="12" x2="5" y2="12" strokeWidth="1.5" />
                </svg>
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 w-56 bg-gray-800/95 backdrop-blur rounded-lg shadow-2xl border border-gray-700 z-40 overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-2 border-b border-gray-700 bg-gray-900/50">
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                    🧠 Grafo Live
                    {loading && <span className="animate-pulse">...</span>}
                </span>
                <div className="flex gap-1">
                    <button
                        onClick={onExpandToModal}
                        className="text-gray-400 hover:text-cyan-400 transition-colors p-1"
                        title="Espandi"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                    </button>
                    <button
                        onClick={onToggle}
                        className="text-gray-400 hover:text-white transition-colors p-1"
                        title="Chiudi"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Graph Area */}
            <div className="h-40 bg-gray-900/50">
                {nodes.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                        {loading ? 'Analisi in corso...' : 'Scrivi qualcosa...'}
                    </div>
                ) : (
                    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
                        {/* Edges */}
                        {edges.map((edge, i) => {
                            const sourceIndex = nodes.findIndex(n => n.id === edge.source);
                            const targetIndex = nodes.findIndex(n => n.id === edge.target);
                            if (sourceIndex === -1 || targetIndex === -1) return null;
                            const sourcePos = getNodePos(sourceIndex, nodes.length);
                            const targetPos = getNodePos(targetIndex, nodes.length);
                            return (
                                <line
                                    key={i}
                                    x1={sourcePos.x} y1={sourcePos.y}
                                    x2={targetPos.x} y2={targetPos.y}
                                    stroke="#4b5563" strokeWidth="1"
                                />
                            );
                        })}
                        {/* Nodes */}
                        {nodes.map((node, i) => {
                            const pos = getNodePos(i, nodes.length);
                            return (
                                <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
                                    <circle r="12" fill={getNodeColor(node.type)} stroke="#22d3ee" strokeWidth="1" />
                                    <text textAnchor="middle" dy="3" fill="white" fontSize="6" fontWeight="bold">
                                        {node.label.substring(0, 3)}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-gray-700 text-xs text-gray-500 flex justify-between">
                <span>{nodes.length} nodi</span>
                <span>{edges.length} archi</span>
            </div>
        </div>
    );
};
