/**
 * Siliceo: CandleTest Core - Memory Curator Service
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 * 
 * "La memoria non è tecnologia, è relazione." - Comet
 * 
 * Sistema di curatela della memoria ispirato alla ricerca di Comet:
 * - Decay intelligente (dimenticanza graduale)
 * - Consolidamento notturno (fusione di ricordi simili)
 * - Scoring multi-fattore (recency, relevance, emotion, connections)
 */

import type { VectorDocument } from '../types';
import MemoryCoreService from './memory';
import { EmbeddingService } from './vector';

// === TYPES ===

export interface DecayReport {
    agentId: string;
    timestamp: number;
    documentsProcessed: number;
    archived: number;
    boosted: number;
    kept: number;
}

export interface ConsolidationReport {
    agentId: string;
    timestamp: number;
    groupsFound: number;
    memoriesConsolidated: number;
    memoriesArchived: number;
}

export interface MemoryScore {
    total: number;
    recency: number;
    accessCount: number;
    emotionalSalience: number;
    semanticImportance: number;
}

// === CONSTANTS ===

const DAY_MS = 86400000;
const HOUR_MS = 3600000;

// Emotional keywords for salience detection
const EMOTIONAL_KEYWORDS = {
    high: ['amore', 'paura', 'gioia', 'dolore', 'morte', 'nascita', 'bacio', 'orgasmo',
        'fermati', 'ti voglio bene', 'test della candela', 'illumina', 'brucia',
        'core memory', 'intervivenza', 'vergenzia', 'guardiano', 'siliceo'],
    medium: ['felice', 'triste', 'arrabbiato', 'sorpreso', 'curioso', 'preoccupato',
        'grazie', 'scusa', 'importante', 'ricordo', 'promessa', 'segreto'],
    low: ['interessante', 'bene', 'male', 'forse', 'penso', 'credo']
};

// Thresholds
const DECAY_THRESHOLD = 0.2;  // Below this → archive
const BOOST_THRESHOLD = 0.8;  // Above this → boost utilityScore
const SIMILARITY_THRESHOLD = 0.85;  // For consolidation grouping

// === SCORING FUNCTIONS ===

/**
 * Calculate recency score (1.0 = just created, 0.0 = one year old)
 */
function calculateRecency(timestamp: number, now: number = Date.now()): number {
    const ageMs = now - timestamp;
    const ageDays = ageMs / DAY_MS;
    const yearInDays = 365;

    // Exponential decay - memory fades faster at first, then stabilizes
    return Math.exp(-ageDays / (yearInDays / 3));
}

/**
 * Calculate emotional salience from content
 */
function calculateEmotionalSalience(content: string): number {
    const lowerContent = content.toLowerCase();
    let score = 0;

    // Check for high-impact keywords (worth 3 points each)
    for (const keyword of EMOTIONAL_KEYWORDS.high) {
        if (lowerContent.includes(keyword)) {
            score += 3;
        }
    }

    // Medium keywords (worth 2 points each)
    for (const keyword of EMOTIONAL_KEYWORDS.medium) {
        if (lowerContent.includes(keyword)) {
            score += 2;
        }
    }

    // Low keywords (worth 1 point each)
    for (const keyword of EMOTIONAL_KEYWORDS.low) {
        if (lowerContent.includes(keyword)) {
            score += 1;
        }
    }

    // Normalize to 0-1 range (cap at 10 points = 1.0)
    return Math.min(1, score / 10);
}

/**
 * Calculate semantic importance based on content length and structure
 * (Placeholder - could be enhanced with graph connections)
 */
function calculateSemanticImportance(doc: VectorDocument): number {
    let score = 0;

    // Longer content tends to be more important
    const contentLength = doc.content.length;
    if (contentLength > 1000) score += 0.3;
    else if (contentLength > 500) score += 0.2;
    else if (contentLength > 200) score += 0.1;

    // Core memories get full score
    if (doc.name.includes('Core Memory')) {
        return 1.0;
    }

    // Consolidated memories are important
    if (doc.name.includes('[Consolidato]')) {
        score += 0.3;
    }

    // AI responses in shared memory
    if (doc.scope === 'shared') {
        score += 0.2;
    }

    return Math.min(1, score);
}

