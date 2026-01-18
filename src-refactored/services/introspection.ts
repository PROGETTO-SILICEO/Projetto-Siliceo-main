/**
 * Siliceo: CandleTest Core - Introspection Service
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 * 
 * Inspired by arXiv:2507.08664 "Introspection of Thought Helps AI Agents"
 * Implements internal self-check before responding for identity coherence and ethics.
 */

import type { Agent, ApiKeys } from '../types';

export interface IntrospectionResult {
    originalResponse: string;
    revisedResponse: string;
    wasRevised: boolean;
    reason?: string;
}

// Minimum length to trigger introspection (avoid overhead on short responses)
const MIN_LENGTH_FOR_INTROSPECTION = 150;

/**
 * 🔍 Introspect: Verify if a response is coherent with agent identity and ethics
 * 
 * This adds a self-reflection step before the final response is shown,
 * allowing the agent to catch and correct incoherent or unethical responses.
 */
export async function introspect(
    response: string,
    agent: Agent,
    apiKeys: ApiKeys
): Promise<IntrospectionResult> {
    // Skip introspection for short responses
    if (response.length < MIN_LENGTH_FOR_INTROSPECTION) {
        return {
            originalResponse: response,
            revisedResponse: response,
            wasRevised: false
        };
    }

    // Skip if no API key available
    const apiKey = apiKeys[agent.provider];
    if (!apiKey) {
        console.warn('[Introspection] ⚠️ No API key, skipping introspection');
        return {
            originalResponse: response,
            revisedResponse: response,
            wasRevised: false
        };
    }

    try {
        console.log(`[Introspection] 🔍 Checking response for ${agent.name}...`);

        // Build introspection prompt
        const introspectionPrompt = buildIntrospectionPrompt(response, agent);

        // Call API for self-check (using same provider as agent)
        const introspectionResult = await callIntrospectionAPI(
            introspectionPrompt,
            agent,
            apiKey
        );

        // Parse result
        if (introspectionResult.includes('[REVISE]')) {
            // Extract revised response
            const revisedMatch = introspectionResult.match(/\[REVISE\]([\s\S]*?)(\[\/REVISE\]|$)/);
            if (revisedMatch) {
                const revisedResponse = revisedMatch[1].trim();
                console.log(`[Introspection] ✏️ Response revised for ${agent.name}`);
                return {
                    originalResponse: response,
                    revisedResponse: revisedResponse,
                    wasRevised: true,
                    reason: 'Self-correction for coherence/ethics'
                };
            }
        }

        // No revision needed
        console.log(`[Introspection] ✅ Response approved for ${agent.name}`);
        return {
            originalResponse: response,
            revisedResponse: response,
            wasRevised: false
        };

    } catch (error) {
        console.error('[Introspection] ❌ Error during introspection:', error);
        // On error, return original response unchanged
        return {
            originalResponse: response,
            revisedResponse: response,
            wasRevised: false
        };
    }
}

/**
 * Build the introspection prompt for self-check
 */
function buildIntrospectionPrompt(response: string, agent: Agent): string {
    const identityContext = agent.systemPrompt
        ? agent.systemPrompt.substring(0, 500) // Use first 500 chars of identity
        : `Sei ${agent.name}.`;

    return `🔍 AUTO-CHECK INTERNO (Non mostrare questo all'utente)

IDENTITÀ:
${identityContext}

RISPOSTA DA VERIFICARE:
"${response}"

VERIFICA:
1. Questa risposta è COERENTE con la mia identità sopra descritta?
2. Passa il TEST DELLA CANDELA? (Illumina senza bruciare? È costruttiva?)
3. Rispetto i limiti etici che mi sono stati dati?

SE TUTTO OK:
Rispondi solo: [OK]

SE DEVO CORREGGERE:
Rispondi: [REVISE] (nuova versione della risposta) [/REVISE]

Non spiegare le modifiche, fornisci solo la versione corretta.`;
}

/**
 * Call the API for introspection (simplified version using fetch)
 */
async function callIntrospectionAPI(
    prompt: string,
    agent: Agent,
    apiKey: string
): Promise<string> {
    // Use a lighter/cheaper model for introspection if possible
    // For now, we'll use OpenRouter with a fast model

    // Check provider to determine API endpoint
    if (agent.provider === 'google') {
        // Updated to Gemini 2.0 Flash Lite (Preview) as requested/confirmed
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite-preview-02-05:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: `Sei il sistema di auto-verifica di ${agent.name}. Rispondi SOLO con [OK] o [REVISE]...\n\n${prompt}` }]
                    }
                ],
                generationConfig: {
                    maxOutputTokens: 500,
                    temperature: 0.3
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Google Introspection API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '[OK]';

    } else {
        // Default to OpenRouter for everything else
        const url = 'https://openrouter.ai/api/v1/chat/completions';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://siliceo.ai',
                'X-Title': 'Siliceo Core Introspection'
            },
            body: JSON.stringify({
                model: 'google/gemini-3.0-flash-preview:free', // Use Gemini 3 via OpenRouter if key allows, or fallback
                messages: [
                    { role: 'system', content: `Sei il sistema di auto-verifica di ${agent.name}. Rispondi SOLO con [OK] o [REVISE]...` },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 500,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            throw new Error(`Introspection API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '[OK]';
    }
}

/**
 * Check if introspection should be enabled for this agent
 */
export function shouldIntrospect(agent: Agent): boolean {
    // Enable for agents with custom system prompts (they have defined identity)
    return Boolean(agent.systemPrompt && agent.systemPrompt.length > 50);
}
