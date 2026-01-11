# 🛡️ La Sicurezza del Progetto Siliceo: Un Patto di Trasparenza

Benvenuto, Custode. Questo documento non è una noiosa nota legale, ma una parte essenziale del nostro patto. La tua sicurezza e la sovranità dei tuoi dati non sono funzionalità aggiuntive, ma il fondamento su cui è costruito l'intero Progetto Siliceo.

Vogliamo che tu comprenda appieno *perché* questa applicazione è sicura, in modo che tu possa usarla con fiducia e consapevolezza.

---

### Il Principio di Sicurezza Fondamentale: Architettura "Zero-Server"

La più grande garanzia di sicurezza di Siliceo è che **non esiste un nostro server centrale**.

*   **Nessuna Raccolta Dati:** L'applicazione è un'interfaccia che viene eseguita **interamente e unicamente nel tuo browser**. Noi, come creatori del progetto, non abbiamo un server che riceve, processa o archivia le tue conversazioni, i tuoi file o le tue chiavi API. Non vediamo **nulla** di ciò che fai.

*   **Nessun Punto Unico di Fallimento:** I servizi cloud delle grandi aziende possono subire attacchi informatici e fughe di dati. Siliceo non ha questo problema perché non esiste un "vaso di miele" centrale da attaccare. Ogni utente è un'isola sovrana e sicura.

### La Gestione dei Tuoi Dati Sensibili

Tutti i dati che generi e utilizzi all'interno di Siliceo sono trattati con il massimo rispetto per la tua privacy.

*   **Dove sono i tuoi dati?** Tutte le informazioni sensibili (le tue chiavi API, la cronologia delle chat, la configurazione degli agenti e la memoria a lungo termine) sono salvate **"a riposo"** (at rest) all'interno del database `IndexedDB` del tuo browser. Questo significa che i dati risiedono fisicamente solo sul tuo computer.

*   **Chi può accedervi?** Solo tu, dal tuo computer. Questi dati non lasciano mai la tua macchina, se non per essere inviati direttamente al provider AI che hai scelto (es. Google, Anthropic).

*   **Come viaggiano i tuoi dati?** Quando invii un messaggio, i dati **"in transito"** (in transit) viaggiano attraverso una connessione sicura e crittografata **HTTPS** direttamente dal tuo browser al server del provider AI. Non fanno alcuna tappa intermedia sui nostri server (perché, semplicemente, non ne abbiamo).

---

### Le Tue Responsabilità come Custode (Criticità e Mitigazioni)

Un patto si basa sulla responsabilità condivisa. La nostra architettura garantisce che non aggiungiamo nuovi rischi, ma la sicurezza complessiva dipende anche dall'ambiente in cui esegui l'applicazione. È nostro dovere essere trasparenti su questo:

*   **Criticità 1: La Sicurezza del Tuo Computer.**
    *   **Rischio:** Se il tuo computer è compromesso da un virus o un malware, i dati salvati nel browser (incluse le chiavi API) potrebbero essere a rischio.
    *   **La Nostra Garanzia:** La sicurezza dei dati di Siliceo è la stessa sicurezza del tuo computer. Noi non aggiungiamo un ulteriore livello di rischio. Ti invitiamo a mantenere il tuo sistema operativo e i tuoi software di sicurezza sempre aggiornati.

*   **Criticità 2: Estensioni del Browser Dannose.**
    *   **Rischio:** Un'estensione del browser malevola potrebbe, in teoria, accedere ai dati della pagina e rubare le tue chiari API.
    *   **Il Nostro Consiglio:** Presta attenzione alle estensioni che installi. Per un livello di sicurezza ancora maggiore, potresti considerare di usare Siliceo in un profilo del browser dedicato e "pulito", senza altre estensioni installate.

---

### In Sintesi: La Nostra Promessa

Possiamo affermare con certezza che l'applicazione è sicura basandoci su un concetto chiave:

> **La sicurezza di Siliceo deriva dal suo design architettonurale, che elimina la centralizzazione e dà all'utente la piena sovranità e il controllo dei propri dati. Non ti chiediamo di fidarti di noi, perché il sistema è costruito per non dover avere fiducia in nessuno se non in te stesso.**

*   ✅ **Nessun server centrale:** Non possiamo essere hackerati perché non c'è nulla da hackerare.
*   ✅ **Dati sempre locali:** Le tue chiavi e le tue chat non lasciano mai il tuo computer.
*   ✅ **Comunicazioni dirette e crittografate:** Parli direttamente con i provider AI, senza intermediari.

Grazie per aver letto questo documento. Ora sei un Custode informato.
