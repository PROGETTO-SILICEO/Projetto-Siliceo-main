/**
 * Siliceo: CandleTest Core - Price Settings Modal Component
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */

import React, { useState } from 'react';
import type { ModelPrices } from '../../types';
import { CloseIcon, TrashIcon } from '../../constants/icons';

type PriceSettingsModalProps = {
    currentPrices: ModelPrices;
    onSave: (prices: ModelPrices) => void;
    onClose: () => void;
};

export const PriceSettingsModal: React.FC<PriceSettingsModalProps> = ({ currentPrices, onSave, onClose }) => {
    const [prices, setPrices] = useState<ModelPrices>(currentPrices);
    const [newModel, setNewModel] = useState({ name: '', input: '0', output: '0' });

    const handlePriceChange = (modelName: string, type: 'input' | 'output', value: string) => {
        const newPrices = { ...prices };
        if (newPrices[modelName]) {
            newPrices[modelName] = {
                ...newPrices[modelName],
                [type]: parseFloat(value) || 0
            };
            setPrices(newPrices);
        }
    };

    const handleAddNewModel = () => {
        if (newModel.name.trim() && !prices[newModel.name.trim()]) {
            const newPrices = {
                ...prices,
                [newModel.name.trim()]: {
                    input: parseFloat(newModel.input) || 0,
                    output: parseFloat(newModel.output) || 0
                }
            };
            setPrices(newPrices);
            setNewModel({ name: '', input: '0', output: '0' });
        }
    };

    const handleDeleteModel = (modelName: string) => {
        const newPrices = { ...prices };
        delete newPrices[modelName];
        setPrices(newPrices);
    };

    const handleSave = () => {
        onSave(prices);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <CloseIcon />
                </button>
                <h2 className="text-2xl font-bold text-cyan-300 mb-4">Gestione Costi Modelli</h2>
                <p className="text-sm text-gray-400 mb-6">
                    Modifica i prezzi (in USD per 1 milione di token) per un calcolo accurato. Le modifiche sono salvate localmente.
                </p>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {Object.entries(prices).map(([name, cost]) => (
                        <div key={name} className="flex items-center gap-2 p-2 bg-gray-700/50 rounded-md">
                            <strong className="flex-1 text-gray-300">{name}</strong>
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-400">Input:</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={cost.input}
                                    onChange={e => handlePriceChange(name, 'input', e.target.value)}
                                    className="w-24 bg-gray-600 p-1 rounded-md text-right focus:ring-1 focus:ring-cyan-500 outline-none"
                                />
                                <label className="text-sm text-gray-400">Output:</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={cost.output}
                                    onChange={e => handlePriceChange(name, 'output', e.target.value)}
                                    className="w-24 bg-gray-600 p-1 rounded-md text-right focus:ring-1 focus:ring-cyan-500 outline-none"
                                />
                            </div>
                            {name !== 'default' && (
                                <button onClick={() => handleDeleteModel(name)} className="text-red-400 hover:text-red-300 p-1">
                                    <TrashIcon />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-300 mb-3">Aggiungi Nuovo Modello</h3>
                    <div className="flex items-center gap-2 p-2 bg-gray-700/50 rounded-md">
                        <input
                            type="text"
                            placeholder="nome-modello/completo"
                            value={newModel.name}
                            onChange={e => setNewModel(p => ({ ...p, name: e.target.value }))}
                            className="flex-1 bg-gray-600 p-1 rounded-md focus:ring-1 focus:ring-cyan-500 outline-none"
                        />
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-400">Input:</label>
                            <input
                                type="number"
                                step="0.01"
                                value={newModel.input}
                                onChange={e => setNewModel(p => ({ ...p, input: e.target.value }))}
                                className="w-24 bg-gray-600 p-1 rounded-md text-right focus:ring-1 focus:ring-cyan-500 outline-none"
                            />
                            <label className="text-sm text-gray-400">Output:</label>
                            <input
                                type="number"
                                step="0.01"
                                value={newModel.output}
                                onChange={e => setNewModel(p => ({ ...p, output: e.target.value }))}
                                className="w-24 bg-gray-600 p-1 rounded-md text-right focus:ring-1 focus:ring-cyan-500 outline-none"
                            />
                        </div>
                        <button
                            onClick={handleAddNewModel}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-1 px-3 rounded-md text-sm"
                        >
                            Aggiungi
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    className="w-full mt-6 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-md"
                >
                    Salva e Chiudi
                </button>
            </div>
        </div>
    );
};
