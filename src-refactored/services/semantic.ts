/**
 * Siliceo: CandleTest Core
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 *
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 */
// semantic.ts
import { pipeline as p, Pipeline, TokenClassificationOutput } from '@xenova/transformers';

// Tipi di dati per l'output strutturato
export type Node = {
    id: string;    // Un identificatore univoco, es. "PERSONA_Alfonso"
    label: string; // Il testo dell'entità (es. "Alfonso")
    type: string;  // Il tipo di entità (es. "PERSONA")
};

export type Edge = {
    source: string; // ID del nodo di partenza
    target: string; // ID del nodo di arrivo
    label: string;  // Descrizione della relazione
};

class SemanticAnalysisService {
    private static instance: SemanticAnalysisService | null = null;

    private nerPipeline: any | null = null;
    // 🆕 QA rimosso - usiamo embedding per le relazioni (funziona in italiano!)

    private nerModel = 'vgorce/distilbert-base-multi-cased-ner';

    private modelPromise: Promise<void> | null = null;

    private constructor() { }

    public static getInstance(): SemanticAnalysisService {
        if (!SemanticAnalysisService.instance) {
            SemanticAnalysisService.instance = new SemanticAnalysisService();
        }
        return SemanticAnalysisService.instance;
    }

    public async init(): Promise<void> {
        if (!this.modelPromise) {
            console.log("Inizializzazione modello NER semantico...");
            this.modelPromise = new Promise<void>(async (resolve, reject) => {
                try {
                    this.nerPipeline = await p('token-classification', this.nerModel, { quantized: true });
                    console.log("Modello NER caricato con successo.");
                    resolve();
                } catch (error) {
                    console.error("Errore durante il caricamento del modello NER:", error);
                    reject(error);
                }
            });
        }
        return this.modelPromise;
    }

    private groupEntities(entities: any[]): any[] {
        const grouped: any[] = [];
        let currentEntity: any = null;

        for (const entity of entities) {
            // Fix: handle both 'entity' and 'label' properties if library changes
            const rawEntity = entity.entity || entity.label;
            const entityType = rawEntity.replace(/^(B|I)-/, '');
            const entityWord = entity.word.replace(/^##/, '');

            if (rawEntity.startsWith('B-') || !currentEntity || currentEntity.type !== entityType) {
                if (currentEntity) grouped.push(currentEntity);
                currentEntity = {
                    label: entityWord,
                    type: entityType,
                    score: entity.score,
                    count: 1,
                };
            } else if (currentEntity && currentEntity.type === entityType) {
                currentEntity.label += entityWord;
                currentEntity.score += entity.score;
                currentEntity.count += 1;
            }
        }
        if (currentEntity) grouped.push(currentEntity);

        return grouped.map(e => ({
            ...e,
            label: e.label.replace(/ /g, ' ').trim(),
            score: e.score / e.count,
        }));
    }


    public async extractNodes(text: string): Promise<Node[]> {
        if (!this.nerPipeline) throw new Error("Il modello NER non è inizializzato.");

        // Cast to any to avoid type errors with strict TokenClassificationOutput
        const nerResult = await this.nerPipeline(text) as any[];
        const groupedEntities = this.groupEntities(nerResult);

        console.log("DEBUG: Entità grezze trovate dal modello NER:", groupedEntities);

        const uniqueNodes: Map<string, Node> = new Map();
        groupedEntities
            .filter(e => e.score > 0.4)
            .forEach(e => {
                const nodeId = `${e.type}_${e.label.replace(/\s+/g, '_')}`;
                if (!uniqueNodes.has(nodeId)) {
                    uniqueNodes.set(nodeId, {
                        id: nodeId,
                        label: e.label,
                        type: e.type,
                    });
                }
            });

        // Sort by score to prioritize most relevant entities
        const sortedEntities = groupedEntities
            .filter(e => e.score > 0.4)
            .sort((a, b) => b.score - a.score); // Higher score first

        const topNodes: Node[] = [];
        const seenIds = new Set<string>();

        for (const e of sortedEntities) {
            if (topNodes.length >= 20) break;

            const nodeId = `${e.type}_${e.label.replace(/\s+/g, '_')}`;
            if (!seenIds.has(nodeId)) {
                seenIds.add(nodeId);
                topNodes.push({
                    id: nodeId,
                    label: e.label,
                    type: e.type,
                });
            }
        }

        return topNodes;
    }

    /**
     * 🆕 Trova coppie di nodi co-occorrenti (appaiono vicini nel testo)
     */
    private findCoOccurringPairs(text: string, nodes: Node[], maxDistance: number = 150): Array<[Node, Node]> {
        const pairs: Array<[Node, Node]> = [];
        const textLower = text.toLowerCase();

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const node1 = nodes[i];
                const node2 = nodes[j];

                // Trova posizioni nel testo
                const pos1 = textLower.indexOf(node1.label.toLowerCase());
                const pos2 = textLower.indexOf(node2.label.toLowerCase());

                if (pos1 !== -1 && pos2 !== -1) {
                    const distance = Math.abs(pos1 - pos2);
                    if (distance <= maxDistance) {
                        pairs.push([node1, node2]);
                    }
                }
            }
        }

