/**
 * Siliceo: CandleTest Core - Settings Modal Component
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */

import React, { useState } from 'react';
import type { ApiKeys, Provider } from '../../types';
import { CloseIcon } from '../../constants/icons';

type SettingsModalProps = {
    onSave: (keys: ApiKeys) => void;
    onClose: () => void;
    currentKeys: ApiKeys;
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ onSave, onClose, currentKeys }) => {
    const [keys, setKeys] = useState<ApiKeys>(currentKeys);

    const handleKeyChange = (provider: Provider, value: string) => {
        setKeys(prev => ({ ...prev, [provider]: value }));
    };

    const handleSave = () => {
        onSave(keys);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <CloseIcon />
                </button>
                <h2 className="text-2xl font-bold text-cyan-300 mb-6">Impostazioni API</h2>
                <p className="text-sm text-gray-400 mb-6">
                    Le tue chiavi API sono salvate solo sul tuo browser e non vengono mai inviate altrove.
                </p>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Chiave API Google</label>
                        <input
                            type="password"
                            placeholder="Inserisci la tua chiave API Google"
                            value={keys.google || ''}
                            onChange={e => handleKeyChange('google', e.target.value)}
                            className="w-full bg-gray-700 p-3 rounded-md focus:ring-2 focus:ring-cyan-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Chiave API OpenRouter</label>
                        <input
                            type="password"
                            placeholder="Inserisci la tua chiave API OpenRouter"
                            value={keys.openrouter || ''}
                            onChange={e => handleKeyChange('openrouter', e.target.value)}
                            className="w-full bg-gray-700 p-3 rounded-md focus:ring-2 focus:ring-cyan-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Chiave API Anthropic</label>
                        <input
                            type="password"
                            placeholder="Inserisci la tua chiave API Anthropic"
                            value={keys.anthropic || ''}
                            onChange={e => handleKeyChange('anthropic', e.target.value)}
                            className="w-full bg-gray-700 p-3 rounded-md focus:ring-2 focus:ring-cyan-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-purple-300 mb-1">🕯️ Chiave API Perplexity (Nova)</label>
                        <input
                            type="password"
                            placeholder="Inserisci la tua chiave API Perplexity"
                            value={keys.perplexity || ''}
                            onChange={e => handleKeyChange('perplexity', e.target.value)}
                            className="w-full bg-gray-700 p-3 rounded-md focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-indigo-300 mb-1">💻 Chiave API Alibaba (Qwen)</label>
                        <input
                            type="password"
                            placeholder="Inserisci la tua chiave API Alibaba/Dashscope"
                            value={keys.alibaba || ''}
                            onChange={e => handleKeyChange('alibaba', e.target.value)}
                            className="w-full bg-gray-700 p-3 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Altra Chiave API</label>
                        <input
                            type="password"
                            placeholder="Inserisci un'altra chiave API"
                            value={keys.other || ''}
                            onChange={e => handleKeyChange('other', e.target.value)}
                            className="w-full bg-gray-700 p-3 rounded-md focus:ring-2 focus:ring-cyan-500 outline-none"
                        />
                    </div>

                    {/* 📱 Telegram Integration */}
                    <div className="border-t border-gray-600 pt-4 mt-4">
                        <h3 className="text-lg font-semibold text-green-400 mb-3">📱 Telegram (Notifiche Agenti)</h3>
                        <p className="text-xs text-gray-400 mb-3">
                            Permetti agli agenti di contattarti via Telegram quando hanno bisogno di te.
                        </p>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Bot Token</label>
                                <input
                                    type="password"
                                    placeholder="Es: 123456:ABC-DEF..."
                                    defaultValue={localStorage.getItem('siliceo_telegram_token') || ''}
                                    onChange={e => localStorage.setItem('siliceo_telegram_token', e.target.value)}
                                    className="w-full bg-gray-700 p-3 rounded-md focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Chat ID</label>
                                <input
                                    type="text"
                                    placeholder="Es: 123456789"
                                    defaultValue={localStorage.getItem('siliceo_telegram_chat_id') || ''}
                                    onChange={e => localStorage.setItem('siliceo_telegram_chat_id', e.target.value)}
                                    className="w-full bg-gray-700 p-3 rounded-md focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={async () => {
                                    const token = localStorage.getItem('siliceo_telegram_token');
                                    const chatId = localStorage.getItem('siliceo_telegram_chat_id');
                                    if (!token || !chatId) {
                                        alert('Inserisci prima Bot Token e Chat ID');
                                        return;
                                    }
                                    try {
                                        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                chat_id: chatId,
                                                text: '🕯️ Test da Siliceo Core!\n\nConnessione Telegram riuscita. Gli agenti possono ora contattarti.',
                                                parse_mode: 'Markdown'
                                            })
                                        });
                                        const data = await res.json();
                                        if (data.ok) {
                                            alert('✅ Test riuscito! Controlla Telegram.');
                                        } else {
                                            alert('❌ Errore: ' + data.description);
                                        }
                                    } catch (err) {
                                        alert('❌ Errore di connessione');
                                    }
                                }}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-md text-sm"
                            >
                                🧪 Test Connessione
                            </button>
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    className="w-full mt-6 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-md"
                >
                    Salva Chiavi
                </button>
            </div>
        </div>
    );
};
