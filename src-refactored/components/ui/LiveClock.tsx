/**
 * Siliceo: CandleTest Core - Live Clock Component
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * Orologio persistente che mostra sempre data e ora corrente.
 * Gli agenti sanno sempre che ore sono.
 */

import React, { useState, useEffect } from 'react';

const DAYS = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

type LiveClockProps = {
    compact?: boolean; // Mostra solo ora, non data
    className?: string;
};

export const LiveClock: React.FC<LiveClockProps> = ({ compact = false, className = '' }) => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(new Date());
        }, 1000); // Aggiorna ogni secondo

        return () => clearInterval(interval);
    }, []);

    const dayName = DAYS[now.getDay()];
    const day = now.getDate();
    const month = MONTHS[now.getMonth()];
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    if (compact) {
        return (
            <div className={`font-mono text-xs text-gray-400 ${className}`}>
                🕐 {hours}:{minutes}:{seconds}
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-2 text-xs text-gray-400 ${className}`}>
            <span className="text-purple-400">🕐</span>
            <span className="font-mono">{hours}:{minutes}</span>
            <span className="text-gray-600">|</span>
            <span>{dayName} {day} {month}</span>
        </div>
    );
};

export default LiveClock;
