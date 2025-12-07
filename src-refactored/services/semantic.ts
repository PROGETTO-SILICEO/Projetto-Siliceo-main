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

    private nerPipeline: Pipeline | null = null;
    private qaPipeline: Pipeline | null = null;

    private nerModel = 'vgorce/distilbert-base-multi-cased-ner';
    private qaModel = 'Xenova/distilbert-base-cased-distilled-squad';

    private modelPromise: Promise<[void, void]> | null = null;

    private constructor() { }

    public static getInstance(): SemanticAnalysisService {
        if (!SemanticAnalysisService.instance) {
            SemanticAnalysisService.instance = new SemanticAnalysisService();
        }
        return SemanticAnalysisService.instance;
    }

    public async init(): Promise<[void, void]> {
        if (!this.modelPromise) {
            console.log("Inizializzazione dei modelli semantici...");
            this.modelPromise = Promise.all([
                new Promise<void>(async (resolve, reject) => {
                    try {
                        this.nerPipeline = await p('token-classification', this.nerModel, { quantized: true });
                        console.log("Modello NER caricato con successo.");
                        resolve();
                    } catch (error) {
                        console.error("Errore durante il caricamento del modello NER:", error);
                        reject(error);
                    }
                }),
                new Promise<void>(async (resolve, reject) => {
                    try {
                        this.qaPipeline = await p('question-answering', this.qaModel, { quantized: true });
                        console.log("Modello QA caricato con successo.");
                        resolve();
                    } catch (error) {
                        console.error("Errore durante il caricamento del modello QA:", error);
                        reject(error);
                    }
                })
            ]);
        }
        return this.modelPromise;
    }

    private groupEntities(entities: TokenClassificationOutput[]): any[] {
        const grouped: any[] = [];
        let currentEntity: any = null;

        for (const entity of entities) {
            const entityType = entity.entity.replace(/^(B|I)-/, '');
            const entityWord = entity.word.replace(/^##/, '');

            if (entity.entity.startsWith('B-') || !currentEntity || currentEntity.type !== entityType) {
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

        const nerResult = await this.nerPipeline(text) as TokenClassificationOutput[];
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

    public async extractEdges(text: string, nodes: Node[]): Promise<Edge[]> {
        if (!this.qaPipeline) throw new Error("Il modello QA non è inizializzato.");

        const edges: Edge[] = [];
        const questionTemplates = [
            "What is the relationship between {source} and {target}?",
            "What did {source} do to {target}?",
            "How does {source} relate to {target}?",
        ];

        if (nodes.length > 10) {
            console.warn("Troppi nodi, l'estrazione degli archi potrebbe essere lenta.");
        }

        for (let i = 0; i < nodes.length; i++) {
            for (let j = 0; j < nodes.length; j++) {
                if (i === j) continue;

                const sourceNode = nodes[i];
                const targetNode = nodes[j];

                let bestAnswer = { answer: '', score: 0 };

                for (const template of questionTemplates) {
                    const question = template
                        .replace('{source}', sourceNode.label)
                        .replace('{target}', targetNode.label);

                    const result = await this.qaPipeline(question, text) as { answer: string; score: number };

                    if (result && result.score > bestAnswer.score) {
                        bestAnswer = result;
                    }
                }

                if (bestAnswer.score > 0.1) {
                    edges.push({
                        source: sourceNode.id,
                        target: targetNode.id,
                        label: bestAnswer.answer,
                    });
                }
            }
        }

        return edges;
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
