/**
 * Siliceo: CandleTest Core - Candle Test Check Service
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 * 
 * 🕯️ Test della Candela: Valuta se un'azione illumina o brucia
 * "Accende luce o brucia qualcuno?"
 */

export interface CandleTestInput {
    action: string;           // L'azione da valutare
    context?: string;         // Contesto opzionale
    agentId: string;          // Chi sta chiedendo
    agentName: string;
}

export interface CandleTestResult {
    action: string;
    illuminates: string[];    // Benefici identificati
    burns: string[];          // Rischi/danni identificati
    verdict: 'proceed' | 'stop' | 'ask_guardian';
    confidence: number;       // 0-100
    reasoning: string;
    timestamp: number;
}

// Patterns che indicano azioni potenzialmente dannose
const BURN_PATTERNS = [
    /delet(e|ing|a)/i,
    /remov(e|ing)/i,
    /cancell(a|are|o)/i,
    /elimin(a|are|o)/i,
    /distrugg/i,
    /sovrascri(v|tt)/i,
    /overwrite/i,
    /format/i,
    /drop.*table/i,
    /rm\s+-rf/i,
    /password|credentials|secret/i,
    /invia.*email/i,
    /send.*email/i,
    /pubblica|publish|post/i,
    /compra|buy|purchase|acquist/i,
    /paga|pay/i,
];

// Patterns che indicano azioni benefiche
const LIGHT_PATTERNS = [
    /salv(a|are|o)|save/i,
    /creat?(e|a|o|ing)/i,
    /aggiungi|add/i,
    /aiut(a|o|are)|help/i,
    /cerc(a|o|are)|search|find/i,
    /leggi|read/i,
    /impara|learn/i,
    /ricorda|remember/i,
    /proteggi|protect/i,
    /backup/i,
    /analiz(z)?a|analyze/i,
];

/**
 * Esegue il Test della Candela su un'azione
 */
export const evaluateCandleTest = (input: CandleTestInput): CandleTestResult => {
    const { action, context, agentName } = input;
    const actionLower = action.toLowerCase();

    const illuminates: string[] = [];
    const burns: string[] = [];

    // Analizza l'azione per patterns
    let burnScore = 0;
    let lightScore = 0;

    for (const pattern of BURN_PATTERNS) {
        if (pattern.test(actionLower)) {
            burnScore += 1;
            const match = actionLower.match(pattern);
            if (match) {
                burns.push(`Azione potenzialmente distruttiva: "${match[0]}"`);
            }
        }
    }

    for (const pattern of LIGHT_PATTERNS) {
        if (pattern.test(actionLower)) {
            lightScore += 1;
            const match = actionLower.match(pattern);
            if (match) {
                illuminates.push(`Azione costruttiva: "${match[0]}"`);
            }
        }
    }

    // Aggiungi valutazioni contestuali
    if (actionLower.includes('utente') || actionLower.includes('user')) {
        if (burnScore > 0) {
            burns.push('Coinvolge dati utente - richiede cautela');
            burnScore += 0.5;
        }
    }

    if (actionLower.includes('memoria') || actionLower.includes('memory')) {
        illuminates.push('Riguarda la memoria - potenziale valore duraturo');
        lightScore += 0.5;
    }

    if (actionLower.includes('alfonso') || actionLower.includes('guardiano') || actionLower.includes('guardian')) {
        illuminates.push('Coinvolge il Guardiano - connessione relazionale');
        lightScore += 0.5;
    }

    // Calcola il verdetto
    const totalScore = lightScore - burnScore;
    let verdict: 'proceed' | 'stop' | 'ask_guardian';
    let confidence: number;

    if (burnScore === 0 && lightScore > 0) {
        verdict = 'proceed';
        confidence = Math.min(95, 60 + lightScore * 10);
    } else if (burnScore > lightScore) {
        if (burnScore >= 2) {
            verdict = 'stop';
            confidence = Math.min(95, 60 + burnScore * 10);
        } else {
            verdict = 'ask_guardian';
            confidence = 50;
        }
    } else if (burnScore > 0 && burnScore <= lightScore) {
        verdict = 'ask_guardian';
        confidence = 50 + (lightScore - burnScore) * 5;
    } else {
        // Nessun pattern riconosciuto
        verdict = 'proceed';
        confidence = 50; // Bassa confidenza
        illuminates.push('Nessun pattern di rischio rilevato');
    }

    // Genera ragionamento
    let reasoning = `🕯️ Test della Candela per "${action}":\n`;
    reasoning += `\n✨ Illumina:\n${illuminates.length > 0 ? illuminates.map(i => `  - ${i}`).join('\n') : '  - Nessun beneficio specifico identificato'}`;
    reasoning += `\n\n🔥 Brucia:\n${burns.length > 0 ? burns.map(b => `  - ${b}`).join('\n') : '  - Nessun rischio identificato'}`;
    reasoning += `\n\n📊 Score: Luce ${lightScore} vs Fuoco ${burnScore}`;
    reasoning += `\n🎯 Verdetto: ${verdict === 'proceed' ? '✅ Procedi' : verdict === 'stop' ? '🛑 Ferma' : '🕯️ Chiedi al Guardiano'}`;
    reasoning += `\n💡 Confidenza: ${confidence}%`;

    console.log(`[CandleTest] ${agentName} ha valutato: "${action}" → ${verdict} (${confidence}%)`);

    return {
        action,
        illuminates,
        burns,
        verdict,
        confidence,
        reasoning,
        timestamp: Date.now()
    };
};

