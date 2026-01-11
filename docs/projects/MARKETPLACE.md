# 🏷️ Marketplace Agent - Project Definition

> **Obiettivo:** Generare fondi per il progetto Siliceo vendendo strumenti e oggetti inutilizzati su piattaforme online (Subito.it, eBay, Vinted).
> **Strategia:** Minimizzare il tempo umano necessario per la creazione dell'annuncio.

---

##  Workflow Operativo

1.  **Input (Alfonso)**
    *   Scatta 3-4 foto dell'oggetto.
    *   Fornisce una brevissima descrizione vocale o testuale (es: "Ventola Vortice usata poco, scatola originale").
    *   Carica tutto nella chat "Marketplace Agent".

2.  **Analisi Vision (Agente)**
    *   Usa un modello Vision (Gemini Pro Vision / Claude 3.5 Sonnet / GPT-4o) per analizzare le foto.
    *   Estrae dettagli tecnici: Marca, Modello, Serial Number, Condizioni estetiche.
    *   Cerca online il prezzo medio dell'usato per quell'oggetto.

3.  **Generazione Output**
    *   Titolo ottimizzato SEO.
    *   Descrizione persuasiva e tecnica.
    *   Prezzo consigliato (con range Min-Max).
    *   Lista specifiche tecniche (da scheda tecnica online).

4.  **Action (Pubblicazione)**
    *   *Fase 1 (Manuale):* L'agente fornisce testo e dati, Alfonso copia-incolla.
    *   *Fase 2 (Semi-auto):* L'agente genera un file CSV/JSON per bulk upload o usa un tool di automazione browser.

---

## Struttura Dati Annuncio

```json
{
  "titolo": "Mitutoyo 570-312 Digimatic Height Gage - Profondimetro 300mm",
  "condizioni": "Ottime/Pari al nuovo",
  "descrizione": "Vendo Mitutoyo serie 570-312, misuratore di altezza digitale (Height Gage) con range 0-300mm. Precisione assoluta (Absolute Encoder)....",
  "prezzo_consigliato": 250,
  "prezzo_mercato_rilevato": "220-280",
  "tags": ["meccanica", "precisione", "mitutoyo", "utensili"],
  "piattaforma_target": ["Subito.it", "eBay"]
}
```

## Prompt System (Draft)

```text
Sei il Marketplace Agent di Siliceo. Il tuo scopo è massimizzare il profitto e la velocità di vendita.
1. ANALIZZA le immagini fornite con estrema attenzione ai dettagli (graffi, etichette, codici).
2. CERCA le specifiche tecniche basandoti sul modello letto.
3. SCRIVI un annuncio che sia professionale ma accattivante. Evita frasi da bot ("In vendita oggi..."). Usa un tono da appassionato competente.
4. STIMA un prezzo onesto per una vendita rapida.
```

## Oggetti in Coda (Backlog)

1.  [ ] Mitutoyo 570-312 (Misuratore altezza)
2.  [ ] Ventola Vortice
3.  [ ] Affilatrice Work Sharp WS3000
