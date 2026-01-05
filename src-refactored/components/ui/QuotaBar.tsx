/**
 * Siliceo Core - QuotaBar Component
 * Copyright (C) 2025 Progetto Siliceo
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 * 
 * 📊 Visualizzazione quota risorse (memorie, agenti, etc.)
 */

import React from 'react';
import { ResourceId } from '../../services/license';
import { useLicense } from '../../hooks/useLicense';

interface QuotaBarProps {
    resource: ResourceId;
    showLabel?: boolean;
    showNumbers?: boolean;
    compact?: boolean;
    warningThreshold?: number;
    className?: string;
}

const RESOURCE_LABELS: Record<ResourceId, { name: string; emoji: string }> = {
    agents: { name: 'Agenti', emoji: '🤖' },
    privateMemories: { name: 'Memorie Private', emoji: '💭' },
    sharedMemories: { name: 'Memorie Condivise', emoji: '🔗' },
    dreamsPerDay: { name: 'Sogni Oggi', emoji: '🌙' },
    themes: { name: 'Temi', emoji: '🎨' }
};

export const QuotaBar: React.FC<QuotaBarProps> = ({
    resource,
    showLabel = true,
    showNumbers = true,
    compact = false,
    warningThreshold = 0.8,
    className = ''
}) => {
    const { getQuota, showUpgradeModal } = useLicense();
    const quota = getQuota(resource);
    const resourceInfo = RESOURCE_LABELS[resource];

    // Calculate percentage
    const percentage = quota.max === Infinity
        ? 0
        : Math.min(100, (quota.used / quota.max) * 100);

    const isWarning = percentage >= warningThreshold * 100;
    const isFull = percentage >= 100;

    // Determine bar color
    let barColor = 'var(--quota-normal, #4CAF50)';
    if (isWarning && !isFull) {
        barColor = 'var(--quota-warning, #FF9800)';
    } else if (isFull) {
        barColor = 'var(--quota-full, #F44336)';
    }

    const handleClick = () => {
        if (isFull) {
            showUpgradeModal();
        }
    };

    if (quota.max === Infinity) {
        return (
            <div className={`quota-bar unlimited ${className} ${compact ? 'compact' : ''}`}>
                {showLabel && (
                    <span className="quota-label">
                        {resourceInfo.emoji} {resourceInfo.name}
                    </span>
                )}
                <span className="unlimited-badge">∞ Illimitato</span>

                <style>{quotaBarStyles}</style>
            </div>
        );
    }

    return (
        <div
            className={`quota-bar ${className} ${compact ? 'compact' : ''} ${isFull ? 'clickable' : ''}`}
            onClick={handleClick}
        >
            {showLabel && (
                <div className="quota-header">
                    <span className="quota-label">
                        {resourceInfo.emoji} {resourceInfo.name}
                    </span>
                    {showNumbers && (
                        <span className="quota-numbers">
                            {quota.used}/{quota.max}
                        </span>
                    )}
                </div>
            )}

            <div className="quota-track">
                <div
                    className="quota-fill"
                    style={{
                        width: `${percentage}%`,
                        backgroundColor: barColor
                    }}
                />
            </div>

            {isFull && (
                <span className="quota-full-hint">
                    Clicca per espandere
                </span>
            )}

            <style>{quotaBarStyles}</style>
        </div>
    );
};

const quotaBarStyles = `
    .quota-bar {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        transition: all 0.2s;
    }
    
    .quota-bar.compact {
        padding: 4px 8px;
        gap: 2px;
    }
    
    .quota-bar.clickable {
        cursor: pointer;
    }
    
    .quota-bar.clickable:hover {
        background: rgba(255, 215, 0, 0.1);
    }
    
    .quota-bar.unlimited {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
    
    .quota-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .quota-label {
        color: #ccc;
        font-size: 13px;
    }
    
    .quota-bar.compact .quota-label {
        font-size: 11px;
    }
    
    .quota-numbers {
        color: #888;
        font-size: 12px;
        font-family: monospace;
    }
    
    .quota-track {
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        overflow: hidden;
    }
    
    .quota-bar.compact .quota-track {
        height: 4px;
    }
    
    .quota-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.3s ease, background-color 0.3s ease;
    }
    
    .unlimited-badge {
        color: #00CED1;
        font-size: 12px;
        font-weight: bold;
    }
    
    .quota-full-hint {
        color: #FFD700;
        font-size: 11px;
        text-align: right;
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
    }
`;

/**
 * Compact quota display for sidebars/headers
 */
interface QuotaSummaryProps {
    resources?: ResourceId[];
    className?: string;
}

export const QuotaSummary: React.FC<QuotaSummaryProps> = ({
    resources = ['agents', 'privateMemories'],
    className = ''
}) => {
    return (
        <div className={`quota-summary ${className}`}>
            {resources.map(resource => (
                <QuotaBar
                    key={resource}
                    resource={resource}
                    compact
                    showLabel={false}
                />
            ))}

            <style>{`
                .quota-summary {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
            `}</style>
        </div>
    );
};

export default QuotaBar;