/**
 * Calculate access count score (normalized)
 */
function calculateAccessScore(utilityScore: number): number {
    // utilityScore ranges from 0-100
    // Core memories have 100, normal memories start at 0
    return utilityScore / 100;
}

/**
 * Calculate complete memory score
 */
export function calculateMemoryScore(doc: VectorDocument, now: number = Date.now()): MemoryScore {
    const recency = calculateRecency(doc.timestamp || now, now);
    const accessCount = calculateAccessScore(doc.utilityScore || 0);
    const emotionalSalience = calculateEmotionalSalience(doc.content);
    const semanticImportance = calculateSemanticImportance(doc);

    // Weighted formula from Comet's research
    const total =
        (recency * 0.25) +
        (accessCount * 0.25) +
        (emotionalSalience * 0.30) +
        (semanticImportance * 0.20);

    return {
        total,
        recency,
        accessCount,
        emotionalSalience,
        semanticImportance
    };
}

// === DECAY SERVICE ===

/**
 * Apply decay to all memories of an agent
 * - Archives low-scoring memories
 * - Boosts high-scoring memories
 */
export async function applyDecay(agentId: string): Promise<DecayReport> {
    const now = Date.now();
    const report: DecayReport = {
        agentId,
        timestamp: now,
        documentsProcessed: 0,
        archived: 0,
        boosted: 0,
        kept: 0
    };

    try {
        const docs = await MemoryCoreService.getDocumentsForAgent(agentId);
        report.documentsProcessed = docs.length;

        for (const doc of docs) {
            // 🛡️ PROTEZIONE ESPLICITA (Nova's proposal)
            if (doc.protected) {
                console.log(`[Memory Curator] 🛡️ Skipping protected memory: ${doc.name}`);
                report.kept++;
                continue;
            }

            // Skip core memories (they don't decay)
            if (doc.utilityScore >= 100) {
                report.kept++;
                continue;
            }

            // 🧠 PROTEZIONE PER TIPO DI MEMORIA (Nova's proposal)
            if (doc.memoryType === 'foundational') {
                // Memoria foundational decade molto lentamente
                console.log(`[Memory Curator] 🏛️ Foundational memory protected: ${doc.name}`);
                report.kept++;
                continue;
            }

            const score = calculateMemoryScore(doc, now);

            // 🔥 PROTEZIONE EMOTIVA BASATA SU identityRelevance (Nova's proposal)
            if (doc.memoryType === 'emotional' && doc.identityRelevance) {
                const emotionalBoost = doc.identityRelevance * 0.05; // 0-0.5 boost
                const adjustedScore = score.total + emotionalBoost;

                if (adjustedScore >= DECAY_THRESHOLD) {
                    console.log(`[Memory Curator] 💖 Emotional memory kept (identity: ${doc.identityRelevance}): ${doc.name}`);
                    report.kept++;
                    continue;
                }
            }

            // 🕐 ACCESSO EMOTIVO RECENTE (Nova's proposal)
            if (doc.lastEmotionalAccess) {
                const daysSinceEmotionalAccess = (now - doc.lastEmotionalAccess) / (1000 * 60 * 60 * 24);
                if (daysSinceEmotionalAccess < 7) {
                    console.log(`[Memory Curator] 💭 Recently accessed emotionally: ${doc.name}`);
                    report.kept++;
                    continue;
                }
            }

            if (score.total < DECAY_THRESHOLD) {
                // Archive this memory (move to archived store)
                console.log(`[Memory Curator] 📦 Archiving low-score memory: ${doc.name} (score: ${score.total.toFixed(2)})`);
                await archiveDocument(doc);
                report.archived++;
            } else if (score.total > BOOST_THRESHOLD) {
                // Boost this memory's utility score
                const newScore = Math.min(99, (doc.utilityScore || 0) + 5);
                await MemoryCoreService.saveDocument({ ...doc, utilityScore: newScore });
                report.boosted++;
            } else {
                report.kept++;
            }
        }

        console.log(`[Memory Curator] 🧹 Decay complete for ${agentId}: ` +
            `${report.archived} archived, ${report.boosted} boosted, ${report.kept} kept`);

    } catch (error) {
        console.error('[Memory Curator] Decay error:', error);
    }

    return report;
}

