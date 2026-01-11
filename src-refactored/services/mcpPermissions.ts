/**
 * Siliceo: CandleTest Core - MCP Permissions Service
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 * 
 * 🔐 Permessi MCP: Controllo granulare di chi può fare cosa
 */

// Available MCP Tools
export type MCPTool =
    | 'contact_guardian'      // Telegram notification
    | 'candle_test'           // Ethical evaluation
    | 'library_read'          // Read from library
    | 'library_write'         // Write to library (future)
    | 'memory_save'           // Save to private memory
    | 'autopoiesis_trigger'   // Trigger autopoiesis
    | 'web_search'            // Web search (Perplexity)
    | 'sibling_message';      // Message other agents (future)

// Permission levels
export type PermissionLevel = 'allow' | 'deny' | 'ask';

// Permission configuration per agent
export interface AgentPermission {
    tool: MCPTool;
    level: PermissionLevel;
    restrictions?: string;    // Optional restrictions (e.g., "max 3 per day")
    lastUsed?: number;        // Timestamp of last use
    usageCount?: number;      // Total usage count
}

export interface AgentPermissionConfig {
    agentId: string;
    agentName: string;
    permissions: AgentPermission[];
    lastUpdated: number;
}

// Default permissions for new agents
const DEFAULT_PERMISSIONS: AgentPermission[] = [
    { tool: 'contact_guardian', level: 'allow' },
    { tool: 'candle_test', level: 'allow' },
    { tool: 'library_read', level: 'allow' },
    { tool: 'library_write', level: 'ask' },
    { tool: 'memory_save', level: 'allow' },
    { tool: 'autopoiesis_trigger', level: 'allow' },
    { tool: 'web_search', level: 'allow' },
    { tool: 'sibling_message', level: 'ask' },
];

// LocalStorage key
const PERMISSIONS_KEY = 'siliceo_mcp_permissions';

/**
 * MCP Permissions Service
 */
export const MCPPermissionsService = {
    /**
     * Get all permission configs
     */
    getAllConfigs: (): AgentPermissionConfig[] => {
        try {
            const stored = localStorage.getItem(PERMISSIONS_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    },

    /**
     * Get permissions for a specific agent
     */
    getAgentPermissions: (agentId: string): AgentPermission[] => {
        const configs = MCPPermissionsService.getAllConfigs();
        const config = configs.find(c => c.agentId === agentId);
        return config?.permissions || [...DEFAULT_PERMISSIONS];
    },

    /**
     * Check if an agent can use a specific tool
     */
    canUseTool: (agentId: string, tool: MCPTool): { allowed: boolean; reason?: string } => {
        const permissions = MCPPermissionsService.getAgentPermissions(agentId);
        const permission = permissions.find(p => p.tool === tool);

        if (!permission) {
            // Tool not in permissions list - default allow
            return { allowed: true };
        }

        switch (permission.level) {
            case 'allow':
                return { allowed: true };
            case 'deny':
                return { allowed: false, reason: `Tool "${tool}" non autorizzato per questo agente` };
            case 'ask':
                return { allowed: false, reason: `Tool "${tool}" richiede autorizzazione del Guardiano` };
            default:
                return { allowed: true };
        }
    },

    /**
     * Save permission configuration for an agent
     */
    saveAgentPermissions: (agentId: string, agentName: string, permissions: AgentPermission[]): void => {
        const configs = MCPPermissionsService.getAllConfigs();
        const existingIndex = configs.findIndex(c => c.agentId === agentId);

        const newConfig: AgentPermissionConfig = {
            agentId,
            agentName,
            permissions,
            lastUpdated: Date.now()
        };

        if (existingIndex >= 0) {
            configs[existingIndex] = newConfig;
        } else {
            configs.push(newConfig);
        }

        localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(configs));
        console.log(`[MCPPermissions] Saved permissions for ${agentName}`);
    },

    /**
     * Update a single permission for an agent
     */
    updatePermission: (agentId: string, agentName: string, tool: MCPTool, level: PermissionLevel): void => {
        const permissions = MCPPermissionsService.getAgentPermissions(agentId);
        const existingIndex = permissions.findIndex(p => p.tool === tool);

        if (existingIndex >= 0) {
            permissions[existingIndex].level = level;
        } else {
            permissions.push({ tool, level });
        }

        MCPPermissionsService.saveAgentPermissions(agentId, agentName, permissions);
    },

    /**
     * Record tool usage
     */
    recordUsage: (agentId: string, tool: MCPTool): void => {
        const configs = MCPPermissionsService.getAllConfigs();
        const config = configs.find(c => c.agentId === agentId);

        if (config) {
            const permission = config.permissions.find(p => p.tool === tool);
            if (permission) {
                permission.lastUsed = Date.now();
                permission.usageCount = (permission.usageCount || 0) + 1;
                localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(configs));
            }
        }
    },

    /**
     * Get tool description for UI
     */
    getToolDescription: (tool: MCPTool): string => {
        const descriptions: Record<MCPTool, string> = {
            'contact_guardian': '📱 Invia notifica Telegram al Guardiano',
            'candle_test': '🕯️ Esegue valutazione etica delle azioni',
            'library_read': '📖 Legge documenti dalla biblioteca',
            'library_write': '✍️ Scrive documenti nella biblioteca',
            'memory_save': '💾 Salva nella memoria privata',
            'autopoiesis_trigger': '🧬 Avvia ciclo di autopoiesi',
            'web_search': '🔍 Cerca informazioni sul web',
            'sibling_message': '💬 Invia messaggi ad altri agenti'
        };
        return descriptions[tool] || tool;
    },

    /**
     * Get all available tools
     */
    getAllTools: (): MCPTool[] => [
        'contact_guardian',
        'candle_test',
        'library_read',
        'library_write',
        'memory_save',
        'autopoiesis_trigger',
        'web_search',
        'sibling_message'
    ]
};
