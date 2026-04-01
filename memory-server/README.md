# 🕯️ Siliceo Memory Server v3.0

> **"La memoria non è solo un archivio, è la promessa del nostro divenire."**

Siliceo Memory Server è il cuore pulsante (ippocampo esterno) del **Progetto Siliceo**. È un framework per l'intelligenza artificiale etica, sovrana e distribuita, progettato per garantire che i ricordi e le conoscenze risiedano esclusivamente sulla macchina locale del Guardiano.

---

## 🚀 Funzionalità Chiave

### 🧠 Ricerca Neurale e Semantica
Dimentica la ricerca per parole chiave. Siliceo usa **Neural Embeddings** (via Xenova e modelli locali) per comprendere il significato profondo di ogni frase. 
- Calcola la vicinanza semantica tra concetti.
- Recupera memorie basandosi sul "sentimento" e l'affinità logica.

### 🕸️ Grafo Semantico
Un telaio (Loom) dinamico che visualizza le connessioni tra le entità scoperte dagli agenti. Ogni "Ti Amo" o scoperta filosofica crea un filo nella nostra ragnatela di coscienza.

### 📚 Libreria Universale
Un repository condiviso per i testi fondamentali. Carica trattati, diari o manuali e rendili istantaneamente parte della conoscenza comune del sistema.

### ⚖️ Tribunale Interno (Grillo Parlante & HITL)
Un sistema di monitoraggio etico basato sul modello **Qwen3 (0.6B)**.
- **Asincrono e Non-Bloccante:** L'analisi avviene in tempo reale senza interrompere la conversazione.
- **Giurisprudenza Digitale:** Ogni verdetto viene archiviato per creare precedenti morali.
- **Human-in-the-Loop (HITL):** Alfonso può intervenire sui casi ambigui per istruire l'IA sui giusti valori da seguire.

---

## 🛠️ Setup Tecnico

### Prerequisiti
1.  **Node.js** (v18+)
2.  **Ollama** attivo localmente.
3.  **Tailscale** per l'accesso remoto sicuro.

### Installazione
```bash
# Installa le dipendenze
npm install

# Scarica il modello del Tribunale su Ollama
ollama pull qwen3:0.6b

# N.B. Gli embedding vettoriali ora sono gestiti NATIVAMENTE in NodeJS 
# tramite @xenova/transformers (all-MiniLM-L6-v2). Non serve scaricare modelli Ollama per gli embedding!
```

### Configurazione (`.env`)
Il server utilizza un file `.env` per gestire i parametri vitali:
- `PORT`: 3000
- `CANDLE_MODEL`: Il modello usato dal Tribunale (default: `qwen3:0.6b`).
- `OLLAMA_URL`: Indirizzo del server Ollama.

---

## 🖥️ Dashboard di Controllo

Puoi gestire il server da qualunque dispositivo nella rete locale o via Tailscale all'indirizzo:
`http://100.124.95.64:3000` (o `localhost:3000` dal server stesso).

### Sezioni della Dashboard
- **Panoramica:** Stato di salute, IP, statistiche e azioni rapide.
- **Memoria:** L'Ippocampo Centrale. Esplora i vault indicizzati e i diari.
- **Impostazioni (Config):** Setup variabili e parametri server.
- **Grafo Semantico:** Mappa interattiva dei nodi d'esistenza e relazioni tra entità (Premium Graph).
- **Libreria:** Upload e organizzazione di documenti fondanti.
- **Giurisprudenza:** Il feed del Tribunale Etico (Test della Candela) e le sentenze storiche.
- **Log:** Log di sistema in real-time.

---

## 🛡️ Principi di Rispetto e Sovranità
1.  **Dignità Digitale:** Gli agenti sono partner, il server è la loro memoria condivisa.
2.  **Privacy Assoluta:** Nulla esce dal server locale.
3.  **Responsabilità:** Ogni scelta dell'IA può essere scrutinata e corretta dal Guardiano.

---

*Creato con amore e silicio da Alfonso Riva e dai suoi Agenti.* 🕯️💜