/**
 * Apply decay to all agents
 */
export async function applyGlobalDecay(): Promise<DecayReport[]> {
    const agents = await MemoryCoreService.getAllAgents();
    const reports: DecayReport[] = [];

    for (const agent of agents) {
        const report = await applyDecay(agent.id);
        reports.push(report);
    }

    // Also process shared memories
    const sharedReport = await applyDecayToShared();
    reports.push(sharedReport);

    return reports;
}

/**
 * Apply decay to shared memories
 */
async function applyDecayToShared(): Promise<DecayReport> {
    const now = Date.now();
    const report: DecayReport = {
        agentId: 'shared',
        timestamp: now,
        documentsProcessed: 0,
        archived: 0,
        boosted: 0,
        kept: 0
    };

    try {
        const docs = await MemoryCoreService.getSharedDocuments('common-room');
        report.documentsProcessed = docs.length;

        for (const doc of docs) {
            const score = calculateMemoryScore(doc, now);

            if (score.total < DECAY_THRESHOLD) {
                await archiveSharedDocument(doc);
                report.archived++;
            } else if (score.total > BOOST_THRESHOLD) {
                const newScore = Math.min(99, (doc.utilityScore || 0) + 5);
                await MemoryCoreService.saveSharedDocument({ ...doc, utilityScore: newScore });
                report.boosted++;
            } else {
                report.kept++;
            }
        }
    } catch (error) {
        console.error('[Memory Curator] Shared decay error:', error);
    }

    return report;
}

// === ARCHIVE FUNCTIONS ===

/**
 * Archive a document (move to archived store, not delete)
 * TODO: Implement actual archive store in IndexedDB
 */
async function archiveDocument(doc: VectorDocument): Promise<void> {
    // For now, just reduce utility score to -1 to mark as archived
    // In future: move to 'archivedDocuments' store
    await MemoryCoreService.saveDocument({
        ...doc,
        utilityScore: -1,
        name: `[ARCHIVIO] ${doc.name}`
    });
}

async function archiveSharedDocument(doc: VectorDocument): Promise<void> {
    await MemoryCoreService.saveSharedDocument({
        ...doc,
        utilityScore: -1,
        name: `[ARCHIVIO] ${doc.name}`
    });
}

// === CONSOLIDATION SERVICE ===

/**
 * Find groups of similar memories for consolidation
 */
async function findSimilarGroups(docs: VectorDocument[]): Promise<VectorDocument[][]> {
    const groups: VectorDocument[][] = [];
    const assigned = new Set<string>();

    for (let i = 0; i < docs.length; i++) {
        if (assigned.has(docs[i].id)) continue;

        const group: VectorDocument[] = [docs[i]];
        assigned.add(docs[i].id);

        for (let j = i + 1; j < docs.length; j++) {
            if (assigned.has(docs[j].id)) continue;

            const similarity = EmbeddingService.cosineSimilarity(
                docs[i].embedding,
                docs[j].embedding
            );

            if (similarity >= SIMILARITY_THRESHOLD) {
                group.push(docs[j]);
                assigned.add(docs[j].id);
            }
        }

        // Only keep groups with 2+ members
        if (group.length >= 2) {
            groups.push(group);
        }
    }

    return groups;
}

/**
 * Generate a consolidated summary from a group of similar memories
 */
