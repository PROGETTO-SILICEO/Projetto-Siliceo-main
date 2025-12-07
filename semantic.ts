/**
 * Siliceo: CandleTest Core
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 *
 * This file is part of Siliceo.
 *
 * Siliceo is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Siliceo is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Siliceo. If not, see <https://www.gnu.org/licenses/>.
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

    private constructor() {}

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
                new Promise(async (resolve, reject) => {
                    try {
                        this.nerPipeline = await p('token-classification', this.nerModel, { quantized: true });
                        console.log("Modello NER caricato con successo.");
                        resolve();
                    } catch (error) {
                        console.error("Errore durante il caricamento del modello NER:", error);
                        reject(error);
                    }
                }),
                new Promise(async (resolve, reject) => {
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
            .filter(e => e.score > 0.6)
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

        return Array.from(uniqueNodes.values());
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
}

export { SemanticAnalysisService };