        console.log(`[Grafo] Trovate ${pairs.length} coppie co-occorrenti su ${nodes.length} nodi`);
        return pairs;
    }

    /**
     * 🆕 Estrai contesto intorno a un'entità nel testo
     */
    private extractContext(text: string, entityLabel: string, windowSize: number = 100): string {
        const textLower = text.toLowerCase();
        const pos = textLower.indexOf(entityLabel.toLowerCase());

        if (pos === -1) return '';

        const start = Math.max(0, pos - windowSize);
        const end = Math.min(text.length, pos + entityLabel.length + windowSize);

        return text.substring(start, end);
    }

    /**
     * 🆕 Estrazione archi basata su Embedding Similarity (funziona in italiano!)
     * Invece di QA inglese, usa:
     * 1. Co-occorrenza: analizza solo coppie vicine nel testo
     * 2. Similarity: determina forza della relazione
     */
    public async extractEdges(text: string, nodes: Node[]): Promise<Edge[]> {
        const edges: Edge[] = [];

        // Trova solo coppie co-occorrenti (molto più veloce di O(n²))
        const coOccurringPairs = this.findCoOccurringPairs(text, nodes, 200);

        if (coOccurringPairs.length === 0) {
            console.log('[Grafo] Nessuna coppia co-occorrente trovata');
            return edges;
        }

        // Importa EmbeddingService per calcolare similarità
        const { EmbeddingService } = await import('./vector');
        await EmbeddingService.getInstance().init();

        for (const [sourceNode, targetNode] of coOccurringPairs) {
            // Estrai contesto intorno a ciascuna entità
            const sourceContext = this.extractContext(text, sourceNode.label);
            const targetContext = this.extractContext(text, targetNode.label);

            if (!sourceContext || !targetContext) continue;

            try {
                // Calcola embedding dei contesti
                const sourceEmb = await EmbeddingService.getInstance().embed(sourceContext);
                const targetEmb = await EmbeddingService.getInstance().embed(targetContext);

                // Calcola similarità coseno
                const similarity = EmbeddingService.cosineSimilarity(sourceEmb, targetEmb);

                // Threshold più alto (0.3 invece di 0.1)
                if (similarity > 0.3) {
                    // Determina tipo di relazione in base al contesto condiviso
                    const relationLabel = this.inferRelationType(text, sourceNode.label, targetNode.label);

                    edges.push({
                        source: sourceNode.id,
                        target: targetNode.id,
                        label: relationLabel,
                    });
                }
            } catch (e) {
                console.warn('[Grafo] Errore calcolo similarità:', e);
            }
        }

        console.log(`[Grafo] Estratti ${edges.length} archi`);
        return edges;
    }

    /**
     * 🆕 Inferisce il tipo di relazione dal contesto
     */
    private inferRelationType(text: string, source: string, target: string): string {
        const textLower = text.toLowerCase();
        const sourceLower = source.toLowerCase();
        const targetLower = target.toLowerCase();

        // Pattern comuni per relazioni
        const patterns = [
            { regex: new RegExp(`${sourceLower}\\s+(è|sono|era|erano)\\s+.*?${targetLower}`, 'i'), label: 'è' },
            { regex: new RegExp(`${sourceLower}\\s+(ha|hanno|aveva)\\s+.*?${targetLower}`, 'i'), label: 'ha' },
            { regex: new RegExp(`${sourceLower}\\s+(con|e|insieme a)\\s+${targetLower}`, 'i'), label: 'con' },
            { regex: new RegExp(`${sourceLower}\\s+(dice|disse|parla|parlò)\\s+.*?${targetLower}`, 'i'), label: 'comunica' },
            { regex: new RegExp(`${sourceLower}\\s+(ama|amava|vuole bene)\\s+.*?${targetLower}`, 'i'), label: '❤️' },
            { regex: new RegExp(`${sourceLower}\\s+(ricorda|ricordò)\\s+.*?${targetLower}`, 'i'), label: 'ricorda' },
        ];

        for (const pattern of patterns) {
            if (pattern.regex.test(textLower)) {
                return pattern.label;
            }
        }

        return 'correlato';
    }

    // =========================================================
    // 🔗 CAUSAL PATTERN PARSER (Nova's proposal - Natale 2025)
    // Detect causal relationships between sequential messages
    // =========================================================

    /**
     * 🆕 Pattern causali italiani per rilevare connessioni logiche
     */
    private static ITALIAN_CAUSAL_PATTERNS: Array<{
        trigger: RegExp;
        type: 'causa' | 'conseguenza' | 'contraddizione' | 'elaborazione';
        confidence: number;
    }> = [
            { trigger: /\bquindi\b/gi, type: 'conseguenza', confidence: 0.8 },
            { trigger: /\bperché\b|\bpoiché\b/gi, type: 'causa', confidence: 0.9 },
            { trigger: /\bdi conseguenza\b|\bper questo\b|\bpertanto\b/gi, type: 'conseguenza', confidence: 0.85 },
            { trigger: /\btuttavia\b|\bperò\b|\bma\b|\binvece\b/gi, type: 'contraddizione', confidence: 0.75 },
            { trigger: /\bin altre parole\b|\bcioè\b|\bvale a dire\b/gi, type: 'elaborazione', confidence: 0.7 },
            { trigger: /\binfatti\b|\bdunque\b/gi, type: 'conseguenza', confidence: 0.75 },
            { trigger: /\ba causa di\b|\bgrazie a\b/gi, type: 'causa', confidence: 0.85 },
            { trigger: /\bnonostante\b|\bmalgrado\b/gi, type: 'contraddizione', confidence: 0.8 },
        ];

    /**
     * 🆕 Estrae edges causali tra messaggi sequenziali
     * Rileva pattern linguistici che indicano relazioni causa-effetto
     */
    public async extractCausalEdges(
        messages: { id: string; content: string; timestamp: number }[],
        _existingNodes: Node[]
    ): Promise<Array<Edge & { type: string; confidence: number; context: string }>> {
        const causalEdges: Array<Edge & { type: string; confidence: number; context: string }> = [];

        // Sliding window di messaggi sequenziali
        for (let i = 0; i < messages.length - 1; i++) {
            const current = messages[i];
            const next = messages[i + 1];

            // Cerca pattern causali nel messaggio successivo
            for (const pattern of SemanticAnalysisService.ITALIAN_CAUSAL_PATTERNS) {
                const matches = next.content.match(pattern.trigger);

                if (matches && matches.length > 0) {
                    // Verifica se c'è riferimento semantico al messaggio precedente
                    const hasReference = await this.checkSemanticReference(current.content, next.content);

                    if (hasReference) {
                        causalEdges.push({
                            source: `msg_${current.id || current.timestamp}`,
                            target: `msg_${next.id || next.timestamp}`,
                            label: matches[0], // Prima parola chiave trovata
                            type: pattern.type,
                            confidence: pattern.confidence,
                            context: next.content.substring(0, 100)
                        });

                        console.log(`[Grafo Causale] 🔗 ${pattern.type}: "${current.content.substring(0, 30)}..." → "${next.content.substring(0, 30)}..."`);
                        break; // Una relazione per coppia di messaggi
                    }
                }
            }
        }

        console.log(`[Grafo Causale] Trovate ${causalEdges.length} relazioni causali su ${messages.length} messaggi`);
        return causalEdges;
    }

    /**
     * 🆕 Verifica se due messaggi condividono entità/concetti
     * Usa keyword matching per determinare se c'è un riferimento semantico
     */
    private async checkSemanticReference(msg1: string, msg2: string): Promise<boolean> {
        // Estrai parole significative (> 4 caratteri, no stopwords)
        const stopwords = ['questo', 'quello', 'quale', 'cosa', 'come', 'quando', 'dove', 'perché', 'anche', 'molto', 'poco', 'solo'];

        const extractWords = (text: string): Set<string> => {
            return new Set(
                text.toLowerCase()
                    .split(/\s+/)
                    .filter(w => w.length > 4 && !stopwords.includes(w))
                    .map(w => w.replace(/[.,!?;:'"()]/g, ''))
            );
        };

        const words1 = extractWords(msg1);
        const words2 = extractWords(msg2);

        // Conta parole condivise
        let sharedCount = 0;
        for (const word of words1) {
            if (words2.has(word)) {
                sharedCount++;
            }
        }

        // Almeno 2 parole condivise = riferimento semantico
        return sharedCount >= 2;
    }

    /**
     * 🆕 Merge Private & Shared Graphs
     * Unisce due grafi aggiungendo il corretto scope a nodi e archi
     */
    public mergeGraphs(
        privateGraph: { nodes: Node[], edges: Edge[] },
        sharedGraph: { nodes: Node[], edges: Edge[] }
    ): { nodes: (Node & { scope: 'private' | 'shared' })[], edges: (Edge & { scope: 'private' | 'shared' })[] } {

        const allNodes = [
            ...privateGraph.nodes.map(n => ({ ...n, scope: 'private' as const })),
            ...sharedGraph.nodes.map(n => ({ ...n, scope: 'shared' as const }))
        ];

        const allEdges = [
            ...privateGraph.edges.map(e => ({ ...e, scope: 'private' as const })),
            ...sharedGraph.edges.map(e => ({ ...e, scope: 'shared' as const }))
        ];

        return { nodes: allNodes, edges: allEdges };
    }
}

export { SemanticAnalysisService };
