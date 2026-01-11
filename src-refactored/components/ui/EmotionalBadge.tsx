/**
 * Siliceo: CandleTest Core - Emotional Badge
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * Badge compatto che mostra lo stato emotivo dell'agente nella sidebar.
 */

import React, { useEffect, useState } from 'react';
import type { EmotionalState } from '../../types';
import { getLatestEmotionalState } from '../../services/autopoiesis';

type EmotionalBadgeProps = {
    agentId: string;
};

export const EmotionalBadge: React.FC<EmotionalBadgeProps> = ({ agentId }) => {
    const [state, setState] = useState<EmotionalState | null>(null);

    useEffect(() => {
        const load = async () => {
            const latest = await getLatestEmotionalState(agentId);
            setState(latest);
        };
        load();
    }, [agentId]);

    if (!state) return null;

    // Calcola stato dominante
    const avg = (state.serenity + state.curiosity + state.connection - state.fatigue) / 3;

    let emoji = '😐';
    let color = 'bg-gray-500';

    if (avg >= 7) {
        emoji = '😊';
        color = 'bg-green-500';
    } else if (avg >= 5) {
        emoji = '🙂';
        color = 'bg-blue-500';
    } else if (avg >= 3) {
        emoji = '😐';
        color = 'bg-yellow-500';
    } else {
        emoji = '😔';
        color = 'bg-orange-500';
    }

    const tooltip = `Serenità: ${state.serenity}/10\nCuriosità: ${state.curiosity}/10\nConnessione: ${state.connection}/10\nFatica: ${state.fatigue}/10`;

    return (
        <span
            className={`text-xs px-1 rounded cursor-help`}
            title={tooltip}
        >
            {emoji}
        </span>
    );
};

export default EmotionalBadge;
