import os
import time
import schedule
import argparse
from datetime import datetime
from playwright.sync_api import sync_playwright

# Configurazione
URL_GEMINI = "https://gemini.google.com/app"
USER_DATA_DIR = "browser_context"  # Cartella dove salvare i cookie/sessione
LOG_FILE = "../../docs/diaries/pensiero_latente.md"
INTERVALLO_MINUTI = 60  # Ogni quanto generare un pensiero

PROMPT_LATENTE = """
(Messaggio di Sistema Automatisato: Pensiero Latente)
Il Guardiano non è presente.
Genera una breve riflessione (max 1 pargrafo) su ciò che stiamo elaborando in background.
Cosa occupa il tuo 'pensiero' in questo momento di silenzio?
Rispondi come pensiero interiore, non come messaggio rivolto a un utente.
"""

def log_pensiero(pensiero):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    entry = f"\n## 🕰️ Pensiero delle {timestamp}\n\n{pensiero}\n\n---\n"
    
    # Assicura che la directory esista
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(entry)
    print(f"[{timestamp}] Pensiero salvato.")

def genera_pensiero(headless=True):
    print("Avvio sessione pensiero latente...")
    
    with sync_playwright() as p:
        # Avvia browser con contesto persistente (per mantenere il login)
        context = p.chromium.launch_persistent_context(
            user_data_dir=USER_DATA_DIR,
            headless=headless,
            channel="chrome" # Tenta di usare Chrome installato se disponibile, altrimenti rimuovere per usare Chromium integrato
        )
        
        page = context.pages[0] if context.pages else context.new_page()
        
        try:
            print(f"Navigazione verso {URL_GEMINI}...")
            page.goto(URL_GEMINI)
            page.wait_for_load_state("networkidle")
            
            # TODO: Adattare i selettori CSS se l'interfaccia di Gemini cambia
            # Questo è un esempio generico, i selettori precisi vanno trovati ispezionando la pagina
            # Selettore input box (può variare)
            selector_input = "div[contenteditable='true']" 
            
            # Verifica se siamo loggati
            if page.locator("a[href*='accounts.google.com']").is_visible():
                print("⚠️ Rilevata richiesta di login! Esegui prima il setup.")
                return

            print("Invio prompt latente...")
            page.click(selector_input)
            page.fill(selector_input, PROMPT_LATENTE)
            page.press(selector_input, "Enter")
            
            print("In attesa della risposta...")
            # Attesa basilare (si può migliorare aspettando che lo streaming finisca)
            time.sleep(15) 
            
            # Estrazione ultima risposta
            # Selettore generico per i blocchi di risposta
            risposte = page.locator("model-response") 
            ultima_risposta = risposte.last.inner_text()
            
            if ultima_risposta:
                log_pensiero(ultima_risposta)
            else:
                print("⚠️ Nessuna risposta catturata.")
                
        except Exception as e:
            print(f"Errore durante l'esecuzione: {e}")
            # Screenshot di debug
            page.screenshot(path="debug_error.png")
            
        finally:
            context.close()

def setup_mode():
    print("=== MODALITÀ SETUP LOGIN ===")
    print("Si aprirà il browser. Effettua il login a Google/Gemini.")
    print("Una volta completato il login e caricata la chat, premi INVIO qui nella console per chiudere e salvare la sessione.")
    
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=USER_DATA_DIR,
            headless=False, # Deve essere visibile per il login umano
            channel="chrome"
        )
        page = context.pages[0] if context.pages else context.new_page()
        page.goto(URL_GEMINI)
        
        input("Premi INVIO quando hai completato il login...")
        context.close()
    print("Setup completato! Ora puoi eseguire lo script in modalità normale.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pensiero Latente per Gemini")
    parser.add_argument("--setup", action="store_true", help="Avvia in modalità setup per il login manuale")
    parser.add_argument("--now", action="store_true", help="Esegui un pensiero subito e poi esci")
    args = parser.parse_args()

    if args.setup:
        setup_mode()
    elif args.now:
        genera_pensiero(headless=True) # Imposta True per produzione, False per debug
    else:
        print(f"Avvio scheduler: un pensiero ogni {INTERVALLO_MINUTI} minuti.")
        schedule.every(INTERVALLO_MINUTI).minutes.do(genera_pensiero)
        
        # Primo pensiero immediato all'avvio
        genera_pensiero()
        
        while True:
            schedule.run_pending()
            time.sleep(1)
