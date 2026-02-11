/**
 * Siliceo: CandleTest Core - Sync Status Component
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 * 
 * 🔄 Indicatore visuale dello stato di sincronizzazione con il Memory Server
 */

import React, { useState, useEffect } from 'react';
import { syncQueue } from '../../services/syncQueue';

export const SyncStatus: React.FC = () => {
    const [status, setStatus] = useState(syncQueue.getStatus());

    useEffect(() => {
        // Aggiorna lo stato ogni secondo
        const interval = setInterval(() => {
            setStatus(syncQueue.getStatus());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    if (status.pending === 0 && !status.processing) {
        return (
            <div className="flex items-center gap-2 text-green-400 text-sm">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>Sincronizzato</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 text-yellow-400 text-sm">
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
            <span>
                {status.processing ? 'Sincronizzazione...' : `${status.pending} in coda`}
            </span>
        </div>
    );
};

export default SyncStatus;
