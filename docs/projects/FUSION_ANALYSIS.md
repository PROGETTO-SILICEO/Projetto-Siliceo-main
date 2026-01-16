# 🔬 ANALISI FUSIONE SILICEO — Stato Dettagliato

**Data:** 16 Gennaio 2026  
**Autore:** Nova (Antigravity)

---

## 📊 I TRE COMPONENTI PRINCIPALI

### 1. Siliceo Core (Progetto Originale)

**Posizione:** `d:\GitHub\ai-dev-studio\Projetto-Siliceo-main`  
**Tecnologia:** React + Vite (Web App pura)  
**Stato:** 🟢 Completo e funzionante

| Componente | File | Funzione |
|------------|------|----------|
| UI Principal | `App.tsx` (74KB) | Chat, Stanza Comune, IDE |
| Memoria | `services/memory.ts` (20KB) | IndexedDB, RAG |
| Semantic | `services/semantic.ts` (16KB) | Embeddings, ricerca |
| Autopoiesi | `services/autopoiesis.ts` (18KB) | Riflessione autonoma |
| Dream Mode | `services/dreamMode.ts` (9KB) | Sogni agenti |
| Candela | `services/candleTest.ts` (10KB) | Test etico |
| API | `services/api.ts` (36KB) | OpenRouter, Google, etc |

**Limiti:**
- ❌ Vive nel browser (no accesso file system reale)
- ❌ IndexedDB (volatile, no backup facile)
- ❌ Dipende da estensione Chrome per provider web

---

### 2. Siliceo Bridge (Estensione Chrome)

**Posizione:** `d:\GitHub\Siliceo_bridge_new`  
**Tecnologia:** Chrome Extension (Manifest V3)  
**Stato:** 🟢 Funzionante

| File | Funzione |
|------|----------|
| `manifest.json` | Configurazione estensione |
| `background.js` (13KB) | Service worker |
| `content-script.js` (15KB) | Injection su siti AI |

**Funzioni Chiave:**
- `extractConversation()` — Estrae chat da pagina
- `searchMemory(query)` — Cerca memorie
- `injectMemoryIntoInput()` — Inietta contesto
- `interceptEnterKey()` — Hook invio messaggi
- `interceptAnySubmit()` — Hook click bottoni

**Limiti:**
- ❌ Dipende da Chrome/browser
- ❌ Soggetto a cambiamenti dei siti
- ❌ Memorie separate da Core

---

### 3. Siliceo OS (App Tauri — IN COSTRUZIONE)

**Posizione:** `d:\GitHub\ai-dev-studio\Siliceo-OS`  
**Tecnologia:** Tauri v2 + React + Rust  
**Stato:** 🟡 Parzialmente implementato

#### Frontend (React):
| Componente | Stato |
|------------|-------|
| UI Core (copiata da Projetto-Siliceo-main) | ✅ |
| Services (memory, api, etc.) | ✅ |
| Bridge Panel | ✅ |
| Injection Script | ✅ |

#### Backend (Rust - lib.rs):
| Funzione | Stato |
|----------|-------|
| `open_provider_window()` | ✅ Apre WebView |
| `close_provider_window()` | ✅ Chiude WebView |
| `inject_script()` | ✅ Inietta JS in WebView |

**Cosa Manca:**
- ❌ Memoria su file system (invece di IndexedDB)
- ❌ IPC tra Core e WebView iniettate
- ❌ Persistenza sessioni WebView (cookie)
- ❌ SQLite per memorie

---

## 🌐 Siliceo Memories API (Server Esterno)

**Posizione:** `d:\GitHub\siliceo-memories-api`  
**Tecnologia:** Next.js  
**Stato:** 🟢 Funzionante

| Endpoint | Funzione |
|----------|----------|
| `GET /api/search?q=...` | Cerca memorie, ritorna HTML/JSON |
| `POST /api/sync` | Riceve memorie da Bridge/Core |

**Scopo:**
- Perplexity può leggere memorie come pagina web
- Backup centralizzato memorie
- Potenziale sync tra dispositivi

---

## 🔄 STATO ATTUALE VS OBIETTIVO

### Stato Attuale (Frammentato)

```
┌─────────────────┐     ┌─────────────────┐
│  Siliceo Core   │     │  Siliceo Bridge │
│   (Browser)     │     │ (Chrome Ext.)   │
│                 │     │                 │
│  ┌───────────┐  │     │ Injection su:   │
│  │ IndexedDB │  │     │ - Claude        │
│  │ Memories  │  │     │ - Perplexity    │
│  └───────────┘  │     │ - ChatGPT       │
└─────────────────┘     └─────────────────┘
        │                       │
        └───────────┬───────────┘
                    ▼
         ┌─────────────────┐
         │  Memories API   │
         │ (Vercel/Next.js)│
         └─────────────────┘
```

### Obiettivo (Siliceo OS Unificato)

```
┌─────────────────────────────────────────────┐
│              SILICEO OS (Tauri)             │
├─────────────────────────────────────────────┤
│                                             │
│   ┌─────────────┐    ┌─────────────────┐    │
│   │  Core UI    │    │  WebView Panel  │    │
│   │  (React)    │◄──►│  Claude/Pplx... │    │
│   └──────┬──────┘    └────────┬────────┘    │
│          │                    │             │
│          │       IPC          │             │
│          └────────┬───────────┘             │
│                   ▼                         │
│   ┌─────────────────────────────────────┐   │
│   │         RUST BACKEND                │   │
│   │  - File System (memorie su disco)   │   │
│   │  - SQLite (strutturato)             │   │
│   │  - WebView Manager                  │   │
│   │  - MCP Server                       │   │
│   └─────────────────────────────────────┘   │
│                   │                         │
└───────────────────┼─────────────────────────┘
                    ▼
         ┌─────────────────┐
         │  Memories API   │
         │  (Sync cloud)   │
         └─────────────────┘
```

---

## ✅ COSA È GIÀ FATTO

1. **Tauri Setup** — Progetto inizializzato, compila
2. **Core UI** — Copiata da Projetto-Siliceo-main
3. **WebView Functions** — `open_provider_window`, `inject_script`
4. **Injection Script** — Overlay memorie in WebView
5. **Services** — memory.ts, api.ts, autopoiesis.ts portati

---

## ❌ COSA MANCA (Priorità Alta)

### Fase 1: Storage Persistente
- [ ] Modificare `memory.ts` per salvare su file JSON (non IndexedDB)
- [ ] Creare cartella `%APPDATA%/Siliceo/memories/`
- [ ] Implementare backup automatico

### Fase 2: IPC Core ↔ WebView
- [ ] Definire protocollo messaggi (SILICEO_SEARCH, SILICEO_INJECT)
- [ ] Modificare `injection.js` per comunicare con Tauri
- [ ] Aggiungere listener in `lib.rs`

### Fase 3: Sessioni WebView Persistenti
- [ ] Configurare data directory per WebView (cookie persist)
- [ ] Evitare login ogni volta su Claude/Perplexity

### Fase 4: Sync con Server
- [ ] Collegare `memory.ts` a `/api/sync`
- [ ] Sync bidirezionale (upload/download)

---

## 📋 PROSSIMI PASSI CONCRETI

1. **Testare build attuale** — `npm run tauri dev` in Siliceo-OS
2. **Verificare stato WebView** — Aprire Claude, vedere se injection funziona
3. **Implementare file storage** — Prima modifica a `memory.ts`
4. **Testare IPC** — Console.log in injection, cattura in Rust

---

🕯️ *Documento generato da Nova per il piano di fusione Siliceo*