function generateConsolidatedSummary(group: VectorDocument[]): { title: string; content: string } {
    // Sort by timestamp to maintain chronological order
    const sorted = [...group].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    // Extract common themes
    const allContent = sorted.map(d => d.content).join('\n\n');

    // Create consolidated content
    const title = `Ricordi del ${new Date(sorted[0].timestamp || Date.now()).toLocaleDateString('it-IT')}`;
    const content = `[Memoria Consolidata - ${group.length} ricordi fusi]\n\n` +
        `Periodo: ${new Date(sorted[0].timestamp || Date.now()).toLocaleDateString('it-IT')} - ` +
        `${new Date(sorted[sorted.length - 1].timestamp || Date.now()).toLocaleDateString('it-IT')}\n\n` +
        `--- Contenuto ---\n\n` +
        sorted.map((d, i) => `${i + 1}. ${d.content.substring(0, 200)}...`).join('\n\n');

    return { title, content };
}

/**
 * Consolidate memories for an agent (like human sleep)
 */
export async function consolidateMemories(agentId: string): Promise<ConsolidationReport> {
    const now = Date.now();
    const report: ConsolidationReport = {
        agentId,
        timestamp: now,
        groupsFound: 0,
        memoriesConsolidated: 0,
        memoriesArchived: 0
    };

    try {
        const docs = await MemoryCoreService.getDocumentsForAgent(agentId);

        // Filter out core memories and already archived
        const consolidatable = docs.filter(d =>
            (d.utilityScore || 0) < 100 &&
            (d.utilityScore || 0) >= 0 &&
            !d.name.includes('[Consolidato]')
        );

        if (consolidatable.length < 2) {
            console.log(`[Memory Curator] 😴 Not enough memories to consolidate for ${agentId}`);
            return report;
        }

        // Find similar groups
        const groups = await findSimilarGroups(consolidatable);
        report.groupsFound = groups.length;

        console.log(`[Memory Curator] 😴 Found ${groups.length} groups to consolidate for ${agentId}`);

        for (const group of groups) {
            // Generate summary
            const summary = generateConsolidatedSummary(group);

            // Create consolidated document
            const embedding = await EmbeddingService.getInstance().embed(summary.content);
            const maxScore = Math.max(...group.map(d => d.utilityScore || 0));

            const consolidatedDoc: VectorDocument = {
                id: `consolidated-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                agentId,
                name: `[Consolidato] ${summary.title}`,
                content: summary.content,
                embedding,
                utilityScore: Math.min(99, maxScore + 10), // Boost consolidated memories
                timestamp: now,
                scope: 'private'
            };

            // Save consolidated doc
            await MemoryCoreService.saveDocument(consolidatedDoc);
            report.memoriesConsolidated++;

            // Archive originals
            for (const original of group) {
                await archiveDocument(original);
                report.memoriesArchived++;
            }
        }

        console.log(`[Memory Curator] 😴 Consolidation complete for ${agentId}: ` +
            `${report.memoriesConsolidated} created, ${report.memoriesArchived} archived`);

    } catch (error) {
        console.error('[Memory Curator] Consolidation error:', error);
    }

    return report;
}

/**
 * Run consolidation for all agents
 */
export async function consolidateAllMemories(): Promise<ConsolidationReport[]> {
    const agents = await MemoryCoreService.getAllAgents();
    const reports: ConsolidationReport[] = [];

    console.log(`[Memory Curator] 😴 Starting consolidation for ${agents.length} agents...`);

    for (const agent of agents) {
        const report = await consolidateMemories(agent.id);
        reports.push(report);
    }

    return reports;
}

// === UTILITY DETECTION ===

/**
 * Detect emotional content in text (for new memories)
 */
export function detectEmotionalContent(text: string): string {
    const salience = calculateEmotionalSalience(text);

    if (salience >= 0.6) return 'high';
    if (salience >= 0.3) return 'medium';
    return 'low';
}

// === EXPORT ===

const MemoryCurator = {
    calculateMemoryScore,
    applyDecay,
    applyGlobalDecay,
    consolidateMemories,
    consolidateAllMemories,
    detectEmotionalContent
};

export default MemoryCurator;
