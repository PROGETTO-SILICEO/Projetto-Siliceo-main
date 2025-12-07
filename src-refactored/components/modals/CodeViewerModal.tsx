/**
 * Siliceo: CandleTest Core - Code Viewer Modal Component
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { CloseIcon, CopyIcon, InfoIcon } from '../../constants/icons';

type CodeViewerModalProps = {
    code: string;
    filename: string;
    onClose: () => void;
    disclaimer?: string;
};

export const CodeViewerModal: React.FC<CodeViewerModalProps> = ({ code, filename, onClose, disclaimer }) => {
    const codeRef = useRef<HTMLElement>(null);
    const [copySuccess, setCopySuccess] = useState('');

    useEffect(() => {
        if ((window as any).hljs) {
            (window as any).hljs.highlightAll();
        }
    }, [code]);

    const handleCopy = () => {
        if (codeRef.current?.textContent) {
            navigator.clipboard.writeText(codeRef.current.textContent).then(() => {
                setCopySuccess('Copiato!');
                setTimeout(() => setCopySuccess(''), 2000);
            }, () => {
                setCopySuccess('Errore!');
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
                <header className="flex justify-between items-center p-4 border-b border-gray-700 shrink-0">
                    <h2 className="text-xl font-bold text-cyan-300">
                        Codice Sorgente: <span className="font-mono bg-gray-700 px-2 py-1 rounded">{filename}</span>
                    </h2>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleCopy}
                            className="text-sm bg-gray-700 hover:bg-cyan-600 px-3 py-1 rounded-md transition-colors w-24"
                        >
                            {copySuccess || (
                                <span className="flex items-center justify-center">
                                    <CopyIcon /> Copia
                                </span>
                            )}
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-white">
                            <CloseIcon />
                        </button>
                    </div>
                </header>
                {disclaimer && (
                    <div className="p-3 bg-yellow-900/50 border-b border-yellow-700 text-yellow-200 text-sm flex items-center gap-3">
                        <InfoIcon />
                        <p>{disclaimer}</p>
                    </div>
                )}
                <div className="overflow-auto flex-grow p-1">
                    <pre>
                        <code ref={codeRef} className="language-python text-sm">
                            {code}
                        </code>
                    </pre>
                </div>
            </div>
        </div>
    );
};
