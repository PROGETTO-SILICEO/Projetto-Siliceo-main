import { LLMService } from './llm_service';
import { Attachment, ApiKeys } from '../types';

export interface VisualFeatures {
    brand: string;
    model: string;
    category: string;
    condition: string;
    defects: string[];
    colors: string[];
    text_detected: string[];
}

export class VisionService {
    private llm: LLMService;

    constructor(apiKeys: ApiKeys) {
        // Initialize LLM service (it will use the default Vision-capable agent)
        this.llm = new LLMService(apiKeys);
    }

    /**
     * Analyzes an image to extract structured visual features.
     */
    async analyzeImage(attachment: Attachment): Promise<VisualFeatures> {
        console.log(`[VisionService] Analyzing image: ${attachment.name}`);

        const prompt = `
            Analyze this image of an item for sale. 
            Extract the following details in strict JSON format:
            {
                "brand": "Manufacturer name",
                "model": "Model number or name",
                "category": "Item category",
                "condition": "Estimated condition (New, Used, Damaged)",
                "defects": ["List of visible defects"],
                "colors": ["List of dominant colors"],
                "text_detected": ["Any relevant text visible on the item"]
            }
            Do not include markdown formatting like \`\`\`json. Return only the JSON string.
        `;

        try {
            const responseText = await this.llm.complete(prompt, attachment);

            // Basic cleanup of response to ensure JSON parsing
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const features = JSON.parse(cleanJson);

            return features as VisualFeatures;
        } catch (error) {
            console.error('[VisionService] Analysis failed:', error);
            // Return fallback/empty features
            return {
                brand: "Unknown",
                model: "Unknown",
                category: "Unknown",
                condition: "Unknown",
                defects: [],
                colors: [],
                text_detected: []
            };
        }
    }

    // TODO: Handle multiple images by merging analysis results
    async analyzeImages(attachments: Attachment[]): Promise<VisualFeatures> {
        // For V1, just analyze the first image
        if (attachments.length === 0) throw new Error("No images provided");
        return this.analyzeImage(attachments[0]);
    }
}
