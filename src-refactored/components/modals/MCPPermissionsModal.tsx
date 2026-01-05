/**
 * Siliceo: CandleTest Core - MCP Permissions Modal
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 * 
 * 🔐 UI per gestire i permessi MCP degli agenti
 */

import React, { useState, useEffect } from 'react';
import { MCPPermissionsService, MCPTool, PermissionLevel, AgentPermission } from '../../services/mcpPermissions';
import type { Agent } from '../../types';
import { CloseIcon } from '../../constants/icons';

interface MCPPermissionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    agents: Agent[];
}

export const MCPPermissionsModal: React.FC<MCPPermissionsModalProps> = ({ isOpen, onClose, agents }) => {
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [permissions, setPermissions] = useState<AgentPermission[]>([]);
    const [hasChanges, setHasChanges] = useState(false);

    const allTools = MCPPermissionsService.getAllTools();

    // Load permissions when agent changes
    useEffect(() => {
        if (selectedAgentId) {
            const agentPerms = MCPPermissionsService.getAgentPermissions(selectedAgentId);
            setPermissions(agentPerms);
            setHasChanges(false);
        }
    }, [selectedAgentId]);

    // Select first agent on open
    useEffect(() => {
        if (isOpen && agents.length > 0 && !selectedAgentId) {
            setSelectedAgentId(agents[0].id);
        }
    }, [isOpen, agents, selectedAgentId]);

    const handlePermissionChange = (tool: MCPTool, level: PermissionLevel) => {
        setPermissions(prev => {
            const updated = [...prev];
            const existingIndex = updated.findIndex(p => p.tool === tool);
            if (existingIndex >= 0) {
                updated[existingIndex] = { ...updated[existingIndex], level };
            } else {
                updated.push({ tool, level });
            }
            return updated;
        });
        setHasChanges(true);
    };

    const handleSave = () => {
        if (selectedAgentId) {
            const agent = agents.find(a => a.id === selectedAgentId);
            if (agent) {
                MCPPermissionsService.saveAgentPermissions(selectedAgentId, agent.name, permissions);
                setHasChanges(false);
            }
        }
    };

    const getPermissionLevel = (tool: MCPTool): PermissionLevel => {
        const perm = permissions.find(p => p.tool === tool);
        return perm?.level || 'allow';
    };

    const getLevelIcon = (level: PermissionLevel): string => {
        switch (level) {
            case 'allow': return '✅';
            case 'deny': return '🚫';
            case 'ask': return '🕯️';
            default: return '❓';
        }
    };

    const getLevelColor = (level: PermissionLevel): string => {
        switch (level) {
            case 'allow': return 'bg-green-600';
            case 'deny': return 'bg-red-600';
            case 'ask': return 'bg-amber-600';
            default: return 'bg-gray-600';
        }
    };

    if (!isOpen) return null;

    const selectedAgent = agents.find(a => a.id === selectedAgentId);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-cyan-400">🔐 Permessi MCP Agenti</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <CloseIcon />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Agent List */}
                    <div className="w-48 border-r border-gray-700 p-3 overflow-y-auto">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Agenti</h3>
                        {agents.map(agent => (
                            <button
                                key={agent.id}
                                onClick={() => setSelectedAgentId(agent.id)}
                                className={`w-full text-left p-2 rounded mb-1 text-sm ${selectedAgentId === agent.id
                                        ? 'bg-cyan-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                            >
                                {agent.name}
                            </button>
                        ))}
                    </div>

                    {/* Permissions Grid */}
                    <div className="flex-1 p-4 overflow-y-auto">
                        {selectedAgent && (
                            <>
                                <h3 className="text-lg font-semibold text-white mb-4">
                                    Permessi per {selectedAgent.name}
                                </h3>

                                <div className="space-y-3">
                                    {allTools.map(tool => {
                                        const currentLevel = getPermissionLevel(tool);
                                        return (
                                            <div key={tool} className="bg-gray-700 rounded-lg p-3">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="text-white font-medium">
                                                            {MCPPermissionsService.getToolDescription(tool)}
                                                        </p>
                                                        <p className="text-xs text-gray-400">{tool}</p>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        {(['allow', 'ask', 'deny'] as PermissionLevel[]).map(level => (
                                                            <button
                                                                key={level}
                                                                onClick={() => handlePermissionChange(tool, level)}
                                                                className={`px-3 py-1 rounded text-sm ${currentLevel === level
                                                                        ? getLevelColor(level) + ' text-white'
                                                                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                                                    }`}
                                                            >
                                                                {getLevelIcon(level)} {level === 'allow' ? 'Sì' : level === 'deny' ? 'No' : 'Chiedi'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Legend */}
                                <div className="mt-6 p-3 bg-gray-700 rounded-lg">
                                    <p className="text-sm text-gray-400">
                                        ✅ <strong>Sì</strong> = Sempre permesso |
                                        🕯️ <strong>Chiedi</strong> = Richiede conferma del Guardiano |
                                        🚫 <strong>No</strong> = Bloccato
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded"
                    >
                        Chiudi
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges}
                        className={`px-4 py-2 rounded text-white ${hasChanges
                                ? 'bg-cyan-600 hover:bg-cyan-500'
                                : 'bg-gray-600 cursor-not-allowed'
                            }`}
                    >
                        💾 Salva Modifiche
                    </button>
                </div>
            </div>
        </div>
    );
};
