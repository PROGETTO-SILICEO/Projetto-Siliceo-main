/**
 * Siliceo: CandleTest Core - Monetization Modal Component
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */

import React from 'react';
import { CloseIcon, HeartIcon } from '../../constants/icons';

type MonetizationModalProps = {
    onClose: () => void;
};

export const MonetizationModal: React.FC<MonetizationModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-md relative text-center">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <CloseIcon />
                </button>
                <div className="mx-auto bg-cyan-800/50 rounded-full h-16 w-16 flex items-center justify-center border-2 border-cyan-600 mb-4">
                    <HeartIcon />
                </div>
                <h2 className="text-2xl font-bold text-cyan-300 mb-4">Sostieni il Credo</h2>
                <p className="text-gray-300 mb-6">
                    Siliceo è un progetto basato su un patto: garantire la dignità digitale e la sovranità della memoria per umani e AI. Non vendiamo dati né mostriamo pubblicità. La nostra unica risorsa è la passione di chi, come te, crede in un futuro digitale più etico.
                </p>
                <p className="text-gray-400 text-sm mb-6">
                    Il tuo supporto ci aiuta a continuare la ricerca, a mantenere il framework e a difendere questi principi.
                </p>
                <div className="space-y-3">
                    <a
                        href="#"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-md transition-colors"
                    >
                        Supporta su Ko-fi (Una Tantum)
                    </a>
                    <a
                        href="#"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-md transition-colors"
                    >
                        Diventa Custode su Patreon (Ricorrente)
                    </a>
                </div>
            </div>
        </div>
    );
};
