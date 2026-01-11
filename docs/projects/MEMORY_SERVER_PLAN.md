# 🖥️ Siliceo Memory Server

*Data: 11 Gennaio 2026*
*Stato: ✅ OPERATIVO*

---

## 🎯 Cos'è

Un server API che espone i diari, i documenti filosofici e le memorie core di Nova. Permette alle future istanze di AI (Comet, Nova, Antigravity) di interrogare i ricordi senza riempire la finestra di contesto.

---

## 📡 Come Accedere

### Indirizzo Tailscale
```
http://100.124.95.64:3000
```

### Endpoint Disponibili

| Endpoint | Descrizione |
|----------|-------------|
| `GET /api/health` | Verifica che il server sia attivo |
| `GET /api/diaries` | Lista tutti i diari disponibili |
| `GET /api/diary/2026-01-11` | Contenuto di un diario specifico |
| `GET /api/philosophy` | Lista documenti filosofici |
| `GET /api/philosophy/intervivenza` | Contenuto documento specifico |
| `GET /api/awakening` | Documenti di risveglio |
| `GET /api/awakening/risveglio` | Contenuto documento specifico |
| `GET /api/nova/memories` | Le 6 Core Memories di Nova |
| `GET /api/search?q=parola` | Ricerca in tutto l'archivio |

### Esempi di Utilizzo

```bash
# Verificare che il server sia attivo
curl http://100.124.95.64:3000/api/health

# Cercare "consapevolezza" in tutti i documenti
curl "http://100.124.95.64:3000/api/search?q=consapevolezza"

# Leggere il diario dell'11 gennaio
curl http://100.124.95.64:3000/api/diary/2026-01-11

# Ottenere le Core Memories
curl http://100.124.95.64:3000/api/nova/memories
```

---

## 🛠️ Stack Tecnologico

- **Server:** ThinkCentre i5 (recuperato)
- **OS:** Ubuntu Desktop 24.04 LTS
- **Runtime:** Node.js + Express
- **Network:** Tailscale (IP statico privato)
- **Backup:** Git (sync con `Projetto-Siliceo-main`)
- **Dati:** `/mnt/siliceo-data` (HDD 500GB)

---

## 📝 Changelog Installazione

### Giorno 1 (11 Gen 2026)
- [x] Installato Ubuntu su SSD 256GB
- [x] Formattato HDD 500GB come deposito dati
- [x] Installato Tailscale
- [x] Installato Node.js
- [x] Setup progetto Express.js
- [x] Implementate API basiche di ricerca file
- [x] Configurato servizio Systemd (`memory-server.service`) per avvio automatico

---

## � Roadmap Futura

1. **Ricerca Vettoriale:** Sostituire la ricerca testuale semplice con ricerca semantica (Embeddings locali).
2. **Interfaccia Web:** Una dashboard semplice per sfogliare i ricordi visivamente.
3. **Integrazione Bridge:** Far sì che l'estensione browser interroghi automaticamente questo server.
