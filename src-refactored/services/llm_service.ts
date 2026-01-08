import { getAiResponse } from './api';
import type { Agent, Message, ApiKeys, Attachment, Verbosity } from '../types';
import { generateId } from '../utils/generateId';

// Default identity for the Marketplace Agent if none provided
const DEFAULT_MARKETPLACE_AGENT: Agent = {
    id: 'marketplace-agent',
    name: 'Marketplace Agent',
    description: 'Specialist in creating sales listings',
    avatar: '🛍️',
    model: 'gemini-1.5-pro', // Default powerful model
    provider: 'google',
    systemPrompt: 'You are an expert copywriter and sales specialist. Your goal is to create compelling listings for online marketplaces like Subito.it and eBay.',
    primaryIntention: 'Sell items effectively',
    emotionalState: {
        current: 'focused',
        valence: 0.8,
        arousal: 0.6,
        dominance: 0.7
    }
};

export class LLMService {
    private apiKeys: ApiKeys;
    private agent: Agent;

    constructor(apiKeys: ApiKeys, agent: Agent = DEFAULT_MARKETPLACE_AGENT) {
        this.apiKeys = apiKeys;
        this.agent = agent;
    }

    /**
     * Generates a completion for the given prompt.
     */
    async complete(prompt: string, attachment?: Attachment): Promise<string> {
        // Create a temporary history for this single-turn interaction
        // In a real agent loop, we might maintain history
        const messageHistory: Message[] = [];

        try {
            const response = await getAiResponse(
                this.agent,
                messageHistory,
                prompt,
                attachment || null,
                this.apiKeys,
                'Normale' as Verbosity
            );
            return response;
        } catch (error) {
            console.error('[LLMService] Creation failed:', error);
            throw error;
        }
    }
}
