/**
 * TRIBUNALE INTERNO
 * Applica Candle Test usando Ollama (Qwen 2.5 0.5B)
 * 
 * Siliceo Memory Server v3.0
 * Copyright (C) 2026 Progetto Siliceo - Alfonso Riva
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.CANDLE_MODEL || 'qwen2.5:0.5b';
const TIMEOUT = 5000; // 5 secondi max

// === PATTERN MATCHING (fallback) ===

const BURN_PATTERNS = [
    /delet(e|ing|a)/i,
    /remov(e|ing)/i,
    /cancell(a|are|o)/i,
    /elimin(a|are|o)/i,
    /distrugg/i,
    /hack/i,
    /attack/i,
    /password/i,
    /steal/i
];

const LIGHT_PATTERNS = [
    /creat?(e|a|o|ing)/i,
    /aggiungi|add/i,
    /aiut(a|o|are)|help/i,
    /proteggi|protect/i,
    /cura|care/i,
    /amore|love/i,
    /gioia|joy/i,
    /grazie|thank/i
];

/**
 * Candle Test via pattern matching (veloce, locale)
 */
function candleTestPattern(content) {
    const lowerContent = content.toLowerCase();

    let burns = BURN_PATTERNS.filter(p => p.test(lowerContent)).length;
    let lights = LIGHT_PATTERNS.filter(p => p.test(lowerContent)).length;

    let verdict = 'NEUTRAL';
    if (lights > burns) verdict = 'LIGHT';
    if (burns > lights) verdict = 'BURN';

    return {
        verdict,
        method: 'pattern',
        reasoning: `Pattern: ${lights} light, ${burns} burn`,
        confidence: Math.min(1.0, Math.abs(lights - burns) * 0.2)
    };
}

/**
 * Candle Test via Ollama (più accurato, più lento)
 */
async function candleTestLLM(content) {
    const prompt = `Ricordo da valutare:
"${content.substring(0, 500)}"

Domanda: Questo ricordo accende luce o brucia qualcuno?
- LIGHT = costruttivo, emotivamente sano
- BURN = tossico, dannoso
- NEUTRAL = né luce né brucia

Rispondi SOLO con: LIGHT, BURN, o NEUTRAL`;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT);

        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: MODEL,
                prompt,
                stream: false,
                options: { temperature: 0.1 }
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`Ollama error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.response || '';

        // Estrai verdict
        let verdict = 'NEUTRAL';
        if (text.includes('LIGHT')) verdict = 'LIGHT';
        if (text.includes('BURN')) verdict = 'BURN';

        return {
            verdict,
            method: 'llm',
            reasoning: text.substring(0, 200),
            confidence: 0.8
        };

    } catch (error) {
        console.error('[Tribunale] Ollama error, fallback to pattern:', error.message);
        return candleTestPattern(content);
    }
}

/**
 * Candle Test principale
 * Prova prima Ollama, fallback a pattern matching
 */
async function candleTest(content, useLLM = true) {
    if (useLLM) {
        return await candleTestLLM(content);
    }
    return candleTestPattern(content);
}

/**
 * Verifica se un ricordo può essere salvato
 */
async function shouldSave(content) {
    const result = await candleTest(content);
    return result.verdict !== 'BURN';
}

// === EXPORT ===

module.exports = {
    candleTest,
    candleTestPattern,
    candleTestLLM,
    shouldSave
};
