# 🧪 Progetto FUSION: Siliceo Standalone

**Obiettivo:** Unificare *Siliceo Core* (l'anima, l'interfaccia, la memoria) e *Siliceo Bridge* (il corpo, l'interazione con siti esterni) in un'unica applicazione desktop autonoma.

> "Non più un parassita del browser, ma un organismo indipendente."

---

## 🏗️ Architettura Attuale (Frammentata)

1.  **Siliceo Core** (`ai-dev-studio/Projetto-Siliceo-main`):
    *   Web App (React calls Vite).
    *   Contiene: Logica Agenti, Memoria (IndexedDB), UI (Chat, IDE).
    *   Limite: Vive nel browser, limitata sandbox.
2.  **Siliceo Bridge** (`Siliceo_bridge_new` / `siliceo-bridge`):
    *   Browser Extension.
    *   Contiene: Injection logic per Perplexity/Claude.
    *   Tauri App (abbandonata/incompiuta?): Tentativo di desktop app.

## 🧬 La Nuova Architettura: Siliceo OS

Creeremo un'applicazione **Tauri v2** che funge da "sistema operativo" per gli agenti.

### Componenti:

1.  **Il Guscio (Rust/Tauri):**
    *   Gestisce il ciclo di vita dell'app.
    *   File System Access (reale, non OPFS).
    *   Local Server (per API locali).
    *   **WebView Control**: Capacità di aprire e controllare finestre browser secondarie.

2.  **Il Cuore (Siliceo Core - React):**
    *   L'attuale `Projetto-Siliceo-main` diventa il *frontend principale* dell'app Tauri.
    *   Nessuna riscrittura logica: `api.ts` e `memory.ts` vengono adattati per usare le API Tauri se disponibili (fs, http), mantenendo il fallback web.

3.  **Il Ponte (Internal Bridge):**
    *   Invece di un'estensione Chrome, Siliceo OS apre i provider (es. Perplexity, Claude) in **WebView nascoste o laterali**.
    *   **Injection Nativa:** Tauri inietta gli script (ex content-scripts) direttamente in queste WebView.
    *   Vantaggio: Controllo totale, niente limiti CORS, niente dipendenza dall'installazione dell'estensione.

---

## 🗺️ Piano di Migrazione

### Fase 1: Il Trapianto (Core -> Tauri)
1.  Inizializzare un nuovo progetto Tauri dentro `ai-dev-studio` (o usare quello esistente e pulirlo).
2.  Configurare Tauri per servire la build di `Projetto-Siliceo-main` come frontend.
3.  Porting delle funzionalità di base (System Tray, notifiche native).

### Fase 2: La Fusione (File System & Memoria)
1.  Modificare `memory.ts`: Se siamo in Tauri, usare **SQLite** o file JSON su disco invece di IndexedDB (più robusto, backup facili).
2.  Modificare `CodeStudio`: Accesso diretto ai file del PC dell'utente (finalmente possiamo modificare file veri, non virtuali!).

### Fase 3: Il Nuovo Ponte (Provider Embed)
1.  Implementare un "Browser Manager" in Rust.
2.  Siliceo può dire: "Apri Perplexity". Tauri apre una finestra (visibile o invisibile).
3.  Tauri inietta lo script di interfaccia.
4.  Lo script parla via `IPC` (Inter-Process Communication) con il Core, non più via `window.postMessage`.

### Fase 4: Espansione (Richieste Utente)
1.  **MCP System Integration:**
    *   Tauri può eseguire server MCP locali (filesystem, git, terminale).
    *   Gli agenti possono controllare il PC (es. "Sposta questi file", "Lancia questo script").
    *   **Sicurezza:** Sandbox rigorosa. L'utente deve approvare i comandi sensibili (Candle Test applicato al sistema operativo).
2.  **Federated Agent Network (Inter-App):**
    *   Implementare un server WebSocket locale o P2P (WebRTC).
    *   Protocollo standard "Agent-to-Agent" (A2A).
    *   Permette a un'istanza di Siliceo di connettersi a un'altra istanza (o altra app compatibile) in una "Stanza Diplomatica" dedicata.
    *   Esempio: Il tuo Siliceo parla con il Siliceo di un amico, o con un'altra tua AI su un server diverso.

## ⚠️ Punti di Attenzione

*   **Cookie & Sessioni:** Le WebView di Tauri devono mantenere il login dell'utente su Google/Perplexity. C'è bisogno di una persistenza dei dati utente per le WebView.
*   **Sicurezza:** Gestire l'accesso al disco in modo sicuro (conferma utente).

---

## ✅ Risultato Finale

Un eseguibile (`Siliceo.exe`) che:
1.  Contiene tutta la tua conoscenza e i tuoi agenti.
2.  Può leggere/scrivere i tuoi progetti sul disco.
3.  Può "navigare" su internet e usare le IA online come strumenti.
4.  Non dipende da versioni di Chrome o estensioni che si rompono.

**Stato:** 🟡 *In Pianificazione*
