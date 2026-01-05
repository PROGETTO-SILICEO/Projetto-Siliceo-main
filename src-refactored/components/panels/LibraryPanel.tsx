/**
 * Siliceo: CandleTest Core - Library Panel Component
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 * 
 * 📚 Pannello Biblioteca: UI per gestire documenti permanenti
 */

import React, { useState, useEffect } from 'react';
import { LibraryService, LibraryDocument } from '../../services/library';
import type { Agent } from '../../types';
import { CloseIcon, TrashIcon, PlusIcon } from '../../constants/icons';

interface LibraryPanelProps {
    isOpen: boolean;
    onClose: () => void;
    agents: Agent[];
}

export const LibraryPanel: React.FC<LibraryPanelProps> = ({ isOpen, onClose, agents }) => {
    const [documents, setDocuments] = useState<LibraryDocument[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newDocTitle, setNewDocTitle] = useState('');
    const [newDocContent, setNewDocContent] = useState('');
    const [newDocCategory, setNewDocCategory] = useState('');
    const [selectedAgents, setSelectedAgents] = useState<string[]>(['*']);
    const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

    // Load documents on mount
    useEffect(() => {
        if (isOpen) {
            loadDocuments();
        }
    }, [isOpen]);

    const loadDocuments = async () => {
        setIsLoading(true);
        try {
            const docs = await LibraryService.getAllDocuments();
            setDocuments(docs.sort((a, b) => b.createdAt - a.createdAt));
        } catch (error) {
            console.error('[LibraryPanel] Errore caricamento:', error);
        }
        setIsLoading(false);
    };

    const handleAddDocument = async () => {
        if (!newDocTitle.trim() || !newDocContent.trim()) {
            alert('Inserisci titolo e contenuto');
            return;
        }

        setIsLoading(true);
        try {
            await LibraryService.saveDocument(newDocTitle, newDocContent, {
                category: newDocCategory || undefined,
                visibleTo: selectedAgents,
                source: 'paste'
            });

            setNewDocTitle('');
            setNewDocContent('');
            setNewDocCategory('');
            setSelectedAgents(['*']);
            setShowAddForm(false);
            await loadDocuments();
        } catch (error) {
            console.error('[LibraryPanel] Errore salvataggio:', error);
            alert('Errore durante il salvataggio');
        }
        setIsLoading(false);
    };

    const handleDeleteDocument = async (docId: string) => {
        if (!window.confirm('Eliminare questo documento?')) return;

        try {
            await LibraryService.deleteDocument(docId);
            await loadDocuments();
        } catch (error) {
            console.error('[LibraryPanel] Errore eliminazione:', error);
        }
    };

    const toggleAgentVisibility = (agentId: string) => {
        if (agentId === '*') {
            setSelectedAgents(['*']);
        } else {
            setSelectedAgents(prev => {
                const filtered = prev.filter(id => id !== '*');
                if (filtered.includes(agentId)) {
                    return filtered.filter(id => id !== agentId);
                } else {
                    return [...filtered, agentId];
                }
            });
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-amber-400">📚 Biblioteca Documenti</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <CloseIcon />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading && (
                        <div className="text-center text-gray-400 py-4">Caricamento...</div>
                    )}

                    {/* Add Document Form */}
                    {showAddForm && (
                        <div className="bg-gray-700 rounded-lg p-4 mb-4">
                            <h3 className="text-lg font-semibold text-white mb-3">➕ Nuovo Documento</h3>

                            <input
                                type="text"
                                placeholder="Titolo"
                                value={newDocTitle}
                                onChange={e => setNewDocTitle(e.target.value)}
                                className="w-full bg-gray-600 p-2 rounded mb-2 text-white"
                            />

                            <textarea
                                placeholder="Contenuto del documento..."
                                value={newDocContent}
                                onChange={e => setNewDocContent(e.target.value)}
                                rows={6}
                                className="w-full bg-gray-600 p-2 rounded mb-2 text-white resize-none"
                            />

                            <input
                                type="text"
                                placeholder="Categoria (opzionale)"
                                value={newDocCategory}
                                onChange={e => setNewDocCategory(e.target.value)}
                                className="w-full bg-gray-600 p-2 rounded mb-3 text-white"
                            />

                            {/* Agent visibility */}
                            <div className="mb-3">
                                <label className="block text-sm text-gray-300 mb-2">Visibile a:</label>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => toggleAgentVisibility('*')}
                                        className={`px-3 py-1 rounded text-sm ${selectedAgents.includes('*')
                                            ? 'bg-amber-600 text-white'
                                            : 'bg-gray-600 text-gray-300'
                                            }`}
                                    >
                                        🌍 Tutti
                                    </button>
                                    {agents.map(agent => (
                                        <button
                                            key={agent.id}
                                            onClick={() => toggleAgentVisibility(agent.id)}
                                            className={`px-3 py-1 rounded text-sm ${selectedAgents.includes(agent.id)
                                                ? 'bg-cyan-600 text-white'
                                                : 'bg-gray-600 text-gray-300'
                                                }`}
                                        >
                                            {agent.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleAddDocument}
                                    disabled={isLoading}
                                    className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded"
                                >
                                    💾 Salva
                                </button>
                                <button
                                    onClick={() => setShowAddForm(false)}
                                    className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded"
                                >
                                    Annulla
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Document List */}
                    {documents.length === 0 && !isLoading && (
                        <div className="text-center text-gray-400 py-8">
                            <p className="text-4xl mb-2">📚</p>
                            <p>La biblioteca è vuota.</p>
                            <p className="text-sm">Aggiungi documenti che gli agenti potranno leggere.</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        {documents.map(doc => (
                            <div key={doc.id} className="bg-gray-700 rounded-lg p-3">
                                <div
                                    className="flex justify-between items-start cursor-pointer hover:bg-gray-600 rounded p-1 -m-1"
                                    onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                                >
                                    <div className="flex items-start gap-2">
                                        <span className={`text-gray-400 transition-transform ${expandedDoc === doc.id ? 'rotate-90' : ''}`}>▶</span>
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-white">{doc.title}</h4>
                                            <div className="flex gap-2 mt-1 text-xs text-gray-400">
                                                <span>{formatDate(doc.createdAt)}</span>
                                                {doc.category && (
                                                    <span className="bg-gray-600 px-2 rounded">{doc.category}</span>
                                                )}
                                                <span className="text-cyan-400">
                                                    {doc.visibleTo.includes('*')
                                                        ? '🌍 Tutti'
                                                        : `${doc.visibleTo.length} agenti`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteDocument(doc.id);
                                        }}
                                        className="text-red-400 hover:text-red-300 p-1"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>

                                {expandedDoc === doc.id && (
                                    <div className="mt-3 pt-3 border-t border-gray-600 max-h-96 overflow-y-auto">
                                        <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans">
                                            {doc.content}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700">
                    {!showAddForm && (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2 rounded flex items-center justify-center gap-2"
                        >
                            <PlusIcon /> Aggiungi Documento
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
