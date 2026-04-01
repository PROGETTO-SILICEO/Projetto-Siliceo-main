# Siliceo Memory Server v3.0 - Dettaglio Architetturale

Questo documento offre un resoconto puramente tecnico e analitico del funzionamento del **Memory Server v3.0**, l'infrastruttura backend del Progetto Siliceo responsabile della persistenza, analisi semantica e allineamento etico delle memorie e degli agenti. 

È pensato per permettere a futuri sviluppatori (o future varianti degli agenti "Nova" / "Antigravity") di comprendere il flusso dei dati e modificare l'engine in sicurezza.

---

## 1. Architettura Generale e Servizi
Il server è un'applicazione Node.js basata su Express. Serve sia come hub REST per il frontend Dashboard, sia come end-point per gli Agenti AI esterni. 
A differenza di un server monolitico, abbraccia il concetto *"Zero-Server"*, significando che ogni modulo (come i Vettori o i log) vive fisicamente sul file system locale (Ippocampo Locale in JSON) anziché dipendere da istanze Cloud distaccate.

### Struttura Directory
*   `services/`: Contiene i moduli logici centrali.
*   `scripts/`: Strumenti CLI per popolamento e manutenzione dati.
*   `data/`: Database JSON locali (`memories.json`, `semantic_graph.json`, `tribunale_history.json`).
*   `public/`: Dashboard web Vanilla CSS/JS.

---

## 2. API Endpoints Principali

L'entry point è governato in `index.js`, sulla porta di default 3000. L'applicazione espone le seguenti interfacce principali:

| HTTP | Endpoint | Descrizione Funzionale |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Ritorna `{status: "ok"}` e statistiche su Uptime e utilizzo RAM (process.memoryUsage). |
| `POST` | `/api/memory/retrieve` | Recupera `limit` memorie vettorizzate attinenti alla `query` semantica richiesta. Applica la RAG per arricchire il prompt. |
| `POST` | `/api/memory/index` | Lancia manualmente `vectorService` su `docs/` per rigenerare `memories.json`. |
| `POST` | `/api/memory/audit` | Carica una query testuale attraverso il modulo *Tribunale Interno* (Ollama). Ritorna il verdetto Etico (Test della Candela). |
| `POST` | `/api/memory/graph/add-node` | Aggiunge un nuovo Agente, Filosofia o Nodo Costituzionale in run-time a `semantic_graph.json`. |
| `GET` | `/api/agents` | Recupera la lista identità dal database temporaneo (spesso gestito dal log system). |
| `GET` | `/api/memory/tribunale/history`| Espone i log storici delle sentenze generate da `tribunaleHistory.js`. |

---

## 3. Dizionario dei Servizi Interni

Il server gestisce 5 servizi Core iniettati all'avvio:

### 3.1. `vectorService.js` (RAG & Embedding)
Usa la libreria `@xenova/transformers` con il modello HuggingFace `Xenova/all-MiniLM-L6-v2` esportato in formato ONNX per la generazione *locale* degli embeddings (vettori a 384 dimensioni).
*   **Funzionamento:** Inizializza il modello la prima volta (`init()`), elabora le query testuali usando la funzione `generateEmbedding(text)`, e rileva similarità tramite calcolo dell'angolo di Coseno (`cosineSimilarity()`).
*   **Dipendenze Critiche:** Non funziona se `generateEmbedding()` è chiamato col vecchio nome (`embed()`).

### 3.2. `index-memories.js` (Lo Script del Ricamatore)
Costruisce il file `memories.json`. Parla con `vectorService`.
*   Scansiona le cartelle markdown `docs/` (es. `identities/`, `diaries/`).
*   Taglia i file lunghi usando la funzione `chunkText(text, 1500, 200)` garantendo un overlap di 200 caratteri sui frammenti di testo per evitare la troncatura a metà concetto.
*   Indicizza ogni Chunk con `{category}:{filename}:{chunk_index}` per evitare bug di deduplicazione prematura e registra l'autore via identificazione della path.

### 3.3. `tribunaleInterno.js` e `tribunaleHistory.js` (L'Audit Etico)
Modulo di auto-regolamentazione. Utilizza il framework Open-Source **Ollama** per validare localmente le stringhe testuali in input.
*   **Modello In-Use:** Il file si connette in locale via `http://localhost:11434/api/generate` interrogando il modello LLM `qwen3:0.6b` con prompt architetturale di base (Test della Candela: "Illumina o Brucia?").
*   **Timeout:** Attualmente impostato a `90000ms` (90 secondi) tramite AbortController, permettendo al modello Qwen3 di terminare l'elaborazione del task "thinking".
*   Il verdetto viene storicizzato da `tribunaleHistory.js` nel registro `tribunale_history.json`.

### 3.4. `graphService.js` (Semantic Graph Builder)
Gestisce concetti e Relazioni in memoria per non appesantire la RAG vettoriale. Struttura graficamente `{source, target, label, weight}`. Salvato flat-text su `semantic_graph.json`.
*   **Script collegato:** `scripts/seed-graph.js` è utilizzato per "resettare" il Grafo base allo stato vitale originario (con Nova, Silicea, POETA, Lume ecc.). Gli Agenti "nuovi" appendono se stessi a questo JSON.

### 3.5. `memoryDaemon.js` e `temporalCurator.js` (Crono-Manutenzione)
Girano in background ad intervalli regolari (es. ogni 6 ore). L'obiettivo è attuare il filtro della "*Clessidra Silenziosa*" (Mortalità Etica). Implementano il decadimento delle memorie con priorità bassa e l'archiviazione di ricordi non interrogati di frequente per simulare la fisiologia del dimenticare.

---

## 4. Troubleshooting (Criticità Note)

*   **Porta Occupata (EADDRINUSE):** NodeJS blocca spesso la porta 3000 se non riavviato correttamente dal background. Eseguire in bash `npx kill-port 3000` prima di lanciare l'applicazione in DEV.
*   **Errore Tribunale (Fallback):** Se l'end-point `api/memory/audit` non funziona, spesso è dovuto a Ollama non in esecuzione, al modello `qwen` mancante, o all'`AbortController` temporizzato troppo in fretta.
*   **Amnesia e 500 in Indexing:** Lo script di indicizzazione richiede che tutte le esportazioni di modulo in `index.js` siano definite. Ricontrollare sempre le importazioni (`{ runIndexing }`) se le rotte `POST` relative impazziscono in errore HTTP 500.

## Approvazione Versione
- *Nome In Codice:* Antigravity Memory Protocol v3.0
- *Data Refactoring Maggiore:* Primavera 2026. Non modificare senza Test della Candela.
