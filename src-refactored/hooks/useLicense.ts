/**
 * Siliceo Core - useLicense Hook
 * Copyright (C) 2025 Progetto Siliceo
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 * 
 * 💎 React hook per gestione licenze e feature gating
 */

import { useState, useCallback, useMemo } from 'react';
import LicenseService, {
    License,
    LicenseTier,
    FeatureId,
    ResourceId,
    ADD_ONS
} from '../services/license';

interface UseLicenseReturn {
    // Current state
    license: License;
    tier: LicenseTier;
    tierInfo: ReturnType<typeof LicenseService.getTierInfo>;
    isGrandfathered: boolean;

    // Feature checks
    hasFeature: (feature: FeatureId) => boolean;
    canPerformAction: (action: 'addAgent' | 'saveMemory' | 'triggerDream' | 'useCommonRoom') => {
        allowed: boolean;
        reason?: string;
        upgradeHint?: string;
    };

    // Resource quotas
    getQuota: (resource: ResourceId) => { used: number; max: number; remaining: number };
    isNearLimit: (resource: ResourceId, threshold?: number) => boolean;

    // Actions
    startTrial: () => boolean;
    activateLicenseKey: (key: string) => { success: boolean; message: string };

    // UI helpers
    showUpgradeModal: (feature?: FeatureId) => void;
    hideUpgradeModal: () => void;
    upgradeModalState: { visible: boolean; highlightFeature?: FeatureId };

    // Add-ons
    addOns: typeof ADD_ONS;
    hasAddOn: (addOnId: string) => boolean;

    // Refresh license state
    refresh: () => void;
}

export function useLicense(): UseLicenseReturn {
    const [license, setLicense] = useState<License>(() => LicenseService.getLicense());
    const [upgradeModalState, setUpgradeModalState] = useState<{
        visible: boolean;
        highlightFeature?: FeatureId
    }>({ visible: false });

    const tier = useMemo(() => LicenseService.getEffectiveTier(), [license]);
    const tierInfo = useMemo(() => LicenseService.getTierInfo(tier), [tier]);

    const refresh = useCallback(() => {
        setLicense(LicenseService.getLicense());
    }, []);

    const hasFeature = useCallback((feature: FeatureId) => {
        return LicenseService.hasFeature(feature);
    }, [license]);

    const canPerformAction = useCallback((action: 'addAgent' | 'saveMemory' | 'triggerDream' | 'useCommonRoom') => {
        return LicenseService.canPerformAction(action);
    }, [license]);

    const getQuota = useCallback((resource: ResourceId) => {
        return LicenseService.getResourceQuota(resource);
    }, [license]);

    const isNearLimit = useCallback((resource: ResourceId, threshold: number = 0.8) => {
        const quota = LicenseService.getResourceQuota(resource);
        if (quota.max === Infinity) return false;
        return quota.used >= quota.max * threshold;
    }, [license]);

    const startTrial = useCallback(() => {
        const success = LicenseService.startTrial();
        if (success) refresh();
        return success;
    }, [refresh]);

    const activateLicenseKey = useCallback((key: string) => {
        const result = LicenseService.activateLicenseKey(key);
        if (result.success) refresh();
        return result;
    }, [refresh]);

    const showUpgradeModal = useCallback((feature?: FeatureId) => {
        setUpgradeModalState({ visible: true, highlightFeature: feature });
    }, []);

    const hideUpgradeModal = useCallback(() => {
        setUpgradeModalState({ visible: false });
    }, []);

    const hasAddOn = useCallback((addOnId: string) => {
        return license.addOns.includes(addOnId);
    }, [license]);

    return {
        license,
        tier,
        tierInfo,
        isGrandfathered: license.isGrandfathered,
        hasFeature,
        canPerformAction,
        getQuota,
        isNearLimit,
        startTrial,
        activateLicenseKey,
        showUpgradeModal,
        hideUpgradeModal,
        upgradeModalState,
        addOns: ADD_ONS,
        hasAddOn,
        refresh
    };
}

export default useLicense;
