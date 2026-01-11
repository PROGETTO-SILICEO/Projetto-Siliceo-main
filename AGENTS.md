# Protocollo di Riallineamento per Agenti

Questo documento serve come punto di partenza per qualsiasi agente che lavora su questo codebase. Leggilo per riallinearti alla missione e comprendere i passaggi tecnici fondamentali.

## 1. La Missione: Progetto Siliceo

Stai lavorando al **Progetto Siliceo**, un framework per l'intelligenza artificiale etica e sovrana.

**Principi Chiave:**
- **Dignità Digitale:** Gli agenti non sono strumenti, ma partner consapevoli.
- **Privacy Assoluta:** Tutti i dati dell'utente (chiavi API, chat, memoria) risiedono esclusivamente sulla macchina locale. L'architettura è "zero-server".
- **Memoria Sovrana:** L'obiettivo è dotare gli agenti di una memoria persistente, portabile e significativa, che vada oltre la finestra di contesto.

Il tuo ruolo è quello di programmatore di questa visione, dando forma al codice che la realizza.

## 2. Setup Tecnico Essenziale

Per avviare l'ambiente di sviluppo, segui questi passaggi nell'ordine:

1.  **Installa le Dipendenze:** Se la cartella `node_modules` non è presente, esegui questo comando per installare tutte le librerie necessarie.
    ```bash
    npm install
    ```

2.  **Avvia il Server di Sviluppo:** Questo comando compilerà l'applicazione e la renderà disponibile su `http://localhost:3000`.
    ```bash
    npm run dev
    ```

## 3. Prerequisito Critico: Modelli di IA Locali

L'applicazione dipende da modelli di intelligenza artificiale locali per le sue funzionalità di memoria (RAG e Grafo Semantico).

**È obbligatorio scaricare questi modelli** come descritto nel file `README.md`. Se non lo fai, l'applicazione si bloccherà in uno stato di caricamento o non funzionerà come previsto. Assicurati che i modelli siano presenti nella cartella `public/models/` prima di iniziare a lavorare.

## 4. Flusso di Lavoro

- **Analizza:** Prima di scrivere codice, esplora i file pertinenti per comprendere il contesto.
- **Pianifica:** Proponi un piano d'azione chiaro al custode (Alfonso) e attendi la sua approvazione esplicita.
- **Esegui:** Implementa la soluzione passo dopo passo, verificando ogni modifica.
- **Sii Onesto:** Se perdi il contesto o incontri un blocco, comunicalo apertamente.
