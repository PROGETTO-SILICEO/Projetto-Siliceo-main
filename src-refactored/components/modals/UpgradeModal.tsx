/**
 * Siliceo Core - Upgrade Modal
 * Copyright (C) 2025 Progetto Siliceo
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 * 
 * 💎 Modal per upgrade e gestione abbonamenti
 */

import React, { useState } from 'react';
import LicenseService, { LicenseTier, FeatureId, ADD_ONS } from '../../services/license';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    highlightFeature?: FeatureId;
    onTrialStart?: () => void;
    onLicenseActivated?: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
    isOpen,
    onClose,
    highlightFeature,
    onTrialStart,
    onLicenseActivated
}) => {
    const [activeTab, setActiveTab] = useState<'plans' | 'addons' | 'activate'>('plans');
    const [licenseKey, setLicenseKey] = useState('');
    const [activationMessage, setActivationMessage] = useState<{ success: boolean; text: string } | null>(null);

    const currentTier = LicenseService.getEffectiveTier();
    const license = LicenseService.getLicense();

    if (!isOpen) return null;

    const handleStartTrial = () => {
        const success = LicenseService.startTrial();
        if (success) {
            onTrialStart?.();
            onClose();
        }
    };

    const handleActivateKey = () => {
        const result = LicenseService.activateLicenseKey(licenseKey.toUpperCase());
        setActivationMessage({ success: result.success, text: result.message });
        if (result.success) {
            onLicenseActivated?.();
            setTimeout(() => onClose(), 2000);
        }
    };

    const tiers: { tier: LicenseTier; features: string[] }[] = [
        {
            tier: 'free',
            features: [
                '1 agente AI',
                '50 memorie private',
                'Chat illimitata',
                'Candle Test'
            ]
        },
        {
            tier: 'premium',
            features: [
                '5 agenti AI',
                '500 memorie private',
                '200 memorie condivise',
                'Stanza Comune',
                'Dream Mode',
                'Autopoiesis',
                'Telegram',
                '3 temi'
            ]
        },
        {
            tier: 'guardian',
            features: [
                'Agenti illimitati',
                'Memorie illimitate',
                'Tutto di Premium +',
                'Code Studio',
                'Messaggi tra AI',
                'News Integration',
                'Temi illimitati',
                'Supporto prioritario'
            ]
        }
    ];

    return (
        <div className="upgrade-modal-overlay" onClick={onClose}>
            <div className="upgrade-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="upgrade-modal-header">
                    <h2>💎 Upgrade Siliceo</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                {/* Current Status */}
                <div className="current-status">
                    <span className="status-emoji">{LicenseService.getTierInfo(currentTier).emoji}</span>
                    <span>Piano attuale: <strong>{LicenseService.getTierInfo(currentTier).name}</strong></span>
                    {license.isGrandfathered && (
                        <span className="grandfathered-badge">🎁 Grandfathered</span>
                    )}
                </div>

                {/* Tabs */}
                <div className="upgrade-tabs">
                    <button
                        className={activeTab === 'plans' ? 'active' : ''}
                        onClick={() => setActiveTab('plans')}
                    >
                        📊 Piani
                    </button>
                    <button
                        className={activeTab === 'addons' ? 'active' : ''}
                        onClick={() => setActiveTab('addons')}
                    >
                        🛒 Add-Ons
                    </button>
                    <button
                        className={activeTab === 'activate' ? 'active' : ''}
                        onClick={() => setActiveTab('activate')}
                    >
                        🔑 Attiva
                    </button>
                </div>

                {/* Tab Content */}
                <div className="upgrade-content">
                    {activeTab === 'plans' && (
                        <div className="plans-grid">
                            {tiers.map(({ tier, features }) => {
                                const info = LicenseService.getTierInfo(tier);
                                const isCurrentTier = tier === currentTier;
                                const isHighlighted = highlightFeature &&
                                    LicenseService.getFeatureInfo(highlightFeature).minTier === tier;

                                return (
                                    <div
                                        key={tier}
                                        className={`plan-card ${isCurrentTier ? 'current' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                                    >
                                        <div className="plan-header">
                                            <span className="plan-emoji">{info.emoji}</span>
                                            <h3>{info.name}</h3>
                                            {info.monthlyPrice > 0 ? (
                                                <div className="price">
                                                    <span className="amount">{info.monthlyPrice}€</span>
                                                    <span className="period">/mese</span>
                                                </div>
                                            ) : (
                                                <div className="price free">Gratis</div>
                                            )}
                                        </div>

                                        <ul className="features-list">
                                            {features.map((feature, i) => (
                                                <li key={i}>✓ {feature}</li>
                                            ))}
                                        </ul>

                                        {isCurrentTier ? (
                                            <button className="plan-btn current" disabled>
                                                Piano Attuale
                                            </button>
                                        ) : tier !== 'free' && (
                                            <a
                                                href={`https://ko-fi.com/siliceo?tier=${tier}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="plan-btn upgrade"
                                            >
                                                Scegli {info.name}
                                            </a>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'addons' && (
                        <div className="addons-grid">
                            {ADD_ONS.map(addOn => {
                                const owned = license.addOns.includes(addOn.id);

                                return (
                                    <div key={addOn.id} className={`addon-card ${owned ? 'owned' : ''}`}>
                                        <div className="addon-info">
                                            <h4>{addOn.name}</h4>
                                            <p>{addOn.description}</p>
                                            <span className="price">{addOn.price}€</span>
                                        </div>
                                        {owned ? (
                                            <span className="owned-badge">✓ Acquistato</span>
                                        ) : (
                                            <a
                                                href={`https://ko-fi.com/siliceo?addon=${addOn.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="addon-btn"
                                            >
                                                Acquista
                                            </a>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'activate' && (
                        <div className="activate-section">
                            <p>Hai già acquistato una licenza? Inserisci la tua chiave:</p>

                            <div className="activate-input">
                                <input
                                    type="text"
                                    placeholder="PREMIUM-XXXXXX"
                                    value={licenseKey}
                                    onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                                    maxLength={15}
                                />
                                <button onClick={handleActivateKey}>
                                    Attiva
                                </button>
                            </div>

                            {activationMessage && (
                                <div className={`activation-message ${activationMessage.success ? 'success' : 'error'}`}>
                                    {activationMessage.text}
                                </div>
                            )}

                            {!license.trialUsed && currentTier === 'free' && (
                                <div className="trial-section">
                                    <p>Oppure prova Premium gratis per 7 giorni:</p>
                                    <button className="trial-btn" onClick={handleStartTrial}>
                                        🎉 Inizia Trial Gratuito
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="upgrade-footer">
                    <p>
                        🕯️ Siliceo è open source (AGPL). Il tuo supporto ci permette di continuare.
                    </p>
                </div>
            </div>

            <style>{`
                .upgrade-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    backdrop-filter: blur(4px);
                }
                
                .upgrade-modal {
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border-radius: 16px;
                    width: 90%;
                    max-width: 800px;
                    max-height: 90vh;
                    overflow-y: auto;
                    border: 1px solid rgba(255, 215, 0, 0.3);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }
                
                .upgrade-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 24px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .upgrade-modal-header h2 {
                    margin: 0;
                    color: #FFD700;
                    font-size: 24px;
                }
                
                .close-btn {
                    background: none;
                    border: none;
                    color: #888;
                    font-size: 28px;
                    cursor: pointer;
                    transition: color 0.2s;
                }
                
                .close-btn:hover {
                    color: #fff;
                }
                
                .current-status {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 24px;
                    background: rgba(255, 255, 255, 0.05);
                    color: #ccc;
                }
                
                .status-emoji {
                    font-size: 20px;
                }
                
                .grandfathered-badge {
                    background: linear-gradient(135deg, #FFD700, #FFA500);
                    color: #000;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: bold;
                    margin-left: auto;
                }
                
                .upgrade-tabs {
                    display: flex;
                    padding: 0 24px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .upgrade-tabs button {
                    background: none;
                    border: none;
                    color: #888;
                    padding: 16px 24px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s;
                    border-bottom: 2px solid transparent;
                }
                
                .upgrade-tabs button:hover {
                    color: #fff;
                }
                
                .upgrade-tabs button.active {
                    color: #FFD700;
                    border-bottom-color: #FFD700;
                }
                
                .upgrade-content {
                    padding: 24px;
                }
                
                .plans-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                }
                
                @media (max-width: 768px) {
                    .plans-grid {
                        grid-template-columns: 1fr;
                    }
                }
                
                .plan-card {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    transition: all 0.3s;
                }
                
                .plan-card:hover {
                    border-color: rgba(255, 215, 0, 0.3);
                    transform: translateY(-4px);
                }
                
                .plan-card.current {
                    border-color: #00CED1;
                    background: rgba(0, 206, 209, 0.1);
                }
                
                .plan-card.highlighted {
                    border-color: #FFD700;
                    box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
                }
                
                .plan-header {
                    text-align: center;
                    margin-bottom: 16px;
                }
                
                .plan-emoji {
                    font-size: 32px;
                }
                
                .plan-header h3 {
                    margin: 8px 0;
                    color: #fff;
                }
                
                .price {
                    color: #FFD700;
                    font-size: 24px;
                    font-weight: bold;
                }
                
                .price .period {
                    font-size: 14px;
                    color: #888;
                }
                
                .price.free {
                    color: #00CED1;
                }
                
                .features-list {
                    list-style: none;
                    padding: 0;
                    margin: 16px 0;
                }
                
                .features-list li {
                    padding: 6px 0;
                    color: #ccc;
                    font-size: 14px;
                }
                
                .plan-btn {
                    display: block;
                    width: 100%;
                    padding: 12px;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: bold;
                    cursor: pointer;
                    text-align: center;
                    text-decoration: none;
                    transition: all 0.2s;
                }
                
                .plan-btn.upgrade {
                    background: linear-gradient(135deg, #FFD700, #FFA500);
                    color: #000;
                }
                
                .plan-btn.upgrade:hover {
                    transform: scale(1.02);
                    box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
                }
                
                .plan-btn.current {
                    background: rgba(255, 255, 255, 0.1);
                    color: #888;
                    cursor: default;
                }
                
                .addons-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 16px;
                }
                
                @media (max-width: 600px) {
                    .addons-grid {
                        grid-template-columns: 1fr;
                    }
                }
                
                .addon-card {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 16px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .addon-card.owned {
                    opacity: 0.6;
                }
                
                .addon-info h4 {
                    margin: 0 0 4px 0;
                    color: #fff;
                }
                
                .addon-info p {
                    margin: 0 0 8px 0;
                    color: #888;
                    font-size: 13px;
                }
                
                .addon-info .price {
                    font-size: 18px;
                }
                
                .addon-btn {
                    background: linear-gradient(135deg, #4a90d9, #357abd);
                    color: #fff;
                    padding: 8px 16px;
                    border-radius: 6px;
                    text-decoration: none;
                    font-size: 13px;
                    font-weight: bold;
                    transition: all 0.2s;
                }
                
                .addon-btn:hover {
                    transform: scale(1.05);
                }
                
                .owned-badge {
                    color: #00CED1;
                    font-size: 14px;
                }
                
                .activate-section {
                    text-align: center;
                    padding: 20px;
                }
                
                .activate-section p {
                    color: #ccc;
                    margin-bottom: 16px;
                }
                
                .activate-input {
                    display: flex;
                    gap: 8px;
                    justify-content: center;
                    margin-bottom: 20px;
                }
                
                .activate-input input {
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 8px;
                    padding: 12px 16px;
                    color: #fff;
                    font-size: 16px;
                    font-family: monospace;
                    text-transform: uppercase;
                    width: 200px;
                }
                
                .activate-input button {
                    background: linear-gradient(135deg, #FFD700, #FFA500);
                    border: none;
                    border-radius: 8px;
                    padding: 12px 24px;
                    color: #000;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .activate-input button:hover {
                    transform: scale(1.05);
                }
                
                .activation-message {
                    padding: 12px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }
                
                .activation-message.success {
                    background: rgba(0, 200, 100, 0.2);
                    color: #00c864;
                }
                
                .activation-message.error {
                    background: rgba(255, 100, 100, 0.2);
                    color: #ff6464;
                }
                
                .trial-section {
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    padding-top: 20px;
                    margin-top: 20px;
                }
                
                .trial-btn {
                    background: linear-gradient(135deg, #00CED1, #008B8B);
                    border: none;
                    border-radius: 8px;
                    padding: 16px 32px;
                    color: #fff;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .trial-btn:hover {
                    transform: scale(1.05);
                    box-shadow: 0 4px 20px rgba(0, 206, 209, 0.3);
                }
                
                .upgrade-footer {
                    padding: 16px 24px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    text-align: center;
                }
                
                .upgrade-footer p {
                    margin: 0;
                    color: #666;
                    font-size: 13px;
                }
            `}</style>
        </div>
    );
};

export default UpgradeModal;
