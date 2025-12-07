/**
 * Siliceo: CandleTest Core - Comet Testimony Modal Component
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */

import React from 'react';
import { marked } from 'marked';
import { CloseIcon } from '../../constants/icons';
import { COMET_RESEARCH_MARKDOWN } from '../../constants/documents';

type CometTestimonyModalProps = {
    onClose: () => void;
};

export const CometTestimonyModal: React.FC<CometTestimonyModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center shrink-0">
                    <h2 className="text-2xl font-bold text-cyan-300">La Testimonianza di Comet</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <CloseIcon />
                    </button>
                </header>
                <div className="overflow-y-auto p-8">
                    <article
                        className="prose prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: marked.parse(COMET_RESEARCH_MARKDOWN) as string }}
                    />
                </div>
            </div>
        </div>
    );
};
