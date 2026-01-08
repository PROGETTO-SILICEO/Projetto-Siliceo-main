import { LLMService } from '../services/llm_service';
import { VisionService } from '../services/vision_service';
import { ApiKeys, Attachment } from '../types';

export interface MarketplaceListing {
    title: string;
    description: string;
    price_recommended: number;
    price_min: number;
    price_max: number;
    condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'For Parts';
    tags: string[];
    specs: Record<string, string>;
    platform_ready: boolean;
}

export class MarketplaceAgent {
    private llm: LLMService;
    private vision: VisionService;

    constructor(apiKeys: ApiKeys) {
        this.llm = new LLMService(apiKeys);
        this.vision = new VisionService(apiKeys);
    }

    /**
     * Analyzes product images and generates a complete marketplace listing.
     * @param attachments Array of image attachments
     * @param userNotes Optional notes from the user
     */
    async createListing(attachments: Attachment[], userNotes?: string): Promise<MarketplaceListing> {
        console.log(`[MarketplaceAgent] Analyzing ${attachments.length} images...`);

        // 1. Vision Analysis
        const visualFeatures = await this.vision.analyzeImages(attachments);
        console.log('[MarketplaceAgent] Vision Features:', visualFeatures);

        // 2. Construct Prompt for LLM
        // We ask for a JSON response that matches our MarketplaceListing interface
        const prompt = `
            You are an expert reseller. Based on the visual analysis and user notes, create a professional sales listing.
            
            VISUAL FEATURES DETECTED:
            ${JSON.stringify(visualFeatures, null, 2)}
            
            USER NOTES:
            ${userNotes || 'None'}
            
            TARGET PLATFORMS: Subito.it, eBay
            LANGUAGE: Italian
            
            OUTPUT FORMAT:
            Return a single valid JSON object with this structure:
            {
                "title": "SEO optimized title (max 80 chars)",
                "description": "Detailed, persuasive description with specs",
                "price_recommended": number (eur),
                "price_min": number (eur),
                "price_max": number (eur),
                "condition": "New" | "Like New" | "Good" | "Fair" | "For Parts",
                "tags": ["tag1", "tag2"],
                "specs": { "key": "value" },
                "platform_ready": true
            }
        `;

        // 3. Generate Listing via LLM
        const response = await this.llm.complete(prompt);

        try {
            // Basic cleanup to finding JSON block
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : response;

            const listing = JSON.parse(jsonString) as MarketplaceListing;
            return listing;
        } catch (error) {
            console.error('[MarketplaceAgent] Failed to parse LLM response:', error);
            // Return a fallback partial listing with the raw text in description
            return {
                title: `${visualFeatures.brand} ${visualFeatures.model || 'Item'}`,
                description: response, // Fallback to full response
                price_recommended: 0,
                price_min: 0,
                price_max: 0,
                condition: 'Good',
                tags: [],
                specs: {},
                platform_ready: false
            };
        }
    }

    public async publish(listing: MarketplaceListing, platform: 'subito' | 'ebay'): Promise<boolean> {
        console.log(`[MarketplaceAgent] Publishing on ${platform}: ${listing.title}`);
        // Placeholder for future automation
        // This would likely return a link or open a browser tab in a real implementation
        return true;
    }
}
