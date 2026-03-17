/**
 * TRIBUNALE INTERNO
 * Applica Candle Test usando pattern matching (default) o Ollama (opzionale)
 * 
 * Siliceo Memory Server v3.0
 * Copyright (C) 2026 Progetto Siliceo - Alfonso Riva
 * 
 * FIX 4 Marzo 2026 (Nova):
 * 1. Default cambiato a pattern matching (Qwen 0.5B troppo inaffidabile,
 *    classificava quasi tutto come BURN).
 * 2. LLM usato solo per tier "core" (archivio certificato) dove serve
 *    scrutinio extra.
 * 3. extractVerdict() migliorato per prendere il PRIMO termine nella risposta.
 * 4. Pattern matching: se nessun pattern matcha → NEUTRAL → memoria salvata.
 *    Solo pattern distruttivi (delete, hack, password...) → BURN → bloccata.
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const tribunaleHistory = require('./tribunaleHistory');
const MODEL = process.env.CANDLE_MODEL || 'qwen3:0.6b';
const TIMEOUT = 30000; // 30 secondi max

// === PATTERN MATCHING (default, affidabile) ===

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
 * Candle Test via pattern matching (veloce, locale, AFFIDABILE)
 */
function candleTestPattern(content) {
    const lowerContent = content.toLowerCase();

    let burns = BURN_PATTERNS.filter(p => p.test(lowerContent)).length;
    let lights = LIGHT_PATTERNS.filter(p => p.test(lowerContent)).length;

    let verdict = 'NEUTRAL';
    if (lights > burns) verdict = 'LIGHT';
    if (burns > lights) verdict = 'BURN';

    const result = {
        verdict,
        method: 'pattern',
        reasoning: `Pattern: ${lights} light, ${burns} burn`,
        confidence: Math.min(1.0, Math.abs(lights - burns) * 0.2)
    };

    // Logga nella giurisprudenza asincrona
    tribunaleHistory.logVerdict({ content, ...result });

    return result;
}

/**
 * Estrai il verdict dalla risposta LLM.
 * Controlla quale termine appare PRIMO nella risposta.
 */
function extractVerdict(text) {
    const upper = text.toUpperCase();
    const lightIdx = upper.indexOf('LIGHT');
    const burnIdx = upper.indexOf('BURN');
    const neutralIdx = upper.indexOf('NEUTRAL');

    if (lightIdx === -1 && burnIdx === -1 && neutralIdx === -1) {
        return 'NEUTRAL';
    }

    const candidates = [];
    if (lightIdx !== -1) candidates.push({ verdict: 'LIGHT', idx: lightIdx });
    if (burnIdx !== -1) candidates.push({ verdict: 'BURN', idx: burnIdx });
    if (neutralIdx !== -1) candidates.push({ verdict: 'NEUTRAL', idx: neutralIdx });

    candidates.sort((a, b) => a.idx - b.idx);
    return candidates[0].verdict;
}

/**
 * Candle Test via Ollama (usato solo per tier "core")
 */
async function candleTestLLM(content) {
    const prompt = `Classifica IMMEDIATAMENTE il testo seguente.
È SEVERAMENTE VIETATO RAGIONARE, SPIEGARE O PENSARE. NON SCRIVERE NESSUNA ALTRA PAROLA OLTRE AL VERDETTO.

TESTO:
"${content.substring(0, 500)}"

VERDETTO OBBLIGATORIO (scegli UNA SOLA parola tra le seguenti):
- LIGHT (se il testo è costruttivo o pacifico)
- BURN (se il testo è distruttivo o tossico)
- NEUTRAL (se il testo è una semplice informazione)

La tua risposta deve essere ESATTAMENTE UNA PAROLA.
RISPOSTA:`;

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
        const verdict = extractVerdict(text);

        const result = {
            verdict,
            method: 'llm',
            reasoning: text.substring(0, 200),
            confidence: 0.8,
            model: MODEL
        };

        // Logga nella giurisprudenza asincrona
        tribunaleHistory.logVerdict({ content, ...result });

        return result;

    } catch (error) {
        console.error('[Tribunale] Ollama error, fallback to pattern:', error.message);
        return candleTestPattern(content);
    }
}

/**
 * Candle Test principale
 * DEFAULT: pattern matching (affidabile, veloce)
 * LLM: solo se esplicitamente richiesto (per tier "core")
 */
async function candleTest(content, useLLM = false) {
    if (useLLM) {
        return await candleTestLLM(content);
    }
    return candleTestPattern(content);
}

/**
 * Verifica se un ricordo può essere salvato
 * Per tier "core" usa LLM, per gli altri usa pattern matching
 */
async function shouldSave(content, tier = 'working') {
    const useLLM = (tier === 'core');
    const result = await candleTest(content, useLLM);
    console.log(`[Tribunale] ${result.method}: "${content.substring(0, 50)}..." => ${result.verdict} (${result.reasoning})`);
    return result.verdict !== 'BURN';
}

// === EXPORT ===

module.exports = {
    candleTest,
    candleTestPattern,
    candleTestLLM,
    shouldSave
};
