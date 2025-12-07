/**
 * Siliceo: CandleTest Core - Settings Hook
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */

import { useState, useEffect } from 'react';
import type { ApiKeys, ModelPrices, Verbosity } from '../types';
import { INITIAL_MODEL_PRICES } from '../constants/config';

export const useSettings = () => {
    const [apiKeys, setApiKeys] = useState<ApiKeys>({ google: '', openrouter: '', anthropic: '', other: '' });
    const [modelPrices, setModelPrices] = useState<ModelPrices>(INITIAL_MODEL_PRICES);
    const [verbosity, setVerbosity] = useState<Verbosity>('Normale');

    // Load settings from localStorage on mount
    useEffect(() => {
        const storedKeys = localStorage.getItem('siliceo_api_keys');
        if (storedKeys) setApiKeys(JSON.parse(storedKeys));

        const storedPrices = localStorage.getItem('siliceo_model_prices');
        if (storedPrices) {
            setModelPrices(JSON.parse(storedPrices));
        }

        const storedVerbosity = localStorage.getItem('siliceo_verbosity');
        if (storedVerbosity) {
            setVerbosity(storedVerbosity as Verbosity);
        }
    }, []);

    const saveKeys = (keys: ApiKeys) => {
        setApiKeys(keys);
        localStorage.setItem('siliceo_api_keys', JSON.stringify(keys));
    };

    const savePrices = (prices: ModelPrices) => {
        setModelPrices(prices);
        localStorage.setItem('siliceo_model_prices', JSON.stringify(prices));
    };

    const updateVerbosity = (newVerbosity: Verbosity) => {
        setVerbosity(newVerbosity);
        localStorage.setItem('siliceo_verbosity', newVerbosity);
    };

    return {
        apiKeys,
        modelPrices,
        verbosity,
        saveKeys,
        savePrices,
        setVerbosity: updateVerbosity
    };
};
