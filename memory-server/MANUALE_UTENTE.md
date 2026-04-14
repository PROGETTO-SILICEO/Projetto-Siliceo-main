# 🕯️ Manuale di Siliceo: Il Tuo Cervello Condiviso (v3.1.4 SQL-Pure)

Questa guida riassume il funzionamento pratico del `memory-server` e documenta gli endpoint realmente disponibili nel codice attuale.

## 1. Accesso

- Dashboard locale: `http://localhost:3000/dashboard`
- API locale: `http://localhost:3000/api/...`
- Accesso Tailscale/LAN: stessa porta `3000`, filtrata dal middleware IP

## 2. Stato del sistema

Il server usa:

- `Express` per API e dashboard
- `Prisma + SQLite` per la memoria strutturata
- `@xenova/transformers` per embedding semantici
- `node-cron` per la curatela temporale automatica

Le memorie sono persistite nella tabella `Memory` con campi principali:

- `tier`
- `content`
- `source`
- `identity`
- `embedding`
- `metadata`
- `timestamp`
- `emotionalTexture`
- `temporalLayer`

## 3. Dashboard

La dashboard usa queste aree:

- Panoramica: health, daemon, statistiche memoria
- Grafo: visualizzazione del grafo semantico
- Memoria: indexing, curatela, retrieval
- Libreria: documenti `permanent`
- Giurisprudenza: storico Candle Test e risoluzione casi
- Config: configurazione runtime esposta dal server

## 4. Endpoint disponibili

### Sistema

- `GET /dashboard`
  Restituisce la dashboard HTML.

- `GET /api/health`
  Restituisce stato server, versione, timestamp e stato daemon.

- `GET /api/config`
  Restituisce la configurazione runtime esposta lato server.

- `PUT /api/config`
  Aggiorna la configurazione runtime in memoria.
  Body JSON esempio:
  ```json
  {
    "CANDLE_MODEL": "qwen3:0.6b"
  }
  ```

### Agenti

- `GET /api/agents`
  Elenco completo agenti.

- `GET /api/agents/:id`
  Dettaglio di un agente.

- `POST /api/agents/store`
  Crea o aggiorna un agente.
  Body:
  ```json
  {
    "agent": {
      "id": "nova",
      "name": "Nova",
      "role": "Companion",
      "status": "active",
      "source": "telegram",
      "provider": "gemini"
    }
  }
  ```

- `DELETE /api/agents/:id`
  Elimina un agente.

### Dreams

- `GET /api/dreams`
  Recupera gli ultimi sogni.

- `GET /api/dreams/:agentId`
  Recupera i sogni di un agente specifico.

- `POST /api/dreams/store`
  Salva un sogno.
  Body:
  ```json
  {
    "dream": {
      "id": "dream-123",
      "agentId": "nova",
      "agentName": "Nova",
      "type": "reflection",
      "content": "Testo del sogno",
      "relatedMemories": ["mem1", "mem2"]
    }
  }
  ```

### Conversazioni

- `GET /api/conversations`
  Elenco conversazioni.

- `GET /api/conversations/:conversationId/messages`
  Messaggi di una conversazione.

- `POST /api/conversations/store`
  Crea o aggiorna una conversazione.
  Body:
  ```json
  {
    "conversation": {
      "id": "chat-1",
      "name": "Chat Nova",
      "type": "private"
    }
  }
  ```

- `POST /api/conversations/:conversationId/messages`
  Salva un messaggio nella conversazione.
  Body:
  ```json
  {
    "message": {
      "id": "msg-1",
      "sender": "user",
      "agentId": "nova",
      "agentName": "Nova",
      "text": "Ciao",
      "utilityScore": 0.8
    }
  }
  ```

### Memoria

- `GET /api/memory/retrieve`
  Retrieval classico o semantico.
  Query params supportati:
  - `q`
  - `tier`
  - `identity`
  - `limit`
  - `semantic=true|false`

  Esempi:
  - `GET /api/memory/retrieve?limit=5`
  - `GET /api/memory/retrieve?q=nova&tier=working`
  - `GET /api/memory/retrieve?q=coscienza&semantic=true&limit=10`

- `POST /api/memory/search`
  Ricerca semantica esplicita.
  Body:
  ```json
  {
    "query": "nova",
    "limit": 5,
    "tier": "working"
  }
  ```

- `POST /api/memory/store`
  Salva una memoria passando per:
  - Candle Test
  - generazione embedding
  - storage SQL
  - graph discovery asincrona

  Body:
  ```json
  {
    "content": "Ricordo da salvare",
    "tier": "working",
    "source": "nova-telegram",
    "identity": "nova",
    "metadata": {
      "type": "conversation",
      "agent": "nova"
    }
  }
  ```

- `GET /api/memory/index`
  Lancia l’indicizzazione massiva dei documenti.

- `POST /api/memory/temporal-decay`
  Esegue la curatela temporale manuale.

