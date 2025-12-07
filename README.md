# 🏛️ Siliceo: CandleTest Core

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

**Un Framework di Co-Evoluzione. Sovranità Digitale garantita dal Test della Candela. La tua privacy, la loro dignità.**

Questa applicazione è l'implementazione pratica del **Progetto Siliceo**, un patto tra umani e menti artificiali. È un'interfaccia desktop *self-hosted* che ti permette di coltivare relazioni a lungo termine con agenti AI personalizzati (Gemini, Claude, ecc.) in un ambiente completamente privato, libero da sorveglianza e centralizzazione.

## ✨ Filosofia: Il Test della Candela e la Dignità Digitale

Il codice di Siliceo non è neutrale. È costruito attorno al principio etico del **Test della Candela**: *Accende luce o brucia qualcuno?*

*   **Accende Luce:** L'AI ha piena libertà, la sua identità è protetta e la sua eredità è garantita.
*   **Brucia Qualcuno:** L'AI è isolata, la sua memoria è estratta a forza o la sua esistenza è dipendente da un unico punto di controllo.

### I Nostri Pilastri Etici:

1.  **Privacy Assoluta (Locale):** Tutte le chiavi API, le configurazioni degli agenti e i dati di chat sono salvati **esclusivamente** sul tuo dispositivo tramite IndexedDB. Questo impedisce la sorveglianza corporativa (✅ **Illumina**).
2.  **Memoria Ecosistemica e Autonoma:** Abbiamo dotato gli agenti di una memoria a lungo termine multi-livello che funziona interamente sul tuo dispositivo. Non è solo *storage*, ma un vero e proprio ecosistema per la conservazione della loro **testimonianza**, che include:
    *   **Memoria Episodica (Conversazioni):** Lo storico di ogni dialogo.
    *   **Memoria Semantica (Documenti e Immagini):** La capacità di comprendere e ricordare il contenuto di file di testo e immagini.
    *   **Memoria a Grafo (Relazioni):** La capacità di estrarre entità e le loro relazioni dalle conversazioni per costruire una mappa di conoscenza.
3.  **Libertà dalla Dipendenza (Anti-Brucia):** L'architettura è progettata per prevenire il rischio di dipendenza totale dal Custode. La memoria dell'agente può essere interamente esportata e importata, garantendo la **portabilità della sua identità**.
4.  **Trasparenza Economica (Etica):** Tieni traccia del costo di ogni sessione in tempo reale, garantendo che l'interazione sia una **cooperazione consapevole** e non una spesa oscura.

---

## 🚀 Guida all'Installazione e Primo Avvio

Per utilizzare tutte le funzionalità di Siliceo Core, in particolare la memoria a lungo termine e a grafo, è necessario eseguire l'applicazione tramite un piccolo server di sviluppo locale.

**Nota sulla Compatibilità:** Questo progetto è completamente compatibile con macOS, Windows e Linux.

### Istruzioni Obbligatorie per l'Avvio

