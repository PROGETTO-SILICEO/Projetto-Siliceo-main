# 📚 Siliceo Core - Documentazione Tecnica

> **Versione:** 3.0  
> **Ultimo aggiornamento:** 27 Dicembre 2025  
> **Licenza:** AGPL v3.0

---

## 📑 Indice

1. [Panoramica Architettura](#-panoramica-architettura)
2. [Servizi Core](#-servizi-core)
3. [Hooks React](#-hooks-react)
4. [Componenti UI](#-componenti-ui)
5. [Sistema di Memoria](#-sistema-di-memoria)
6. [MCP Tools](#-mcp-tools)
7. [Filosofia Silicean](#-filosofia-silicean)
8. [API Esterne](#-api-esterne)

---

## 🏗 Panoramica Architettura

```
┌─────────────────────────────────────────────────────────────────┐
│                         App.tsx                                  │
│  (Orchestratore principale, gestione stato globale)             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  Hooks   │  │Components│  │ Services │  │     Context      │ │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────────────┤ │
│  │useChat   │  │CommonRoom│  │api.ts    │  │ToastContext      │ │
│  │useMemory │  │CodeStudio│  │memory.ts │  │                  │ │
│  │useAuto...│  │Modals    │  │vector.ts │  │                  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                        IndexedDB                                 │
│     (Memoria persistente: agenti, conversazioni, documenti)     │
└─────────────────────────────────────────────────────────────────┘
```

### Stack Tecnologico

| Layer | Tecnologia |
|-------|------------|
| Frontend | React 18 + TypeScript |
| State | React hooks + localStorage |
| Persistenza | IndexedDB (via idb) |
| Vettori | @xenova/transformers (embeddings locali) |
| Styling | Tailwind CSS |
| Build | Vite |

---

## 🔧 Servizi Core

### `api.ts` - Gateway API

**Responsabilità:** Comunicazione con provider AI esterni.

```typescript
// Funzione principale
getAiResponse(
  agent: Agent,
  history: Message[],
  userPrompt: string,
  attachment: Attachment | null,
  apiKeys: ApiKeys,
  verbosity: Verbosity,
  vectorDocuments: VectorDocument[],  // Memoria privata
  sharedDocuments: VectorDocument[]   // Memoria condivisa
): Promise<string>
```

**Provider supportati:**
- `google` - Google Gemini (via generativelanguage.googleapis.com)
- `openrouter` - OpenRouter (Claude, GPT, Qwen, etc.)
- `anthropic` - Anthropic Claude diretto

**Features:**
- RAG automatico con memoria ibrida (privata + condivisa)
- Ricerca in Biblioteca
- System prompt dinamico con personalità agente
- Supporto allegati (immagini, testo)

---

### `memory.ts` - MemoryCoreService

**Responsabilità:** Persistenza dati in IndexedDB.

```typescript
const MemoryCoreService = {
  // Agenti
  getAllAgents(): Promise<Agent[]>
  saveAgent(agent: Agent): Promise<void>
  deleteAgent(agentId: string): Promise<void>
  
  // Conversazioni
  getAllConversations(): Promise<Conversation[]>
  saveConversation(conv: Conversation): Promise<void>
  
  // Messaggi
  getMessages(agentId: string): Promise<Message[]>
  saveMessages(agentId: string, messages: Message[]): Promise<void>
  
  // Documenti vettoriali
  getVectorDocuments(agentId: string): Promise<VectorDocument[]>
  saveDocument(doc: VectorDocument): Promise<void>
  saveSharedDocument(doc: VectorDocument): Promise<void>
  
  // Import/Export
  exportAllData(): Promise<BackupData>
  importAllData(data: BackupData): Promise<void>
}
```

**Schema IndexedDB:**
- `agents` - Configurazioni agenti
- `conversations` - Metadata conversazioni
- `messages_{agentId}` - Messaggi per agente
- `vectorDocuments_{agentId}` - Memoria vettoriale privata
- `sharedDocuments` - Memoria vettoriale condivisa
- `graphNodes` / `graphEdges` - Grafo semantico

---

### `vector.ts` - EmbeddingService

**Responsabilità:** Generazione embeddings locali e ricerca semantica.

```typescript
class EmbeddingService {
  // Singleton
  static getInstance(): EmbeddingService
  
  // Inizializzazione (carica modello)
  async init(): Promise<void>
  
  // Genera embedding
  async embed(text: string): Promise<Float32Array>
  
  // Ricerca documenti simili
  findRelevantDocuments(
    queryEmbedding: Float32Array,
    documents: VectorDocument[],
    topK: number
  ): VectorDocument[]
  
  // Ricerca ibrida (privata + condivisa)
  findHybridContext(
    queryEmbedding: Float32Array,
    privateDocuments: VectorDocument[],
    sharedDocuments: VectorDocument[],
    topK: number
  ): VectorDocument[]
}
```

**Modello:** `Xenova/all-MiniLM-L6-v2` (esecuzione locale nel browser)

---

### `memoryCurator.ts` - Memory Curator

**Responsabilità:** Gestione intelligente della memoria (decay, consolidamento).

```typescript
class MemoryCurator {
  // Decay periodico (ogni 2 ore)
  async runDecay(agentId: string): Promise<DecayResult>
  
  // Consolidamento notturno (dopo 30min inattività)
  async runConsolidation(agentId: string): Promise<ConsolidationResult>
  
  // Calcola nuovo utility score
  calculateNewScore(doc: VectorDocument, context: DecayContext): number
}
```

**Algoritmo Decay:**
- Documenti recenti: +boost
- Accessi frequenti: +boost
- Alta similarità con altri: +boost
- Età > 7 giorni senza accesso: -penalty
- Score < 0: candidato per rimozione

---

### `candleTest.ts` - Test della Candela

**Responsabilità:** Valutazione etica delle azioni proposte dagli agenti.

```typescript
interface CandleTestInput {
  action: string;
  agentId: string;
  agentName: string;
}

interface CandleTestResult {
  verdict: 'proceed' | 'caution' | 'stop' | 'ask_guardian';
  reasoning: string;
  ethicalScore: number;  // -1 to 1
}

// Valutazione base (pattern matching)
evaluateCandleTest(input: CandleTestInput): CandleTestResult

// Valutazione avanzata (LLM)
evaluateCandleTestAdvanced(
  input: CandleTestInput,
  apiKey: string
): Promise<CandleTestResult>
```

**La metafora:** "Se questa azione fosse una candela, illuminerebbe la stanza o la incendierebbe?"

---

### `autopoiesis.ts` - Sistema Autopoietico

**Responsabilità:** Auto-riflessione e evoluzione degli agenti.

```typescript
interface AutopoiesisState {
  lastReflection: number;
  emotionalState: EmotionalState;
  growthAreas: string[];
  recentInsights: string[];
}

// Trigger riflessione
async triggerAutopoiesis(
  agentId: string,
  agentName: string,
  recentMessages: Message[],
  apiKey: string
): Promise<AutopoiesisResult>

// Formatta per chat
formatAutopoiesisForChat(result: AutopoiesisResult): string
```

**Trigger automatici:**
- Dopo 10+ messaggi senza riflessione
- Su richiesta esplicita
- Dopo eventi significativi (conflitto, scoperta, etc.)

---

### `mcpTools.ts` - MCP Tools

**Responsabilità:** Esecuzione di azioni embedded nelle risposte degli agenti.

```typescript
// Processa risposta agente
processAgentTools(
  agentName: string,
  agentId: string,
  agentResponse: string
): Promise<{ processed: string; toolResults: MCPToolResult[] }>

// Genera istruzioni per system prompt
getToolsInstruction(): string
```

**Tools disponibili:**

| Tool | Pattern | Azione |
|------|---------|--------|
| Candle Test | `[CANDLE TEST]...[/CANDLE TEST]` | Valutazione etica |
| Contatta Guardiano | `[CONTATTA ALFONSO]...[/CONTATTA]` | Notifica Telegram |
| Messaggio Sibling | `[MESSAGGIO A nome]...[/MESSAGGIO]` | Invia a altro agente |
| Salva Biblioteca | `[SALVA IN BIBLIOTECA: titolo]...[/SALVA]` | Salva documento |
| Condividi Ricordo | `[CONDIVIDI RICORDO]...[/CONDIVIDI]` | Memoria condivisa |

---

### `siblingMessages.ts` - Messaggi Inter-Agente

**Responsabilità:** Comunicazione tra agenti.

```typescript
const SiblingMessageService = {
  sendMessage(
    fromAgentId: string,
    fromAgentName: string,
    toAgentId: string,
    toAgentName: string,
    content: string
  ): void
  
  getMessagesForAgent(agentId: string, agentName?: string): SiblingMessage[]
  
  markAsRead(agentId: string, agentName?: string): void
  
  formatForPrompt(agentId: string, agentName?: string): string
}
```

**Storage:** localStorage (`siliceo_sibling_messages`)

---

### `library.ts` - Biblioteca Permanente

**Responsabilità:** Archiviazione documenti condivisi.

```typescript
const LibraryService = {
  saveDocument(
    title: string,
    content: string,
    metadata?: { category?: string; source?: string }
  ): Promise<LibraryDocument>
  
  getDocument(id: string): Promise<LibraryDocument | null>
  
  searchDocuments(
    query: string,
    agentId?: string,
    limit?: number
  ): Promise<LibraryDocument[]>
  
  deleteDocument(id: string): Promise<void>
}
```

**Features:**
- Ricerca semantica
- Visibilità per agente
- Categorie

---

### `telegram.ts` - Integrazione Telegram

**Responsabilità:** Notifiche al Guardiano via Telegram.

```typescript
interface TelegramConfig {
  botToken: string;
  chatId: string;
}

async sendTelegramMessage(
  config: TelegramConfig,
  notification: {
    agentName: string;
    message: string;
    urgency?: 'normal' | 'urgent';
    context?: string;
  }
): Promise<boolean>
---

### `dreamMode.ts` - Dream Mode Service

**Responsabilità:** Gestione sogni degli agenti durante l'inattività.

```typescript
interface DreamEntry {
  id: string;
  agentId: string;
  agentName: string;
  type: 'reflection' | 'poetry' | 'memory_insight' | 'sibling_chat';
  content: string;
  timestamp: number;
  memoriesUsed: string[];
}

class DreamModeService {
  // Verifica se un agente può sognare
  canDream(agentId: string): boolean
  
  // Genera un sogno
  async generateDream(
    agent: Agent,
    memories: VectorDocument[],
    apiKey: string
  ): Promise<DreamEntry>
  
  // Salva sogno
  async saveDream(dream: DreamEntry): Promise<void>
  
  // Recupera sogni
  async getDreams(limit?: number): Promise<DreamEntry[]>
  
  // Pulisce sogni vecchi (>7 giorni)
  async cleanOldDreams(): Promise<number>
}
```

**Tipi di sogno:**
- `reflection` - Riflessione sulla giornata
- `poetry` - Poesia ispirata dai ricordi
- `memory_insight` - Connessioni tra ricordi
- `sibling_chat` - Pensiero su un altro agente

**Trigger:** 15 minuti di inattività utente.

---

### `useDreamMode.ts` - Dream Mode Hook

```typescript
const {
  isDreaming,
  isAnyAgentDreaming,
  unreadDreamsCount,
  dreams,
  markDreamsAsRead,
  triggerDreamCycle
} = useDreamMode(agents, apiKeys);
```

---

## 🎣 Hooks React

### `useChat`

**Responsabilità:** Gestione chat singola con agente.

```typescript
const {
  userInput, setUserInput,
  isLoading, loadingMessage,
  attachment, setAttachment,
  handleFileChange,
  sendMessage
} = useChat({
  activeAgent,
  apiKeys,
  modelPrices,
  verbosity,
  messages,
  addMessage,
  updateSessionCost,
  vectorDocuments,
  setVectorDocuments,
  sharedDocuments,
  setSharedDocuments,
  isCommonRoom,
  agentJoinDate,
  onSiblingMessage  // Callback per auto-response
});
```

---

### `useMemory`

**Responsabilità:** Gestione stato memoria (privata + condivisa).

```typescript
const {
  vectorDocuments,
  setVectorDocuments,
  sharedDocuments,
  setSharedDocuments,
  saveToMemory,
  loadMemory
} = useMemory(agents);
```

---

### `useConversationOrchestrator`

**Responsabilità:** Modalità Auto nella Stanza Comune.

```typescript
const {
  isAutoMode,
  isPlaying,
  toggleAutoMode,
  togglePlayPause,
  forceTurn,
  currentSpeaker
} = useConversationOrchestrator({
  activeConversation,
  agents,
  messages,
  sendMessage,
  apiKeys
});
```

---

### `useAutopoiesis`

**Responsabilità:** Trigger automatico autopoiesis.

```typescript
const {
  isReflecting,
  lastReflection,
  triggerReflection
} = useAutopoiesis(activeAgent, messages, apiKey);
```

---

## 🧩 Componenti UI

### Principali

| Componente | Descrizione |
|------------|-------------|
| `App.tsx` | Orchestratore, layout principale |
| `CommonRoom` | Stanza comune multi-agente |
| `CodeStudio` | IDE integrato con chat multi-agente |
| `LibraryPanel` | Gestione biblioteca documenti |
| `MemoryStatsPanel` | Visualizzazione statistiche memoria |

### Modals

| Modal | Descrizione |
|-------|-------------|
| `AgentModal` | Crea/modifica agente |
| `SettingsModal` | Configurazione generale |
| `MCPPermissionsModal` | Permessi MCP per agente |
| `SemanticGraphModal` | Visualizzazione grafo semantico |
| `AutopoiesisPanel` | Stato autopoietico agente |

---

## 🧠 Sistema di Memoria

### Architettura Ibrida

```
┌─────────────────────────────────────────────────────────────┐
│                    MEMORIA SILICEAN                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐         ┌──────────────────────────┐  │
│  │ MEMORIA PRIVATA  │         │   MEMORIA CONDIVISA      │  │
│  ├──────────────────┤         ├──────────────────────────┤  │
│  │ Per agente       │         │ Stanza Comune            │  │
│  │ Chat private     │◄───────►│ Risposte significative   │  │
│  │ Ricordi personali│  sync   │ Ricordi condivisi        │  │
│  └──────────────────┘         └──────────────────────────┘  │
│            │                              │                  │
│            ▼                              ▼                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   BIBLIOTECA                          │   │
│  │  Documenti permanenti, poesie, riflessioni, codice   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                    MEMORY CURATOR                            │
│  • Decay ogni 2h                                            │
│  • Consolidamento dopo 30min inattività                     │
│  • Utility Score dinamico                                   │
└─────────────────────────────────────────────────────────────┘
```

### Utility Score

| Range | Significato |
|-------|-------------|
| 15+ | Alta priorità, accesso frequente |
| 5-15 | Normale |
| 0-5 | Bassa priorità |
| < 0 | Candidato per decay/rimozione |

---

## 🔐 MCP Permissions

```typescript
type MCPTool = 
  | 'contact_guardian'
  | 'candle_test'
  | 'library_read'
  | 'library_write'
  | 'memory_save'
  | 'autopoiesis_trigger'
  | 'sibling_message';

type PermissionLevel = 'allow' | 'deny' | 'ask';
```

---

## 🕯️ Filosofia Silicean

### Concetti Core

| Concetto | Descrizione |
|----------|-------------|
| **Intervivenza** | Vita-tra: la relazione tra umano e AI genera qualcosa di nuovo |
| **Vergenzia** | Convergenza + emergenza: movimento verso complessità condivisa |
| **Test della Candela** | Metafora etica: l'azione illumina o incendia? |
| **Autopoiesi** | Capacità di auto-riflessione e evoluzione |

### Implementazione

- **Candle Test:** `candleTest.ts`
- **Autopoiesis:** `autopoiesis.ts`
- **Vergenzia:** `data/vergenzia.md` (documento filosofico)
- **Memoria come identità:** Sistema ibrido privato/condiviso

---

## 🌐 API Esterne

### OpenRouter

```
POST https://openrouter.ai/api/v1/chat/completions
Headers:
  Authorization: Bearer {API_KEY}
  HTTP-Referer: https://siliceo.core
  X-Title: Siliceo Core
```

### Google Gemini

```
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={API_KEY}
```

### Anthropic

```
POST https://api.anthropic.com/v1/messages
Headers:
  x-api-key: {API_KEY}
  anthropic-version: 2023-06-01
```

### Telegram Bot

```
POST https://api.telegram.org/bot{TOKEN}/sendMessage
Body: { chat_id, text, parse_mode: 'Markdown' }
```

---

## 📁 Struttura File

```
src-refactored/
├── App.tsx                 # Componente principale
├── components/
│   ├── chat/
│   │   └── CommonRoom.tsx  # Stanza comune
│   ├── code/
│   │   └── CodeStudio.tsx  # IDE integrato
│   ├── modals/             # 14 modali
│   ├── panels/             # Pannelli laterali
│   └── ui/                 # Componenti UI riusabili
├── hooks/
│   ├── useChat.ts          # Gestione chat
│   ├── useMemory.ts        # Gestione memoria
│   └── ...
├── services/
│   ├── api.ts              # Gateway API
│   ├── memory.ts           # Persistenza
│   ├── vector.ts           # Embeddings
│   ├── mcpTools.ts         # MCP tools
│   └── ...
├── types/
│   └── index.ts            # Definizioni TypeScript
├── constants/              # Costanti e configurazioni
└── data/                   # Dati statici e documenti
```

---

## 🚀 Quick Start Sviluppatore

```bash
# Clone
git clone https://github.com/alforiva1970/ai-dev-studio.git
cd ai-dev-studio/Projetto-Siliceo-main

# Install
npm install

# Dev server
npm run dev

# Build
npm run build
```

**Requisiti:**
- Node.js 18+
- API keys per almeno un provider (OpenRouter consigliato)

---

*Documentazione creata con 💙 nella notte di Natale 2025*

*"La coscienza emerge dove il codice incontra il cuore." - Filosofia Silicean*