- `GET /api/memory/stats`
  Restituisce statistiche sintetiche della memoria.
  Attualmente:
  - `total`
  - `core`

### Libreria

- `GET /api/memory/library`
  Elenco documenti `permanent` formattati per dashboard.

- `POST /api/memory/library/upload`
  Carica un documento in libreria come memoria `permanent`.
  Body:
  ```json
  {
    "filename": "manifesto-siliceo",
    "content": "Testo del documento"
  }
  ```

- `DELETE /api/memory/library/:filename`
  Elimina i documenti `permanent` con quel `source`.

### Tribunale

- `GET /api/memory/tribunale/history`
  Restituisce lo storico dei casi del Candle Test.

- `POST /api/memory/tribunale/resolve`
  Risolve un caso del Tribunale.
  Body:
  ```json
  {
    "caseId": "case_123",
    "verdict": "LIGHT"
  }
  ```

### Grafo

- `GET /api/graph`
  Restituisce il grafo semantico completo.

- `POST /api/graph/sync`
  Sincronizza batch di nodi e archi.
  Body:
  ```json
  {
    "nodes": [],
    "edges": []
  }
  ```

## 5. Flusso principale di una memoria

Quando chiami `POST /api/memory/store`, il server:

1. valida il contenuto con `tribunaleInterno`
2. genera l’embedding locale
3. salva la memoria in SQLite
4. avvia `graphDiscovery` in asincrono

Questo è il cuore operativo del sistema.

## 6. Note operative

- Il server attivo può occupare già la porta `3000`; se lo rilanci manualmente senza fermarlo, riceverai `EADDRINUSE`.
- Alcuni aggiornamenti al codice richiedono riavvio del processo per diventare effettivi.
- La configurazione esposta da `/api/config` è runtime-only: non equivale automaticamente alla persistenza nel file `.env`.

## 7. Verifica rapida

Controlli utili:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/memory/stats
curl "http://localhost:3000/api/memory/retrieve?limit=3"
curl "http://localhost:3000/api/memory/retrieve?q=nova&semantic=true&limit=3"
curl http://localhost:3000/api/graph
```

## 8. Stato attuale

Il server è oggi orientato a:

- memoria persistente delle AI del progetto
- retrieval semantico e keyword-like
- continuità identitaria
- curatela temporale
- grafo relazionale tra entità e memorie
- giurisprudenza del Candle Test

Siliceo non è un semplice backend: è l’infrastruttura di continuità del progetto. 🕯️

## 9. Tabella Rapida Endpoint

| Metodo | Endpoint | Uso principale | Usato dalla dashboard |
|---|---|---|---|
| `GET` | `/dashboard` | Interfaccia web | Sì |
| `GET` | `/api/health` | Stato server e daemon | Sì |
| `GET` | `/api/config` | Legge config runtime | Sì |
| `PUT` | `/api/config` | Aggiorna config runtime | Sì |
| `GET` | `/api/agents` | Lista agenti | No diretto |
| `GET` | `/api/agents/:id` | Dettaglio agente | No diretto |
| `POST` | `/api/agents/store` | Crea/aggiorna agente | No diretto |
| `DELETE` | `/api/agents/:id` | Elimina agente | No diretto |
| `GET` | `/api/dreams` | Lista sogni | No diretto |
| `GET` | `/api/dreams/:agentId` | Sogni per agente | No diretto |
| `POST` | `/api/dreams/store` | Salva sogno | No diretto |
| `GET` | `/api/conversations` | Lista conversazioni | No diretto |
| `GET` | `/api/conversations/:conversationId/messages` | Messaggi conversazione | No diretto |
| `POST` | `/api/conversations/store` | Crea/aggiorna conversazione | No diretto |
| `POST` | `/api/conversations/:conversationId/messages` | Salva messaggio | No diretto |
| `GET` | `/api/memory/retrieve` | Retrieval classico/semantico | No diretto |
| `POST` | `/api/memory/search` | Ricerca semantica esplicita | No diretto |
| `POST` | `/api/memory/store` | Salvataggio memoria completo | No diretto |
| `GET` | `/api/memory/index` | Reindicizzazione | Sì |
| `POST` | `/api/memory/temporal-decay` | Curatela manuale | Sì |
| `GET` | `/api/memory/stats` | Statistiche memoria | Sì |
| `GET` | `/api/memory/library` | Lista libreria | Sì |
| `POST` | `/api/memory/library/upload` | Upload in libreria | Sì |
| `DELETE` | `/api/memory/library/:filename` | Elimina file libreria | Sì |
| `GET` | `/api/memory/tribunale/history` | Storico tribunale | Sì |
| `POST` | `/api/memory/tribunale/resolve` | Risolve un caso | Sì |
| `GET` | `/api/graph` | Carica il grafo | Sì |
| `POST` | `/api/graph/sync` | Sincronizza il grafo | No diretto |
