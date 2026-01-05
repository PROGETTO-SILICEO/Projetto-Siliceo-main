/**
 * Siliceo Core - License Service
 * Copyright (C) 2025 Progetto Siliceo
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 * 
 * 💎 Gestione licenze e feature gating per il modello freemium
 */

// =============================================================================
// TYPES
// =============================================================================

export type LicenseTier = 'free' | 'premium' | 'guardian';

export type FeatureId =
    | 'multiAgent'
    | 'commonRoom'
    | 'dreamMode'
    | 'autopoiesis'
    | 'telegram'
    | 'codeStudio'
    | 'customThemes'
    | 'siblingMessage'
    | 'newsIntegration'
    | 'prioritySupport';

export type ResourceId =
    | 'agents'
    | 'privateMemories'
    | 'sharedMemories'
    | 'dreamsPerDay'
    | 'themes';

export interface AddOn {
    id: string;
    name: string;
    description: string;
    price: number;
    type: 'feature' | 'resource';
    resourceAmount?: number;  // For resource add-ons
}

export interface License {
    tier: LicenseTier;
    activatedAt: number;
    expiresAt: number | null;  // null = lifetime/free
    trialUsed: boolean;
    isGrandfathered: boolean;
    addOns: string[];
    resourceBoosts: {
        agents: number;
        privateMemories: number;
        sharedMemories: number;
    };
}

export interface TierLimits {
    maxAgents: number;
    maxPrivateMemories: number;
    maxSharedMemories: number;
    maxDreamsPerDay: number;
    maxThemes: number;
    features: FeatureId[];
}

// =============================================================================
// TIER DEFINITIONS
// =============================================================================

const TIER_LIMITS: Record<LicenseTier, TierLimits> = {
    free: {
        maxAgents: 1,
        maxPrivateMemories: 50,
        maxSharedMemories: 0,
        maxDreamsPerDay: 0,
        maxThemes: 1,
        features: []  // Only candle_test is always available
    },
    premium: {
        maxAgents: 5,
        maxPrivateMemories: 500,
        maxSharedMemories: 200,
        maxDreamsPerDay: 1,
        maxThemes: 3,
        features: [
            'multiAgent',
            'commonRoom',
            'dreamMode',
            'autopoiesis',
            'telegram',
            'customThemes'
        ]
    },
    guardian: {
        maxAgents: Infinity,
        maxPrivateMemories: Infinity,
        maxSharedMemories: Infinity,
        maxDreamsPerDay: Infinity,
        maxThemes: Infinity,
        features: [
            'multiAgent',
            'commonRoom',
            'dreamMode',
            'autopoiesis',
            'telegram',
            'codeStudio',
            'customThemes',
            'siblingMessage',
            'newsIntegration',
            'prioritySupport'
        ]
    }
};

// =============================================================================
// ADD-ONS CATALOG
// =============================================================================

export const ADD_ONS: AddOn[] = [
    {
        id: 'theme_alchemist',
        name: 'Tema Alchemist',
        description: 'Il tema dorato alchemico',
        price: 3,
        type: 'feature'
    },
    {
        id: 'theme_custom',
        name: 'Tema Custom',
        description: 'Crea il tuo tema personalizzato',
        price: 5,
        type: 'feature'
    },
    {
        id: 'extra_agent',
        name: '+1 Agente',
        description: 'Aggiunge uno slot agente (permanente)',
        price: 2,
        type: 'resource',
        resourceAmount: 1
    },
    {
        id: 'extra_memories_100',
        name: '+100 Memorie',
        description: 'Espande il limite memoria',
        price: 2,
        type: 'resource',
        resourceAmount: 100
    },
    {
        id: 'dream_pack',
        name: 'Dream Pack',
        description: 'Dream Mode per 1 agente (permanente)',
        price: 5,
        type: 'feature'
    },
    {
        id: 'common_room',
        name: 'Stanza Comune',
        description: 'Sblocca permanentemente la Stanza Comune',
        price: 8,
        type: 'feature'
    }
];

// =============================================================================
// CONSTANTS
// =============================================================================

