/**
 * Siliceo Core - FeatureGate Component
 * Copyright (C) 2025 Progetto Siliceo
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 * 
 * 🔒 Wrapper per funzionalità gated dal sistema di licenze
 */

import React from 'react';
import { FeatureId } from '../../services/license';
import { useLicense } from '../../hooks/useLicense';

interface FeatureGateProps {
    feature: FeatureId;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    showLockOverlay?: boolean;
}

/**
 * Wraps content that requires a specific feature.
 * Shows locked state or fallback if feature is not available.
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({
    feature,
    children,
    fallback,
    showLockOverlay = true
}) => {
    const { hasFeature, showUpgradeModal } = useLicense();

    if (hasFeature(feature)) {
        return <>{children}</>;
    }

    if (fallback) {
        return <>{fallback}</>;
    }

    if (!showLockOverlay) {
        return null;
    }

    return (
        <div className="feature-locked" onClick={() => showUpgradeModal(feature)}>
            <div className="locked-overlay">
                <span className="lock-icon">🔒</span>
                <span className="lock-text">Premium</span>
            </div>
            <div className="locked-content">
                {children}
            </div>

            <style>{`
                .feature-locked {
                    position: relative;
                    cursor: pointer;
                }
                
                .feature-locked .locked-content {
                    opacity: 0.4;
                    filter: blur(1px);
                    pointer-events: none;
                }
                
                .feature-locked .locked-overlay {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0, 0, 0, 0.8);
                    border: 1px solid rgba(255, 215, 0, 0.5);
                    border-radius: 12px;
                    padding: 12px 24px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    z-index: 10;
                    transition: all 0.2s;
                }
                
                .feature-locked:hover .locked-overlay {
                    background: rgba(255, 215, 0, 0.2);
                    border-color: #FFD700;
                    transform: translate(-50%, -50%) scale(1.05);
                }
                
                .lock-icon {
                    font-size: 20px;
                }
                
                .lock-text {
                    color: #FFD700;
                    font-weight: bold;
                    font-size: 14px;
                }
            `}</style>
        </div>
    );
};

/**
 * Button variant that shows lock for unavailable features
 */
interface LockedButtonProps {
    feature: FeatureId;
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
}

export const LockedButton: React.FC<LockedButtonProps> = ({
    feature,
    onClick,
    children,
    className = '',
    disabled = false
}) => {
    const { hasFeature, showUpgradeModal } = useLicense();
    const isLocked = !hasFeature(feature);

    const handleClick = () => {
        if (isLocked) {
            showUpgradeModal(feature);
        } else {
            onClick();
        }
    };

    return (
        <button
            className={`${className} ${isLocked ? 'locked-btn' : ''}`}
            onClick={handleClick}
            disabled={disabled && !isLocked}
        >
            {children}
            {isLocked && <span className="lock-badge">🔒</span>}

            <style>{`
                .locked-btn {
                    opacity: 0.7;
                    position: relative;
                }
                
                .locked-btn:hover {
                    opacity: 1;
                }
                
                .lock-badge {
                    margin-left: 6px;
                    font-size: 12px;
                }
            `}</style>
        </button>
    );
};

export default FeatureGate;
