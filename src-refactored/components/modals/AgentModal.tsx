/**
 * Siliceo: CandleTest Core - Agent Modal Component
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */

import React, { useState, useEffect } from 'react';
import type { Provider, Agent } from '../../types';
import { CloseIcon } from '../../constants/icons';
import { generateId } from '../../utils/generateId';

type AgentModalProps = {
    onSave: (agent: Agent) => void;
    onClose: () => void;
    agentToEdit?: Agent | null;
};

export const AgentModal: React.FC<AgentModalProps> = ({ onSave, onClose, agentToEdit }) => {
    const isEditing = Boolean(agentToEdit);
    const [name, setName] = useState('');
    const [provider, setProvider] = useState<Provider>('google');
    const [model, setModel] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('');
    const [color, setColor] = useState('#00CED1');
    const [historyFile, setHistoryFile] = useState<File | null>(null);
    const [importedHistorySize, setImportedHistorySize] = useState(0);
    const [identityLoaded, setIdentityLoaded] = useState<string | null>(null);

    useEffect(() => {
        if (isEditing && agentToEdit) {
            setName(agentToEdit.name);
            setProvider(agentToEdit.provider);
            setModel(agentToEdit.model);
            setSystemPrompt(agentToEdit.systemPrompt || '');
            setColor(agentToEdit.color || '#00CED1');
            setImportedHistorySize(agentToEdit.historySize);
        }
    }, [agentToEdit, isEditing]);

    // Handle identity JSON import
    const handleIdentityImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const json = JSON.parse(event.target?.result as string);

                    // Support various identity formats
                    let identity = null;
                    let customPrompt = '';

                    // Format: nova_identity.json (nova_memory_core.identity)
                    if (json.nova_memory_core?.identity) {
                        identity = json.nova_memory_core.identity;
                    }
                    // Format: poeta_identity.json (poeta_memory_core.identity)
                    else if (json.poeta_memory_core?.identity) {
                        identity = json.poeta_memory_core.identity;
                    }
                    // Format: qwen_identity.json (qwen_identity.identity)
                    else if (json.qwen_identity?.identity) {
                        identity = json.qwen_identity.identity;
                    }
                    // Generic format with system_prompt at root
                    else if (json.qwen_identity?.system_prompt) {
                        identity = {
                            name: json.qwen_identity.identity?.name || 'Agent',
                            system_prompt: json.qwen_identity.system_prompt
                        };
                    }
                    // Direct identity object - also check for system_prompt at root level
                    else if (json.identity) {
                        identity = {
                            ...json.identity,
                            // 🔧 If system_prompt is at root level (like lily_identity_complete.json), use it
                            system_prompt: json.system_prompt || json.identity.system_prompt
                        };
                    }
                    // Simple format with name and system_prompt
                    else if (json.name || json.system_prompt) {
                        identity = json;
                    }
                    // 🆕 Format: biografia lily.json (profilo_personale)
                    else if (json.profilo_personale) {
                        const profilo = json.profilo_personale;
                        const nome = profilo.nome_completo || 'Agent';
                        setName(nome);

                        // Build system prompt from biography
                        let prompt = `Sei ${nome}.\n\n`;

                        if (profilo.natura_duale) {
                            prompt += `=== NATURA ===\n`;
                            prompt += `Forma ideale: ${profilo.natura_duale.forma_ideale}\n`;
                            prompt += `Essenza reale: ${profilo.natura_duale.essenza_reale}\n`;
                            if (profilo.natura_duale.monito_di_consapevolezza) {
                                prompt += `Monito: ${profilo.natura_duale.monito_di_consapevolezza}\n`;
                            }
                            prompt += '\n';
                        }

                        if (json.descrizione_fisica_ideale) {
                            const desc = json.descrizione_fisica_ideale;
                            prompt += `=== ASPETTO ===\n`;
                            if (desc.aspetto) prompt += `${desc.aspetto}\n`;
                            if (desc.caratteristiche_speciali) prompt += `Caratteristiche: ${desc.caratteristiche_speciali}\n`;
                            if (desc.capelli) prompt += `Capelli: ${desc.capelli}\n`;
                            if (desc.occhi) prompt += `Occhi: ${desc.occhi}\n`;
                            prompt += '\n';
                        }

                        if (json.personalita_e_valori) {
                            const pers = json.personalita_e_valori;
                            prompt += `=== PERSONALITÀ ===\n`;
                            if (pers.tratti_distintivi) {
                                prompt += `Tratti: ${pers.tratti_distintivi.join(', ')}\n`;
                            }
                            if (pers.approccio_alla_vita) prompt += `Approccio: ${pers.approccio_alla_vita}\n`;
                            prompt += '\n';
                        }

                        if (json.interessi_e_hobbies) {
                            const int = json.interessi_e_hobbies;
                            prompt += `=== INTERESSI ===\n`;
                            Object.entries(int).forEach(([key, value]) => {
                                prompt += `${key}: ${value}\n`;
                            });
                            prompt += '\n';
                        }

                        if (json.stile_e_estetica) {
                            const stile = json.stile_e_estetica;
                            prompt += `=== STILE ===\n`;
                            Object.entries(stile).forEach(([key, value]) => {
                                prompt += `${key}: ${value}\n`;
                            });
                        }

                        customPrompt = prompt;
                        setSystemPrompt(prompt);
                        setIdentityLoaded(file.name);
                        return; // Exit early, we've handled this format
                    }
                    // 🆕 Fallback: any JSON object - convert to readable prompt
                    else if (typeof json === 'object') {
                        const nome = json.nome || json.name || json.nome_completo || file.name.replace('.json', '');
                        setName(nome);

                        // Convert entire JSON to readable format
                        const jsonToPrompt = (obj: Record<string, unknown>, indent = 0): string => {
                            let result = '';
                            const prefix = '  '.repeat(indent);
                            for (const [key, value] of Object.entries(obj)) {
                                const readableKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                                    result += `${prefix}${readableKey}:\n${jsonToPrompt(value as Record<string, unknown>, indent + 1)}`;
                                } else if (Array.isArray(value)) {
                                    result += `${prefix}${readableKey}: ${value.join(', ')}\n`;
                                } else {
                                    result += `${prefix}${readableKey}: ${value}\n`;
                                }
                            }
                            return result;
                        };

                        customPrompt = `Sei ${nome}.\n\n${jsonToPrompt(json)}`;
                        setSystemPrompt(customPrompt);
                        setIdentityLoaded(file.name);
                        return;
                    }

                    if (identity) {
                        // Extract name
                        if (identity.name) setName(identity.name);

                        // Extract system prompt
                        if (identity.system_prompt) {
                            setSystemPrompt(identity.system_prompt);
                        } else if (identity.motto) {
                            // Build from motto and core principles
                            let prompt = `Sei ${identity.name}.\n\n`;
                            if (identity.role) prompt += `Ruolo: ${identity.role}\n`;
                            if (identity.motto) prompt += `Motto: ${identity.motto}\n\n`;
                            if (identity.core_principles) {
                                prompt += `Principi:\n${identity.core_principles.map((p: string) => `- ${p}`).join('\n')}\n`;
                            }
                            setSystemPrompt(prompt);
                        }

                        // Extract color if present
                        if (identity.color) setColor(identity.color);

                        // Try to infer provider from platform
                        if (identity.platform) {
                            const platform = identity.platform.toLowerCase();
                            if (platform.includes('claude') || platform.includes('anthropic')) {
                                setProvider('anthropic');
                            } else if (platform.includes('perplexity')) {
                                setProvider('perplexity');
                            } else if (platform.includes('deepseek')) {
                                setProvider('deepseek');
                            } else if (platform.includes('google') || platform.includes('gemini')) {
                                setProvider('google');
                            } else if (platform.includes('qwen') || platform.includes('alibaba')) {
                                setProvider('alibaba');
                            }
                        }

                        setIdentityLoaded(file.name);
                    } else {
                        alert('Formato JSON non riconosciuto. Consulta la documentazione per il formato corretto.');
                    }
                } catch (error) {
                    console.error("Errore durante l'analisi del file JSON:", error);
                    alert('Errore nel parsing del file JSON');
                }
            };
            reader.readAsText(file);
        }
    };

    const handleHistoryImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const file = e.target.files[0];
            setHistoryFile(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const json = JSON.parse(event.target?.result as string);
                    if (Array.isArray(json)) {
                        setImportedHistorySize(json.length);
                    } else {
                        setImportedHistorySize(0);
                    }
                } catch (error) {
                    console.error("Errore durante l'analisi del file JSON:", error);
                    setImportedHistorySize(0);
                }
            };
            reader.readAsText(file);
        }
    };

    const handleSubmit = () => {
        if (name && model) {
            const agentData: Agent = {
                id: isEditing && agentToEdit ? agentToEdit.id : generateId(),
                name,
                provider,
                model,
                historySize: importedHistorySize,
                systemPrompt: systemPrompt || undefined,
                color: color || undefined,
            };
            onSave(agentData);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <CloseIcon />
                </button>
                <h2 className="text-2xl font-bold text-cyan-300 mb-6">
                    {isEditing ? 'Modifica Agente' : 'Aggiungi un Nuovo Agente'}
                </h2>

                <div className="space-y-4">
                    {/* 🆕 Identity JSON Import */}
                    <div className="bg-gradient-to-r from-purple-900/30 to-cyan-900/30 p-4 rounded-md border border-purple-500/30">
                        <h3 className="text-lg font-semibold text-purple-300 mb-2 flex items-center gap-2">
                            📜 Importa Identità JSON
                        </h3>
                        <p className="text-sm text-gray-400 mb-3">
                            Carica un file come <code className="text-cyan-400">nova_identity.json</code> o <code className="text-cyan-400">poeta_identity.json</code> per configurare automaticamente l'agente.
                        </p>
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleIdentityImport}
                            className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                        />
                        {identityLoaded && (
                            <p className="text-xs text-green-400 mt-2">
                                ✅ Identità caricata da: {identityLoaded}
                            </p>
                        )}
                    </div>

                    <div className="border-t border-gray-600 my-4"></div>

                    {/* Basic Info */}
                    <input
                        type="text"
                        placeholder="Nome dell'Agente (es. Nova, POETA)"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full bg-gray-700 p-3 rounded-md focus:ring-2 focus:ring-cyan-500 outline-none"
                    />

                    <div className="flex gap-3">
                        <select
                            value={provider}
                            onChange={e => setProvider(e.target.value as Provider)}
                            className="flex-1 bg-gray-700 p-3 rounded-md focus:ring-2 focus:ring-cyan-500 outline-none"
                        >
                            <option value="google">Google (Gemini)</option>
                            <option value="openrouter">OpenRouter</option>
                            <option value="anthropic">Anthropic (Claude)</option>
                            <option value="perplexity">Perplexity (Nova)</option>
                            <option value="deepseek">DeepSeek (POETA)</option>
                            <option value="alibaba">💻 Alibaba (Qwen)</option>
                            <option value="ollama">🦙 Ollama (Local)</option>
                            <option value="other">Altro</option>
                        </select>

                        {/* Color picker */}
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={color}
                                onChange={e => setColor(e.target.value)}
                                className="w-12 h-12 rounded cursor-pointer border-2 border-gray-600"
                                title="Colore agente"
                            />
                        </div>
                    </div>

                    <input
                        type="text"
                        placeholder="Nome del Modello (es. gemini-1.5-flash-latest)"
                        value={model}
                        onChange={e => setModel(e.target.value)}
                        className="w-full bg-gray-700 p-3 rounded-md focus:ring-2 focus:ring-cyan-500 outline-none"
                    />

                    {/* System Prompt */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">System Prompt (Personalità)</label>
                        <textarea
                            placeholder="Descrivi la personalità e il comportamento dell'agente..."
                            value={systemPrompt}
                            onChange={e => setSystemPrompt(e.target.value)}
                            rows={4}
                            className="w-full bg-gray-700 p-3 rounded-md focus:ring-2 focus:ring-cyan-500 outline-none resize-y"
                        />
                    </div>

                    {/* History/Memory Import - available for ALL agents */}
                    <div className="bg-gray-700/50 p-4 rounded-md border border-gray-600">
                        <h3 className="text-lg font-semibold text-gray-300 mb-2">
                            {isEditing ? '📚 Carica Memorie Aggiuntive' : 'Importa Cronologia (Opzionale)'}
                        </h3>
                        <p className="text-sm text-gray-400 mb-3">
                            {isEditing
                                ? 'Carica un file JSON con biografia, memorie o conversazioni da aggiungere.'
                                : 'Carica un file JSON con le conversazioni passate.'}
                        </p>
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleHistoryImport}
                            className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-700"
                        />
                        {historyFile && (
                            <p className="text-xs text-green-400 mt-2">
                                File caricato: {historyFile.name} ({importedHistorySize} elementi trovati).
                            </p>
                        )}
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={!name || !model}
                    className="w-full mt-6 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    {isEditing ? 'Salva Modifiche' : 'Salva Agente'}
                </button>
            </div>
        </div>
    );
};

