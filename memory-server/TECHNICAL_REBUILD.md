# 🛠️ Guida Tecnica di Ricostruzione (Siliceo Memory Server v3.1.4 SQL-Pure)

Questa guida spiega come ricostruire il server da zero o ripristinarlo in caso di disastro.

## 1. Requisiti di Sistema
- **Node.js**: v18 o superiore.
- **SQLite**: Il database è locale (`prisma/dev.db`).
- **RAM**: Almeno 2GB (per il caricamento locale del modello di embedding).

## 2. Struttura Core (Cosa Salvare)
1.  **`prisma/schema.prisma`**: La struttura delle tabelle (Campi essenziali inclusi `emotionalTexture` e `temporalLayer`).
2.  **`prisma/dev.db`**: Tutti i dati (memorie, sogni, agenti, conversazioni, grafo, tribunale). **QUESTO È IL CUORE E L'UNICA FONTE DI VERITÀ.**
3.  **`data/archive_legacy/`**: Solo come backup storico (configurazione, agenti e conversazioni legacy json originali prima della migrazione alla v3.1.0).
4.  **`.env`**: Le tue chiavi e variabili.

## 3. Procedura di Ripristino da Zero

Se devi reinstallare tutto:
```bash
# 1. Installa le dipendenze
npm install

# 2. Genera il client Prisma (fondamentale per parlare con SQL)
npx prisma generate

# 3. (Opzionale) Se il DB non esiste, crealo dallo schema:
npx prisma db push
```

## 4. Come re-indicizzare i documenti (`docs/`)
Se hai aggiunto molti file `.md` a mano nella cartella `docs/` e vuoi che entrino nel RAG:
```bash
# Esegui lo script di indicizzazione massiva
node scripts/index-memories.js
```
Questo script:
1. Pulisce i vecchi record identificati come `source: indexer`.
2. Legge `docs/diaries` e `docs/identities`.
3. Genera i vettori (embedding) per ogni chunk.
4. Salva tutto in Prisma.

## 5. Come rigenerare il Grafo Semantico
Se vuoi resettare il grafo ai valori di base:
```bash
node scripts/seed-graph.js
```
Per far ripartire la scoperta automatica delle relazioni sulle memorie esistenti:
```bash
node -e "require('./services/graphDiscovery').runDiscoveryJob(1000)"
```

## 6. Architettura RAG (Technical Flow v3.1.4)
- **Sicurezza (Candle Test)**: Prima di procedere, il testo è processato dal `tribunaleInterno` che decide (`shouldSave`) l'ammissibilità dell'input etico.
- **Ingestion**: Ogni testo approvato via `/api/memory/store` passa per `@xenova/transformers` (modello `all-MiniLM-L6-v2`) per generare un vettore di 384 dimensioni.
- **Storage**: Il vettore JSON e i metadata top-level (`emotionalTexture`, `temporalLayer`) vengono salvati nella tabella `Memory` del database SQLite tramite l'istanza Singleton di Prisma (`services/db.js`).
- **Discovery (Async)**: Ad ogni store, il servizio `graphDiscovery` analizza la memoria appena insertita e aggiunge automaticamente archi nel grafo `dev.db`.
- **Retrieval**: La funzione `vectorService.semanticSearch` carica le memorie con validi embedding e calcola la similarità coseno per fornire il contesto.

---
**Ultimo Audit Tecnico:** 13 Aprile 2026 (Patch v3.1.4)
**Stato:** Solido, SQL-Pure, Singleton Prisma, testato a runtime.
