/**
 * Siliceo: CandleTest Core - Verbosity Selector Component
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */

import React from 'react';
import type { Verbosity } from '../../types';

type VerbositySelectorProps = {
    selected: Verbosity;
    onSelect: (option: Verbosity) => void;
};

export const VerbositySelector: React.FC<VerbositySelectorProps> = ({ selected, onSelect }) => {
    const verbosityOptions: Verbosity[] = ['Conciso', 'Normale', 'Dettagliato'];

    return (
        <div className="mb-2 flex justify-center items-center gap-2 p-1 bg-gray-900/50 rounded-full">
            {verbosityOptions.map(option => (
                <button
                    key={option}
                    onClick={() => onSelect(option)}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors duration-200 ${selected === option
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        }`}
                >
                    {option}
                </button>
            ))}
        </div>
    );
};
