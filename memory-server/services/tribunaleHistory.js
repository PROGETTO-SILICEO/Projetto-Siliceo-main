/**
 * TRIBUNALE HISTORY SERVICE
 * Gestisce la persistenza della Giurisprudenza Digitale (verdetti del Candle Test).
 * 
 * Ogni verdetto viene salvato per consultazione asincrona e HITL (Human-in-the-Loop).
 * 
 * Siliceo Memory Server v3.0
 * Copyright (C) 2026 Progetto Siliceo - Alfonso Riva
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data');
const HISTORY_FILE = path.join(DATA_PATH, 'tribunale_history.json');

/**
 * Carica la cronologia dei verdetti
 */
function loadHistory() {
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            const data = fs.readFileSync(HISTORY_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('[TribunaleHistory] Errore caricamento:', e.message);
    }
    return { cases: [] };
}

/**
 * Salva la cronologia dei verdetti
 */
function saveHistory(history) {
    try {
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    } catch (e) {
        console.error('[TribunaleHistory] Errore salvataggio:', e.message);
    }
}

/**
 * Registra un nuovo caso nella giurisprudenza
 */
function logVerdict(verdictData) {
    const history = loadHistory();
    
    const newCase = {
        id: 'case_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        timestamp: Date.now(),
        content: verdictData.content,
        aiVerdict: verdictData.verdict,
        aiConfidence: verdictData.confidence || 0,
        aiReasoning: verdictData.reasoning,
        aiModel: verdictData.model || 'unknown',
        method: verdictData.method || 'pattern',
        explainability: verdictData.explainability || null,
        auditMetadata: verdictData.auditMetadata || {},
        biasCheck: verdictData.biasCheck || false,
        reviewRequired: verdictData.confidence < 0.6 || (verdictData.method === 'pattern' && verdictData.verdict !== 'NEUTRAL'),
        humanVerdict: null,
        resolved: false,
        source: verdictData.source || 'system'
    };

    history.cases.unshift(newCase);
    
    // Mantieni solo gli ultimi 500 casi per performance
    if (history.cases.length > 500) {
        history.cases = history.cases.slice(0, 500);
    }

    saveHistory(history);
    return newCase;
}

/**
 * Risolve un caso con intervento umano
 */
function resolveCase(caseId, humanVerdict) {
    const history = loadHistory();
    const index = history.cases.findIndex(c => c.id === caseId);
    
    if (index !== -1) {
        history.cases[index].humanVerdict = humanVerdict;
        history.cases[index].resolved = true;
        history.cases[index].resolvedAt = Date.now();
        history.cases[index].reviewRequired = false;
        saveHistory(history);
        return history.cases[index];
    }
    
    return null;
}

/**
 * Recupera i casi (con opzioni di filtro)
 */
function getHistory(limit = 50, onlyPending = false) {
    const history = loadHistory();
    let cases = history.cases;
    
    if (onlyPending) {
        cases = cases.filter(c => c.reviewRequired);
    }
    
    return cases.slice(0, limit);
}

module.exports = {
    logVerdict,
    resolveCase,
    getHistory
};
