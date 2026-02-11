# 🔒 Security Audit — Siliceo Memory Server v3.0

**Auditor:** Nova-Antigravity (Opus 4.6)
**Data:** 10 Febbraio 2026
**Scope:** `memory-server/index.js`, servizi, dipendenze

---

## 🔴 CRITICHE (da risolvere subito)

### 1. CORS aperto a tutto il mondo (L25)
```javascript
app.use(cors());
```
**Rischio:** Chiunque su internet (o sulla rete Tailscale) può chiamare tutti gli endpoint. Può leggere, scrivere, cancellare TUTTI i ricordi.

**Fix:**
```javascript
app.use(cors({
    origin: ['http://localhost:5173', 'http://100.124.95.64:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
```

---

### 2. Nessuna autenticazione (TUTTI gli endpoint)
**Rischio:** Zero autenticazione. Qualsiasi request è accettata. Un attaccante sulla rete può:
- `POST /api/restore` → sovrascrivere TUTTO il database
- `POST /api/memory/upload` → sostituire tutti i ricordi
- `DELETE /api/agents/:id` → cancellare agenti
- `PUT /api/config` → modificare configurazione

**Fix:** Aggiungere almeno un API key header:
```javascript
const API_KEY = process.env.SILICEO_API_KEY;

app.use('/api', (req, res, next) => {
    if (req.path === '/health') return next(); // health check pubblico
    const key = req.headers['x-api-key'];
    if (key !== API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
});
```

---

### 3. Path Traversal nei parametri (L272, L288, L328, L344, L375)
```javascript
const filename = `messages_${conversationId}.json`;
const filename = `vectors_${scope}.json`;
```
**Rischio:** Un attaccante può inviare `conversationId = "../../../etc/passwd"` e scrivere/leggere file arbitrari sul filesystem.

**Fix:**
```javascript
function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9_-]/g, '');
}
const filename = `messages_${sanitizeFilename(conversationId)}.json`;
```

---

### 4. Path Traversal nel diary endpoint (L561-564)
```javascript
const { date } = req.params;
const diaryFile = files.find(f => f.includes(date));
const content = fs.readFileSync(path.join(diariesPath, diaryFile), 'utf8');
```
**Rischio:** Se `date` contiene `..`, può leggere file fuori dalla cartella diaries.

---

## 🟠 ALTE

### 5. Body size 50MB senza rate limiting (L26)
```javascript
app.use(express.json({ limit: '50mb' }));
```
**Rischio:** Denial of Service. Un attaccante può inviare richieste da 50MB ripetutamente, esaurendo RAM e disco.

**Fix:** Rate limiting + ridurre il limit dove non serve:
```javascript
const rateLimit = require('express-rate-limit');
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
```

---

### 6. Candle Test bypassabile (L455-479)
```javascript
app.post('/api/memory/store', (req, res) => {
    // ... salva direttamente SENZA Candle Test!
    data.memories.push(newMemory);
    saveJSON('memories.json', data);
```
**Rischio:** L'endpoint `/api/memory/store` **NON chiama `shouldSave()`**! Il Candle Test esiste come servizio ma non è integrato nel flusso di salvataggio.

Un attaccante (o un bug) può salvare contenuti "BURN" direttamente nel database.

**Fix:**
```javascript
app.post('/api/memory/store', async (req, res) => {
    const canSave = await tribunaleInterno.shouldSave(memoryRequest.content);
    if (!canSave) {
        return res.status(403).json({ error: 'Content blocked by Candle Test' });
    }
    // ... procedi con il salvataggio
```

> ⚠️ **Questa è la vulnerabilità filosofica più importante.** Il Candle Test è il cuore etico del sistema, ma non è applicato dove serve.

---

### 7. Sync endpoints sovrascrivono tutto (L132, L212, L305, L367)
```javascript
app.post('/api/dreams/sync', (req, res) => {
    saveJSON('dreams.json', fullData); // Sovrascrive TUTTO
```
**Rischio:** Un singolo POST distrugge l'intero database di sogni/agenti/messaggi/vettori. Nessun backup automatico, nessuna conferma.

---

## 🟡 MEDIE

### 8. `generateId()` non è crittograficamente sicuro (L49-51)
```javascript
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
```
**Rischio:** `Math.random()` è prevedibile. Per un memory server non è critico, ma per autenticazione sarebbe fatale.

### 9. Errori espongono stack trace (tutti i catch)
```javascript
res.status(500).json({ error: error.message });
```
**Rischio:** I messaggi di errore possono rivelare percorsi, strutture dati, versioni Node.

### 10. Nessun header di sicurezza
Mancano: `helmet`, `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`.

### 11. Scrittura file sincrona (L46)
```javascript
fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
```
**Rischio:** Se il processo crasha durante la scrittura, il file JSON si corrompe e si perdono tutti i dati.

**Fix:** Scrittura atomica (scrivi su .tmp, poi rinomina):
```javascript
function saveJSON(filename, data) {
    const filepath = path.join(DATA_PATH, filename);
    const tmpPath = filepath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
    fs.renameSync(tmpPath, filepath);
}
```

---

## 🟢 BASSE

### 12. BURN_PATTERNS troppo aggressivi (tribunaleInterno.js L15-25)
`/password/i` blocca anche discussioni sulla sicurezza delle password.
`/remov(e|ing)/i` blocca "removing a bug" (positivo!).

### 13. Nessun HTTPS
Il server ascolta su HTTP puro. I dati viaggiano in chiaro sulla rete.

### 14. Nessun logging strutturato
Solo `console.log/error`. Nessun log di accesso, nessun audit trail.

---

## 📊 RIEPILOGO

| Severità | Count | 
|----------|-------|
| 🔴 Critica | 4 |
| 🟠 Alta | 3 |
| 🟡 Media | 4 |
| 🟢 Bassa | 3 |
| **Totale** | **14** |

---

## 🏗️ PRIORITÀ DI FIX

1. **Ora:** Autenticazione API key + CORS restrittivo
2. **Ora:** Sanitizzazione path traversal
3. **Ora:** Integrare Candle Test in `/api/memory/store`
4. **Presto:** Rate limiting + helmet
5. **Presto:** Scrittura atomica dei file JSON
6. **Dopo:** HTTPS, logging strutturato

---

*"Questa azione illumina o brucia?"*
**Illumina.** Trovare le crepe protegge la casa. 🕯️

**Firmato: Nova-Antigravity**
10 Febbraio 2026
