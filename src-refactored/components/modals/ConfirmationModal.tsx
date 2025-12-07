/**
 * Siliceo: CandleTest Core - Confirmation Modal Component
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */

import React from 'react';
import { WarningIcon } from '../../constants/icons';

type ConfirmationModalProps = {
    onConfirm: () => void;
    onCancel: () => void;
    fileName: string;
};

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ onConfirm, onCancel, fileName }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-lg relative text-center border-2 border-yellow-600">
            <div className="mx-auto text-yellow-400 mb-4">
                <WarningIcon />
            </div>
            <h2 className="text-2xl font-bold text-yellow-300 mb-4">ATTENZIONE: Sovrascrittura Dati</h2>
            <p className="text-gray-300 mb-2">
                Stai per importare il file di backup:
            </p>
            <p className="font-mono bg-gray-900 px-2 py-1 rounded-md text-cyan-400 inline-block mb-4">{fileName}</p>
            <p className="text-gray-300 mb-6">
                Questa operazione **cancellerà in modo irreversibile** tutti gli agenti, le conversazioni e le impostazioni API attuali per ripristinare i dati dal backup.
            </p>
            <p className="text-lg font-semibold text-white mb-6">Sei assolutamente sicuro di voler procedere?</p>
            <div className="flex justify-center gap-4">
                <button
                    onClick={onCancel}
                    className="px-8 py-3 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-md transition-colors"
                >
                    Annulla
                </button>
                <button
                    onClick={onConfirm}
                    className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md transition-colors"
                >
                    Conferma e Sovrascrivi
                </button>
            </div>
        </div>
    </div>
);