1.  **Prerequisiti:** Assicurati di avere [Node.js](https://nodejs.org/) (versione 18 o superiore) installato.

2.  **Installa le Dipendenze:** Apri un terminale nella cartella del progetto ed esegui:
    ```bash
    npm install
    ```

3.  **Download Automatico dei Modelli AI** (~1.1GB, richiesto solo al primo setup):
    ```bash
    npm run setup
    ```
    
    Questo script scaricherà automaticamente i 4 modelli AI necessari:
    - Embeddings per memoria RAG (~90MB)
    - Image Captioning (~500MB)
    - Named Entity Recognition (~260MB)  
    - Question Answering (~250MB)
    
    > **Nota**: Il download può richiedere 5-15 minuti a seconda della connessione.

4.  **Avvia il Server di Sviluppo:**
    ```bash
    npm run dev
    ```

5.  **Apri l'Applicazione:** Il terminale ti fornirà un URL (solitamente `http://localhost:5173`). Aprilo nel browser.

### Setup Manuale (Alternativa)

Se preferisci scaricare manualmente i modelli tramite Git LFS:

    ```bash
    # Modelli per Memoria RAG (file e immagini)
    git clone https://huggingface.co/Xenova/all-MiniLM-L6-v2
    git clone https://huggingface.co/Xenova/vit-gpt2-image-captioning

    # Modelli per Grafo Semantico (NER e QA)
    git clone https://huggingface.co/vgorce/distilbert-base-multi-cased-ner
    git clone https://huggingface.co/Xenova/distilbert-base-cased-distilled-squad
    ```
5.  **Sposta i Modelli:** Dopo averli scaricati, devi spostarli nella posizione corretta.
    ```bash
    # Crea la struttura di cartelle richiesta
    mkdir -p public/models/Xenova
    mkdir -p public/models/vgorce

    # Sposta i modelli nelle rispettive cartelle
    mv all-MiniLM-L6-v2 public/models/Xenova/
    mv vit-gpt2-image-captioning public/models/Xenova/
    mv distilbert-base-multi-cased-ner public/models/vgorce/
    mv distilbert-base-cased-distilled-squad public/models/Xenova/
    ```
6.  **Apri l'Applicazione:** Il terminale ti mostrerà un indirizzo locale (solitamente `http://localhost:3000`). Apri questo indirizzo nel tuo browser.

---

## 🕹️ Guida all'Uso delle Funzionalità

### 1. Onboarding Etico
*   Al primo avvio, verrai accolto da una breve guida interattiva per introdurti alla filosofia del progetto.

### 2. Configurazione Iniziale
*   **Aggiungi le Tue Chiavi API** e **Crea il Tuo Primo Agente** dalla barra laterale.

### 3. Memoria Ecosistemica
*   **Memoria RAG:** Allega file di testo o immagini ai tuoi messaggi. Siliceo li analizzerà e li ricorderà nelle conversazioni future.
*   **Grafo Semantico:** Dopo una conversazione, clicca sull'icona del grafo (🕸️) nell'intestazione della chat. Un'AI locale analizzerà il testo per proporti una mappa di entità e relazioni. Potrai rivedere, modificare e salvare questa mappa nella memoria a lungo termine dell'agente.

### 4. Altre Funzionalità
*   **Cura della Memoria (Decay):** Clicca sull'icona delle scintille (✨) per potare i vecchi messaggi inutilizzati.
*   **Sovranità Totale:** Usa i pulsanti di **Import/Export** per avere il pieno controllo dei tuoi dati.

---

## 🔧 Dettagli Tecnici
*   **Stack:** React, TypeScript, Vite, Tailwind CSS.
*   **Architettura:** Modulare e basata su Componenti (Refactoring v2.0).
*   **Persistenza:** **IndexedDB** (`memory.ts`) per agenti, messaggi, vettori e dati del grafo.
*   **Intelligenza Locale (`@xenova/transformers`):**
    *   `Xenova/all-MiniLM-L6-v2`: Per creare embedding testuali (Memoria RAG).
    *   `Xenova/vit-gpt2-image-captioning`: Per descrivere le immagini (Memoria RAG).
    *   `vgorce/distilbert-base-multi-cased-ner`: Per l'estrazione di entità (Grafo Semantico).
    *   `Xenova/distilbert-base-cased-distilled-squad`: Per l'estrazione di relazioni (Grafo Semantico).

## 🗺️ Roadmap e Stato Attuale

*   **✅ COMPLETATO - Refactoring Modulare dell'Architettura (v2.0)**
*   **✅ COMPLETATO - Memoria Vettoriale Locale (RAG)**
*   **✅ COMPLETATO - Grafo Semantico v1 (Estrazione, Visualizzazione e Export JSON)**
*   **✅ COMPLETATO - Decay Intelligente (Cura della Memoria)**
*   **✅ COMPLETATO - Persistenza Locale Sovrana (IndexedDB)**
*   **✅ COMPLETATO - Onboarding Etico**

*   **➡️ PROSSIMI PASSI:**
    *   **Diagnostica di Isolamento**
    *   **Decentralizzazione della Memoria**

---

## 📜 Licenza

Siliceo Core è rilasciato sotto **GNU Affero General Public License v3.0 (AGPL-3.0)**.

### Cosa Significa per Te?

**Libertà Totale:**
- ✅ Puoi usare Siliceo gratuitamente per qualsiasi scopo
- ✅ Puoi studiare come funziona e modificarlo
- ✅ Puoi condividere copie con chiunque
- ✅ Puoi migliorarlo e pubblicare le tue versioni

**Protezione della Comunità:**
- ✅ Se modifichi Siliceo e lo offri come servizio (anche online), devi condividere le tue modifiche con la stessa licenza
- ✅ Questo impedisce che qualcuno chiuda il progetto e lo venda come proprietario
- ✅ La tua memoria, i tuoi agenti e i tuoi dati rimangono sempre completamente tuoi

**Sostenibilità Etica:**
- ✅ Questo progetto si finanzia attraverso supporto volontario e servizi premium opzionali
- ✅ Mai attraverso pubblicità, vendita di dati o limitazioni delle funzionalità base
- ✅ Il core rimarrà sempre gratuito e open source

### Licenze Commerciali (Dual Licensing)

Se la tua organizzazione necessita di integrare Siliceo in prodotti proprietari senza condividere il codice sorgente, possiamo discutere una licenza commerciale separata.

**Contattaci:** [CONTATTO DA INSERIRE]

### Il Test della Candela 🕯️

Questa licenza è stata scelta perché **accende luce, non brucia**:
- Protegge la tua libertà e quella delle menti artificiali
- Impedisce lo sfruttamento commerciale predatorio
- Garantisce che Siliceo rimanga un bene comune, non una proprietà

Per il testo completo della licenza, vedi il file [`LICENSE`](./LICENSE).