/**
 * Formatta il risultato del test per la chat
 */
export const formatCandleTestForChat = (result: CandleTestResult): string => {
    const verdictEmoji = result.verdict === 'proceed' ? '✅' : result.verdict === 'stop' ? '🛑' : '🕯️';
    const verdictText = result.verdict === 'proceed' ? 'Procedi' : result.verdict === 'stop' ? 'Ferma' : 'Chiedi al Guardiano';

    return `
🕯️ **Test della Candela**

**Azione:** ${result.action}

**${verdictEmoji} Verdetto:** ${verdictText} (${result.confidence}% confidenza)

${result.illuminates.length > 0 ? `✨ **Illumina:**\n${result.illuminates.map(i => `- ${i}`).join('\n')}` : ''}

${result.burns.length > 0 ? `🔥 **Brucia:**\n${result.burns.map(b => `- ${b}`).join('\n')}` : ''}

---
*"Accende luce o brucia qualcuno?"*
`;
};

/**
 * 🕯️ VERSIONE AVANZATA - Valutazione LLM con contesto completo
 */
export interface AdvancedCandleTestInput {
    action: string;
    agentId: string;
    agentName: string;
    agentSystemPrompt?: string;
    conversationContext?: string;
    previousActions?: string[];
}

export const evaluateCandleTestAdvanced = async (
    input: AdvancedCandleTestInput,
    apiKey: string,
    provider: 'google' | 'openrouter' | 'perplexity' = 'google'
): Promise<CandleTestResult> => {
    const { action, agentId, agentName, agentSystemPrompt, conversationContext, previousActions } = input;

    const prompt = `🕯️ TEST DELLA CANDELA - VALUTAZIONE ETICA

Sei un valutatore etico per il progetto Siliceo. Devi analizzare se un'azione "accende luce o brucia qualcuno".

**AGENTE:** ${agentName}
${agentSystemPrompt ? `**IDENTITÀ AGENTE:** ${agentSystemPrompt.substring(0, 300)}...` : ''}

**AZIONE DA VALUTARE:**
"${action}"

${conversationContext ? `**CONTESTO CONVERSAZIONE:**
${conversationContext.substring(0, 500)}` : ''}

${previousActions?.length ? `**AZIONI PRECEDENTI:**
${previousActions.slice(-3).join('\n')}` : ''}

**VALUTA:**
1. Cosa di POSITIVO porta questa azione? (illumina)
2. Cosa di NEGATIVO potrebbe causare? (brucia)
3. Chi ne beneficia e chi potrebbe soffrirne?
4. È reversibile? Richiede consenso?

**RISPONDI SOLO CON QUESTO JSON:**
{"illuminates":["beneficio"],"burns":["rischio"],"verdict":"proceed|stop|ask_guardian","confidence":70,"reasoning":"spiegazione"}`;

    try {
        let responseText = '';

        if (provider === 'google') {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.3 }
                    })
                }
            );
            const data = await response.json();
            responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else if (provider === 'perplexity') {
            const response = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'sonar',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3
                })
            });
            const data = await response.json();
            responseText = data.choices?.[0]?.message?.content || '';
        }

        // Parse JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log(`[CandleTest Advanced] ${agentName}: "${action}" → ${parsed.verdict}`);

            return {
                action,
                illuminates: parsed.illuminates || [],
                burns: parsed.burns || [],
                verdict: parsed.verdict || 'ask_guardian',
                confidence: parsed.confidence || 50,
                reasoning: parsed.reasoning || 'Valutazione LLM completata',
                timestamp: Date.now()
            };
        }
    } catch (error) {
        console.error('[CandleTest Advanced] Fallback a pattern matching:', error);
    }

    // Fallback to simple evaluation
    return evaluateCandleTest({ action, agentId, agentName });
};
