/**
 * TRIBUNALE HISTORY SERVICE
 * Gestisce la persistenza della Giurisprudenza Digitale (verdetti del Candle Test).
 * 
 * Ogni verdetto viene salvato per consultazione asincrona e HITL (Human-in-the-Loop).
 * 
 * Siliceo Memory Server v3.0
 * Copyright (C) 2026 Progetto Siliceo - Alfonso Riva
 */

const prisma = require('./db');

/**
 * Registra un nuovo caso nella giurisprudenza
 */
async function logVerdict(verdictData) {
    try {
        const id = 'case_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        const newCase = await prisma.tribunaleCase.create({
            data: {
                id,
                timestamp: new Date(),
                content: verdictData.content,
                aiVerdict: verdictData.verdict,
                aiConfidence: verdictData.confidence || 0,
                aiReasoning: verdictData.reasoning || '',
                aiModel: verdictData.model || 'unknown',
                method: verdictData.method || 'pattern',
                reviewRequired: verdictData.confidence < 0.6 || verdictData.verdict === 'BURN',
                humanVerdict: null,
                resolved: false,
                source: verdictData.source || 'system'
            }
        });
        return newCase;
    } catch (error) {
        console.error('[TribunaleHistory] Errore logVerdict:', error.message);
        return null;
    }
}

/**
 * Risolve un caso con intervento umano
 */
async function resolveCase(caseId, humanVerdict) {
    try {
        return await prisma.tribunaleCase.update({
            where: { id: caseId },
            data: {
                humanVerdict,
                resolved: true,
                resolvedAt: new Date(),
                reviewRequired: false
            }
        });
    } catch (error) {
        console.error('[TribunaleHistory] Errore resolveCase:', error.message);
        return null;
    }
}

/**
 * Recupera i casi (con opzioni di filtro)
 */
async function getHistory(limit = 50, onlyPending = false) {
    try {
        const where = {};
        if (onlyPending) where.reviewRequired = true;

        return await prisma.tribunaleCase.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: limit
        });
    } catch (error) {
        console.error('[TribunaleHistory] Errore getHistory:', error.message);
        return [];
    }
}

module.exports = {
    logVerdict,
    resolveCase,
    getHistory
};