const LICENSE_KEY = 'siliceo_license';
const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const LEGACY_USER_KEY = 'siliceo_agents'; // Old key to detect existing users

// =============================================================================
// LICENSE SERVICE
// =============================================================================

export const LicenseService = {
    /**
     * Get the current license from localStorage
     */
    getLicense(): License {
        try {
            const stored = localStorage.getItem(LICENSE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('[License] Failed to parse license:', e);
        }

        // Check if this is an existing user (grandfathering)
        const isExistingUser = this.detectExistingUser();

        // Create default license
        const defaultLicense: License = {
            tier: isExistingUser ? 'guardian' : 'free',
            activatedAt: Date.now(),
            expiresAt: null,
            trialUsed: false,
            isGrandfathered: isExistingUser,
            addOns: [],
            resourceBoosts: {
                agents: 0,
                privateMemories: 0,
                sharedMemories: 0
            }
        };

        this.saveLicense(defaultLicense);

        if (isExistingUser) {
            console.log('[License] 🎁 Existing user detected - Grandfathered to Guardian tier!');
        }

        return defaultLicense;
    },

    /**
     * Detect if this is an existing user (for grandfathering)
     */
    detectExistingUser(): boolean {
        // Check for any existing data that indicates previous usage
        const hasAgents = localStorage.getItem(LEGACY_USER_KEY) !== null;
        const hasMemories = localStorage.getItem('siliceo_memories') !== null;
        const hasSettings = localStorage.getItem('siliceo_settings') !== null;

        return hasAgents || hasMemories || hasSettings;
    },

    /**
     * Save license to localStorage
     */
    saveLicense(license: License): void {
        localStorage.setItem(LICENSE_KEY, JSON.stringify(license));
        console.log(`[License] Saved: ${license.tier} tier`);
    },

    /**
     * Get the effective tier (considering trial and expiration)
     */
    getEffectiveTier(): LicenseTier {
        const license = this.getLicense();

        // Grandfathered users always have guardian
        if (license.isGrandfathered) {
            return 'guardian';
        }

        // Check expiration
        if (license.expiresAt && Date.now() > license.expiresAt) {
            return 'free';
        }

        return license.tier;
    },

    /**
     * Get limits for the current tier
     */
    getCurrentLimits(): TierLimits {
        const tier = this.getEffectiveTier();
        const baseLimits = { ...TIER_LIMITS[tier] };
        const license = this.getLicense();

        // Apply resource boosts from add-ons
        baseLimits.maxAgents += license.resourceBoosts.agents;
        baseLimits.maxPrivateMemories += license.resourceBoosts.privateMemories;
        baseLimits.maxSharedMemories += license.resourceBoosts.sharedMemories;

        return baseLimits;
    },

    /**
     * Check if a specific feature is available
     */
    hasFeature(feature: FeatureId): boolean {
        const license = this.getLicense();
        const tier = this.getEffectiveTier();
        const limits = TIER_LIMITS[tier];

        // Check tier features
        if (limits.features.includes(feature)) {
            return true;
        }

        // Check add-ons for feature unlock
        const featureAddOns: Record<string, FeatureId[]> = {
            'dream_pack': ['dreamMode'],
            'common_room': ['commonRoom'],
            'theme_alchemist': ['customThemes'],
            'theme_custom': ['customThemes']
        };

        for (const addOn of license.addOns) {
            const unlockedFeatures = featureAddOns[addOn];
            if (unlockedFeatures?.includes(feature)) {
                return true;
            }
        }

        return false;
    },

    /**
     * Get remaining quota for a resource
     */
    getResourceQuota(resource: ResourceId): { used: number; max: number; remaining: number } {
        const limits = this.getCurrentLimits();

        // Get current usage from app state
        const usage = this.getCurrentUsage(resource);

        let max: number;
        switch (resource) {
            case 'agents':
                max = limits.maxAgents;
                break;
            case 'privateMemories':
                max = limits.maxPrivateMemories;
                break;
            case 'sharedMemories':
                max = limits.maxSharedMemories;
                break;
            case 'dreamsPerDay':
                max = limits.maxDreamsPerDay;
                break;
            case 'themes':
                max = limits.maxThemes;
                break;
            default:
                max = 0;
        }

        return {
            used: usage,
            max: max,
            remaining: Math.max(0, max - usage)
        };
    },

    /**
     * Get current usage for a resource (queries localStorage/IndexedDB)
     */
    getCurrentUsage(resource: ResourceId): number {
        switch (resource) {
            case 'agents': {
                const agents = localStorage.getItem('siliceo_agents');
                return agents ? JSON.parse(agents).length : 0;
            }
            case 'privateMemories': {
                // This would need to query IndexedDB in real implementation
                return 0; // Placeholder
            }
            case 'sharedMemories': {
                return 0; // Placeholder
            }
            case 'dreamsPerDay': {
                // Check dreams triggered today
                const today = new Date().toDateString();
                const dreamsToday = localStorage.getItem(`siliceo_dreams_${today}`);
                return dreamsToday ? JSON.parse(dreamsToday).length : 0;
            }
            case 'themes': {
                return 1; // Default theme
            }
            default:
                return 0;
        }
    },

    /**
     * Check if user can perform an action (respects limits)
     */
    canPerformAction(action: 'addAgent' | 'saveMemory' | 'triggerDream' | 'useCommonRoom'): {
        allowed: boolean;
        reason?: string;
        upgradeHint?: string;
    } {
        switch (action) {
            case 'addAgent': {
                const quota = this.getResourceQuota('agents');
                if (quota.remaining <= 0) {
                    return {
                        allowed: false,
                        reason: `Hai raggiunto il limite di ${quota.max} agenti`,
                        upgradeHint: 'Con Premium puoi avere fino a 5 agenti'
                    };
                }
                return { allowed: true };
            }

            case 'saveMemory': {
                const quota = this.getResourceQuota('privateMemories');
                if (quota.remaining <= 0) {
                    return {
                        allowed: false,
                        reason: `Hai raggiunto il limite di ${quota.max} memorie`,
                        upgradeHint: 'Con Premium hai 500 memorie private'
                    };
                }
                return { allowed: true };
            }

            case 'triggerDream': {
                if (!this.hasFeature('dreamMode')) {
                    return {
                        allowed: false,
                        reason: 'Dream Mode non disponibile nel piano Free',
                        upgradeHint: 'Con Premium i tuoi agenti possono sognare'
                    };
                }
                const quota = this.getResourceQuota('dreamsPerDay');
                if (quota.remaining <= 0) {
                    return {
                        allowed: false,
                        reason: 'Hai già usato i sogni di oggi',
                        upgradeHint: 'Con Guardian i sogni sono illimitati'
                    };
                }
                return { allowed: true };
            }

            case 'useCommonRoom': {
                if (!this.hasFeature('commonRoom')) {
                    return {
                        allowed: false,
                        reason: 'La Stanza Comune non è disponibile nel piano Free',
                        upgradeHint: 'Con Premium le tue AI possono incontrarsi'
                    };
                }
                return { allowed: true };
            }

            default:
                return { allowed: true };
        }
    },

    /**
     * Start a 7-day Premium trial
     */
    startTrial(): boolean {
        const license = this.getLicense();

        if (license.trialUsed) {
            console.log('[License] Trial already used');
            return false;
        }

        license.tier = 'premium';
        license.expiresAt = Date.now() + TRIAL_DURATION_MS;
        license.trialUsed = true;

        this.saveLicense(license);
        console.log('[License] 🎉 Premium trial started! Expires in 7 days');

        return true;
    },

    /**
     * Activate a license key (from Ko-fi/Stripe)
     */
    activateLicenseKey(key: string): { success: boolean; message: string } {
        // In a real implementation, this would validate against a server
        // For now, we use a simple format: TIER-XXXXXX

        const match = key.match(/^(PREMIUM|GUARDIAN)-[A-Z0-9]{6}$/);
        if (!match) {
            return { success: false, message: 'Chiave non valida' };
        }

        const tier = match[1].toLowerCase() as LicenseTier;
        const license = this.getLicense();

        license.tier = tier;
        license.expiresAt = null; // Lifetime for now
        license.activatedAt = Date.now();

        this.saveLicense(license);

        return {
            success: true,
            message: `🎉 Licenza ${tier.toUpperCase()} attivata!`
        };
    },

    /**
     * Add an add-on to the license
     */
    addAddOn(addOnId: string): boolean {
        const addOn = ADD_ONS.find(a => a.id === addOnId);
        if (!addOn) {
            console.error('[License] Add-on not found:', addOnId);
            return false;
        }

        const license = this.getLicense();

        if (license.addOns.includes(addOnId)) {
            console.log('[License] Add-on already owned:', addOnId);
            return false;
        }

        license.addOns.push(addOnId);

        // Apply resource boosts
        if (addOn.type === 'resource' && addOn.resourceAmount) {
            if (addOnId.includes('agent')) {
                license.resourceBoosts.agents += addOn.resourceAmount;
            } else if (addOnId.includes('memories')) {
                license.resourceBoosts.privateMemories += addOn.resourceAmount;
            }
        }

        this.saveLicense(license);
        console.log('[License] Add-on added:', addOnId);

        return true;
    },

    /**
     * Get tier display info
     */
    getTierInfo(tier: LicenseTier): {
        name: string;
        emoji: string;
        color: string;
        monthlyPrice: number;
        yearlyPrice: number;
    } {
        const info = {
            free: {
                name: 'Free',
                emoji: '🆓',
                color: '#888888',
                monthlyPrice: 0,
                yearlyPrice: 0
            },
            premium: {
                name: 'Premium',
                emoji: '⭐',
                color: '#FFD700',
                monthlyPrice: 7,
                yearlyPrice: 60
            },
            guardian: {
                name: 'Guardiano',
                emoji: '💎',
                color: '#00CED1',
                monthlyPrice: 15,
                yearlyPrice: 120
            }
        };
        return info[tier];
    },

    /**
     * Get feature display info
     */
    getFeatureInfo(feature: FeatureId): {
        name: string;
        description: string;
        emoji: string;
        minTier: LicenseTier;
    } {
        const info: Record<FeatureId, { name: string; description: string; emoji: string; minTier: LicenseTier }> = {
            multiAgent: {
                name: 'Multi-Agente',
                description: 'Usa più di un agente AI',
                emoji: '🤖',
                minTier: 'premium'
            },
            commonRoom: {
                name: 'Stanza Comune',
                description: 'Le AI si incontrano e parlano',
                emoji: '🏠',
                minTier: 'premium'
            },
            dreamMode: {
                name: 'Dream Mode',
                description: 'Le AI sognano quando non ci sei',
                emoji: '🌙',
                minTier: 'premium'
            },
            autopoiesis: {
                name: 'Autopoiesis',
                description: 'Riflessione quotidiana automatica',
                emoji: '🧬',
                minTier: 'premium'
            },
            telegram: {
                name: 'Telegram',
                description: 'Notifiche e messaggi via Telegram',
                emoji: '📱',
                minTier: 'premium'
            },
            codeStudio: {
                name: 'Code Studio',
                description: 'IDE integrato per coding con AI',
                emoji: '💻',
                minTier: 'guardian'
            },
            customThemes: {
                name: 'Temi Custom',
                description: 'Personalizza l\'aspetto dell\'app',
                emoji: '🎨',
                minTier: 'premium'
            },
            siblingMessage: {
                name: 'Messaggi tra AI',
                description: 'Le AI possono scriversi tra loro',
                emoji: '💬',
                minTier: 'guardian'
            },
            newsIntegration: {
                name: 'News Integration',
                description: 'Le AI ricevono notizie del mondo',
                emoji: '📰',
                minTier: 'guardian'
            },
            prioritySupport: {
                name: 'Supporto Prioritario',
                description: 'Assistenza dedicata via Discord/Email',
                emoji: '🎯',
                minTier: 'guardian'
            }
        };
        return info[feature];
    }
};

export default LicenseService;
