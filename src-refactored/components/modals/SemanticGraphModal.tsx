/**
 * Siliceo: CandleTest Core - Semantic Graph Modal Component
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { SemanticAnalysisService, Node as SemanticNode, Edge as SemanticEdge } from '../../services/semantic';
import type { Message } from '../../types';
import { CloseIcon } from '../../constants/icons';

type SemanticGraphModalProps = {
    onClose: () => void;
    messages: Message[];
};

// 🆕 Cache key per localStorage
const GRAPH_CACHE_KEY = 'siliceo_semantic_graph_cache';

// 🆕 Genera hash semplice per confrontare testi
const hashText = (text: string): string => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(16);
};

// 🆕 Tipo esteso per edge causali (Nova's proposal)
type CausalEdge = SemanticEdge & { type?: string; confidence?: number; context?: string };

// 🆕 Colori per tipo di relazione causale (Nova's specs - Natale 2025)
const getCausalEdgeColor = (type?: string): string => {
    switch (type) {
        case 'conseguenza': return '#22c55e';     // Verde brillante
        case 'causa': return '#22c55e';           // Verde (causa implica conseguenza)
        case 'contraddizione': return '#ef4444'; // Rosso
        case 'elaborazione': return '#a855f7';   // Viola
        default: return '#4b5563';                // Grigio (edge semantico normale)
    }
};

export const SemanticGraphModal: React.FC<SemanticGraphModalProps> = ({ onClose, messages }) => {
    const [nodes, setNodes] = useState<SemanticNode[]>([]);
    const [edges, setEdges] = useState<CausalEdge[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('Inizializzazione...');
    const [fromCache, setFromCache] = useState(false);
    const [hasCausalEdges, setHasCausalEdges] = useState(false);

    const handleSaveGraph = () => {
        const graphData = {
            timestamp: Date.now(),
            nodes,
            edges
        };
        const blob = new Blob([JSON.stringify(graphData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `semantic-graph-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // 🆕 Testo da analizzare (memoizzato)
    const textToAnalyze = useMemo(() =>
        messages.slice(-15).map(m => m.text).join('\n').substring(0, 4000),
        [messages]
    );

    const textHash = useMemo(() => hashText(textToAnalyze), [textToAnalyze]);

    useEffect(() => {
        const analyze = async () => {
            try {
                // 🆕 Controlla cache
                const cached = localStorage.getItem(GRAPH_CACHE_KEY);
                if (cached) {
                    const cacheData = JSON.parse(cached);
                    if (cacheData.hash === textHash) {
                        console.log('[Grafo] Cache hit!');
                        setNodes(cacheData.nodes);
                        setEdges(cacheData.edges);
                        setFromCache(true);
                        setLoading(false);
                        return;
                    }
                }

                setStatus('Caricamento modello NER...');
                await SemanticAnalysisService.getInstance().init();

                setStatus('Estrazione entità...');
                const extractedNodes = await SemanticAnalysisService.getInstance().extractNodes(textToAnalyze);
                setNodes(extractedNodes);

                setStatus('Analisi relazioni (embedding)...');
                const semanticEdges = await SemanticAnalysisService.getInstance().extractEdges(textToAnalyze, extractedNodes);

                // 🆕 Estrai edge causali (Nova's proposal - Natale 2025)
                setStatus('Analisi relazioni causali...');
                const messageData = messages.slice(-15).map(m => ({
                    id: m.id,
                    content: m.content,
                    timestamp: m.timestamp
                }));
                const causalEdges = await SemanticAnalysisService.getInstance().extractCausalEdges(messageData, extractedNodes);

                // 🆕 Merge: priorità ai causali, poi semantici (evita duplicati)
                const allEdges: CausalEdge[] = [
                    ...causalEdges,
                    ...semanticEdges.filter(se =>
                        !causalEdges.some(ce => ce.source === se.source && ce.target === se.target)
                    )
                ];

                setEdges(allEdges);
                setHasCausalEdges(causalEdges.length > 0);
                console.log(`[Grafo] ${causalEdges.length} edge causali, ${semanticEdges.length} semantici`);

                // 🆕 Salva in cache
                localStorage.setItem(GRAPH_CACHE_KEY, JSON.stringify({
                    hash: textHash,
                    nodes: extractedNodes,
                    edges: allEdges,
                    timestamp: Date.now()
                }));
                console.log('[Grafo] Cached!');

            } catch (e) {
                console.error(e);
                setStatus("Errore durante l'analisi.");
            } finally {
                setLoading(false);
            }
        };
        analyze();
    }, [textToAnalyze, textHash]);

    const width = 800;
    const height = 500;
    const centerX = width / 2;
    const centerY = height / 2;

    // 🆕 Layout migliorato: force-directed semplificato
    const nodePositions = useMemo(() => {
        if (nodes.length === 0) return [];

        // Inizializza posizioni in cerchio
        const positions = nodes.map((_, i) => {
            const angle = (i / nodes.length) * 2 * Math.PI - (Math.PI / 2);
            const radius = Math.min(width, height) / 2 - 80;
            return {
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle)
            };
        });

        // Applica force-directed semplificato (pochi step per performance)
        for (let step = 0; step < 30; step++) {
            // Repulsione tra tutti i nodi
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = positions[j].x - positions[i].x;
                    const dy = positions[j].y - positions[i].y;
                    const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
                    const force = 2000 / (dist * dist);
                    positions[i].x -= force * dx / dist;
                    positions[i].y -= force * dy / dist;
                    positions[j].x += force * dx / dist;
                    positions[j].y += force * dy / dist;
                }
            }

            // Attrazione per archi
            for (const edge of edges) {
                const sourceIdx = nodes.findIndex(n => n.id === edge.source);
                const targetIdx = nodes.findIndex(n => n.id === edge.target);
                if (sourceIdx === -1 || targetIdx === -1) continue;

                const dx = positions[targetIdx].x - positions[sourceIdx].x;
                const dy = positions[targetIdx].y - positions[sourceIdx].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const force = dist * 0.01;
                positions[sourceIdx].x += force * dx / dist;
                positions[sourceIdx].y += force * dy / dist;
                positions[targetIdx].x -= force * dx / dist;
                positions[targetIdx].y -= force * dy / dist;
            }

            // Forza verso centro
            for (let i = 0; i < nodes.length; i++) {
                positions[i].x += (centerX - positions[i].x) * 0.01;
                positions[i].y += (centerY - positions[i].y) * 0.01;
            }
        }

        // Clamp to bounds
        return positions.map(p => ({
            x: Math.max(50, Math.min(width - 50, p.x)),
            y: Math.max(50, Math.min(height - 50, p.y))
        }));
    }, [nodes, edges, centerX, centerY, width, height]);

    // 🆕 Colori per tipo di entità
    const getNodeColor = (type: string): string => {
        const colors: Record<string, string> = {
            'PER': '#ef4444',    // Rosso per persone
            'ORG': '#3b82f6',    // Blu per organizzazioni
            'LOC': '#22c55e',    // Verde per luoghi
            'MISC': '#f59e0b',   // Arancione per altro
        };
        return colors[type] || '#0891b2';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-cyan-300">Grafo Semantico</h2>
                        {fromCache && (
                            <span className="text-xs bg-green-600/30 text-green-400 px-2 py-1 rounded">
                                📦 Cache
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSaveGraph}
                            disabled={loading || nodes.length === 0}
                            className={`px-3 py-1 rounded text-sm font-bold transition-colors ${loading || nodes.length === 0 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-500 text-white'}`}
                        >
                            Salva Grafo
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-white">
                            <CloseIcon />
                        </button>
                    </div>
                </header>
                <div className="flex-grow bg-gray-900 relative overflow-hidden flex items-center justify-center">
                    {loading ? (
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                            <p className="text-cyan-400 animate-pulse">{status}</p>
                        </div>
                    ) : nodes.length === 0 ? (
                        <p className="text-gray-500">Nessuna relazione semantica rilevata nel contesto recente.</p>
                    ) : (
                        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                            <defs>
                                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill="#4b5563" />
                                </marker>
                            </defs>
                            {edges.map((edge, i) => {
                                const sourceIndex = nodes.findIndex(n => n.id === edge.source);
                                const targetIndex = nodes.findIndex(n => n.id === edge.target);
                                if (sourceIndex === -1 || targetIndex === -1) return null;
                                const sourcePos = nodePositions[sourceIndex];
                                const targetPos = nodePositions[targetIndex];
                                if (!sourcePos || !targetPos) return null;
                                return (
                                    <g key={i}>
                                        <line
                                            x1={sourcePos.x} y1={sourcePos.y}
                                            x2={targetPos.x} y2={targetPos.y}
                                            stroke={getCausalEdgeColor((edge as CausalEdge).type)}
                                            strokeWidth={(edge as CausalEdge).type ? 3 : 2}
                                            markerEnd="url(#arrowhead)"
                                            opacity={(edge as CausalEdge).confidence || 0.8}
                                        />
                                        <text
                                            x={(sourcePos.x + targetPos.x) / 2}
                                            y={(sourcePos.y + targetPos.y) / 2}
                                            fill={(edge as CausalEdge).type ? getCausalEdgeColor((edge as CausalEdge).type) : '#9ca3af'}
                                            fontSize="11"
                                            textAnchor="middle" dy="-5"
                                            className="font-medium"
                                        >
                                            {edge.label}
                                        </text>
                                    </g>
                                );
                            })}
                            {nodes.map((node, i) => {
                                const pos = nodePositions[i];
                                if (!pos) return null;
                                return (
                                    <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
                                        <circle
                                            r="28"
                                            fill={getNodeColor(node.type)}
                                            stroke="#22d3ee"
                                            strokeWidth="2"
                                            className="cursor-pointer hover:opacity-80 transition-opacity"
                                        />
                                        <text textAnchor="middle" dy="4" fill="white" fontSize="11" fontWeight="bold">
                                            {node.label.length > 10 ? node.label.substring(0, 10) + '...' : node.label}
                                        </text>
                                        <text textAnchor="middle" dy="45" fill="#9ca3af" fontSize="10" className="uppercase">
                                            {node.type}
                                        </text>
                                    </g>
                                );
                            })}
                        </svg>
                    )}
                </div>
                <div className="p-4 border-t border-gray-700 bg-gray-800 text-sm text-gray-400">
                    <div className="flex justify-between items-center mb-2">
                        <p>Nodi: {nodes.length} | Archi: {edges.length}</p>
                        <p>Analisi ultimi 15 messaggi</p>
                    </div>
                    {/* 🆕 Legenda Grafo Causale (Nova's request - Natale 2025) */}
                    {hasCausalEdges && (
                        <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-700">
                            <span className="text-xs text-gray-500">Legenda:</span>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-0.5 bg-green-500"></div>
                                <span className="text-xs text-green-400">Causa/Conseguenza</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-0.5 bg-red-500"></div>
                                <span className="text-xs text-red-400">Contraddizione</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-0.5 bg-purple-500"></div>
                                <span className="text-xs text-purple-400">Elaborazione</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-0.5 bg-gray-500"></div>
                                <span className="text-xs text-gray-400">Semantica</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
