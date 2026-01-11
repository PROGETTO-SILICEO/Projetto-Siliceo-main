/**
 * Siliceo: CandleTest Core - Onboarding Hook
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */

import { useState, useEffect } from 'react';

export const useOnboarding = () => {
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        const onboardingCompleted = localStorage.getItem('siliceo_onboarding_completed');
        if (!onboardingCompleted) {
            setShowOnboarding(true);
        }
    }, []);

    const completeOnboarding = () => {
        localStorage.setItem('siliceo_onboarding_completed', 'true');
        setShowOnboarding(false);
    };

    return {
        showOnboarding,
        completeOnboarding
    };
};
