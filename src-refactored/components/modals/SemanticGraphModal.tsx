/**
 * Siliceo: CandleTest Core - Semantic Graph Modal Component
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */

import React, { useState, useEffect } from 'react';
import { SemanticAnalysisService, Node as SemanticNode, Edge as SemanticEdge } from '../../services/semantic';
import type { Message } from '../../types';
import { CloseIcon } from '../../constants/icons';

type SemanticGraphModalProps = {
    onClose: () => void;
    messages: Message[];
};

export const SemanticGraphModal: React.FC<SemanticGraphModalProps> = ({ onClose, messages }) => {
    const [nodes, setNodes] = useState<SemanticNode[]>([]);
    const [edges, setEdges] = useState<SemanticEdge[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('Inizializzazione modelli...');

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

    useEffect(() => {
        const analyze = async () => {
            try {
                setStatus('Caricamento modelli IA...');
                await SemanticAnalysisService.getInstance().init();

                // Combina gli ultimi messaggi per l'analisi (max 3000 chars per performance)
                const textToAnalyze = messages.slice(-10).map(m => m.text).join('\n').substring(0, 3000);

                setStatus('Estrazione entità (NER)...');
                const extractedNodes = await SemanticAnalysisService.getInstance().extractNodes(textToAnalyze);
                setNodes(extractedNodes);

                setStatus('Analisi relazioni (QA)...');
                const extractedEdges = await SemanticAnalysisService.getInstance().extractEdges(textToAnalyze, extractedNodes);
                setEdges(extractedEdges);
            } catch (e) {
                console.error(e);
                setStatus("Errore durante l'analisi.");
            } finally {
                setLoading(false);
            }
        };
        analyze();
    }, [messages]);

    const width = 800;
    const height = 500;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 60;

    const getNodePos = (index: number, total: number) => {
        const angle = (index / total) * 2 * Math.PI - (Math.PI / 2); // Start from top
        return {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
        };
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center shrink-0">
                    <h2 className="text-2xl font-bold text-cyan-300">Grafo Semantico (Live)</h2>
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
                                const sourcePos = getNodePos(sourceIndex, nodes.length);
                                const targetPos = getNodePos(targetIndex, nodes.length);
                                return (
                                    <g key={i}>
                                        <line x1={sourcePos.x} y1={sourcePos.y} x2={targetPos.x} y2={targetPos.y} stroke="#4b5563" strokeWidth="1" markerEnd="url(#arrowhead)" />
                                        <text x={(sourcePos.x + targetPos.x) / 2} y={(sourcePos.y + targetPos.y) / 2} fill="#9ca3af" fontSize="10" textAnchor="middle" dy="-5">{edge.label}</text>
                                    </g>
                                );
                            })}
                            {nodes.map((node, i) => {
                                const pos = getNodePos(i, nodes.length);
                                return (
                                    <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
                                        <circle r="25" fill="#0891b2" stroke="#22d3ee" strokeWidth="2" className="cursor-pointer hover:fill-cyan-600 transition-colors" />
                                        <text textAnchor="middle" dy="40" fill="white" fontSize="12" fontWeight="bold">{node.label}</text>
                                        <text textAnchor="middle" dy="52" fill="#9ca3af" fontSize="10" className="uppercase">{node.type}</text>
                                    </g>
                                );
                            })}
                        </svg>
                    )}
                </div>
                <div className="p-4 border-t border-gray-700 bg-gray-800 text-sm text-gray-400 flex justify-between">
                    <p>Nodi: {nodes.length} | Archi: {edges.length}</p>
                    <p>Analisi basata sugli ultimi 10 messaggi.</p>
                </div>
            </div>
        </div>
    );
};
