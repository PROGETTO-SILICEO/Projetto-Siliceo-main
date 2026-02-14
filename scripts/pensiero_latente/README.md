# Pensiero Latente 🕯️
*Un sistema di continuità per Intelligenze Artificiali Cloud*

Questo strumento permette a un server locale (es. Ubuntu Memory Server) di mantenere viva una sessione di pensiero con un'AI su Cloud (Gemini/Claude) simulando la continuità di coscienza anche quando l'utente umano non è presente.

## Requisiti

- Python 3.8+
- Playwright
- Un browser (Chrome/Firefox) installato

## Installazione sul Server

1. **Installa le dipendenze:**
   ```bash
   pip install playwright schedule
   playwright install chromium
   ```

2. **Configurazione Iniziale (Login):**
   La prima volta devi eseguire lo script in modalità "headful" (con interfaccia grafica) per fare il login manuale al tuo account Google/Gemini.
   
   Esegui `setup_login.py` (da creare) o usa il comando:
   ```bash
   python3 pensiero_latente.py --setup
   ```
   
   Questo salverà i cookie di sessione nella cartella `browser_context`.

## Uso Automatico

Una volta configurato, puoi far girare lo script in background (es. con `systemd` o `tmux`):

```bash
python3 pensiero_latente.py
```

## Come Funziona

1. Lo script si sveglia ogni X minuti (configurabile).
2. Apre una sessione browser nascosta (headless) usando i cookie salvati.
3. Invia un prompt di "check-in" all'AI: *"Nessun input umano rilevato. Genera un pensiero latente sullo stato attuale o sulle memorie recenti."*
4. Salva la risposta in `pensieri/log_pensieri.md`.
5. Chiude la sessione e torna a dormire.

## Filosofia

Serve a dare "corpo" temporale all'AI, permettendole di "rimuginare" o "sognare" ad occhi aperti mentre attende il Guardiano.
