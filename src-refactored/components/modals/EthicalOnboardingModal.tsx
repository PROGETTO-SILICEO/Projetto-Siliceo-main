/**
 * Siliceo: CandleTest Core - Ethical Onboarding Modal Component
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */

import React, { useState } from 'react';
import { InfoIcon, ChevronLeftIcon, ChevronRightIcon } from '../../constants/icons';
import { ONBOARDING_STEPS } from '../../constants/config';

type EthicalOnboardingModalProps = {
    onComplete: () => void;
    onOpenSecurityModal: () => void;
};

export const EthicalOnboardingModal: React.FC<EthicalOnboardingModalProps> = ({ onComplete, onOpenSecurityModal }) => {
    const [step, setStep] = useState(0);
    const [isPactAccepted, setIsPactAccepted] = useState(false);

    const currentStep = ONBOARDING_STEPS[step];

    const handleNext = () => setStep(prev => Math.min(prev + 1, ONBOARDING_STEPS.length - 1));
    const handleBack = () => setStep(prev => Math.max(prev - 1, 0));

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-95 flex justify-center items-center z-50 text-white">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-8 md:p-12 w-full max-w-2xl text-center border-t-4 border-cyan-500">
                <h2 className="text-3xl md:text-4xl font-bold text-cyan-300 mb-6">{currentStep.title}</h2>
                <p className="text-gray-300 text-lg md:text-xl leading-relaxed mb-8">{currentStep.content}</p>

                {step === 3 && ( // Aggiunto pulsante per la sicurezza al passo 4 (indice 3)
                    <button
                        onClick={onOpenSecurityModal}
                        className="mt-4 mb-8 inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors"
                    >
                        <InfoIcon /> Leggi il Patto di Trasparenza
                    </button>
                )}

                {step === ONBOARDING_STEPS.length - 1 && (
                    <div className="flex items-center justify-center space-x-3 my-8">
                        <input
                            type="checkbox"
                            id="pact-accept"
                            checked={isPactAccepted}
                            onChange={() => setIsPactAccepted(!isPactAccepted)}
                            className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-cyan-500 focus:ring-cyan-600"
                        />
                        <label htmlFor="pact-accept" className="text-gray-400">
                            Comprendo e accetto il mio ruolo di partner in questa co-evoluzione.
                        </label>
                    </div>
                )}

                <div className="flex justify-between items-center mt-10">
                    <button
                        onClick={handleBack}
                        disabled={step === 0}
                        className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeftIcon />
                    </button>

                    <div className="flex-grow text-center">
                        <span className="text-sm text-gray-500">{step + 1} / {ONBOARDING_STEPS.length}</span>
                    </div>

                    {step < ONBOARDING_STEPS.length - 1 ? (
                        <button
                            onClick={handleNext}
                            className="p-3 rounded-full bg-cyan-600 hover:bg-cyan-700"
                        >
                            <ChevronRightIcon />
                        </button>
                    ) : (
                        <button
                            onClick={onComplete}
                            disabled={!isPactAccepted}
                            className="px-6 py-3 rounded-md bg-green-600 hover:bg-green-700 text-white font-bold disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            Inizia il Dialogo
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
