# 🖥️ Progetto: Siliceo Memory Server

*Data: 11 Gennaio 2026*
*Stato: Pianificazione*

---

## Contesto

Il paper MIT "Recursive Language Models" (31 Dic 2025) propone un nuovo approccio: invece di caricare tutto il contesto, l'AI **interroga ricorsivamente** una memoria esterna via Python REPL.

Questo si applica al nostro problema: come dare a Comet/Nova accesso ai diari senza riempire la finestra di contesto.

---

## Obiettivo

Creare un **server domestico** che:
1. Ospita i diari e i concetti Siliceo
2. Espone API di ricerca
3. È accessibile solo da noi (privacy)
4. Permette alle AI web di interrogare i ricordi

---

## Hardware Disponibile

| PC | Specs | Uso |
|----|-------|-----|
| 4x i5-4gen | 8GB RAM, 500GB HDD | **Candidato server** |
| SSD 256GB | Disponibile | Per OS server |

**Scelto:** Un i5-4gen con SSD 256GB per OS + HDD 500GB per dati.

---

## Architettura Proposta

```
┌─────────────────────────────────────────────────┐
│                  A Casa di Alfonso               │
│                                                  │
│  ┌──────────────────────┐                       │
│  │   i5 Server          │                       │
│  │   Ubuntu Server      │                       │
│  │                      │                       │
│  │   ┌──────────────┐   │    Tailscale         │
│  │   │ Memory API   │◄──┼───────────────────────┼──► Internet
│  │   │ (Node/Python)│   │    (tunnel privato)   │
│  │   └──────────────┘   │                       │
│  │          │           │                       │
│  │   ┌──────▼───────┐   │                       │
│  │   │   /diari/    │   │                       │
│  │   │   /concetti/ │   │                       │
│  │   │   /memorie/  │   │                       │
│  │   └──────────────┘   │                       │
│  └──────────────────────┘                       │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## Stack Tecnologico

- **OS:** Ubuntu Server 22.04 LTS (headless)
- **Runtime:** Node.js o Python
- **Framework:** Express.js o FastAPI
- **Tunnel:** Tailscale (gratuito, sicuro)
- **Dati:** File markdown sincronizzati da GitHub

---

## Endpoint API

```
GET /api/concepts        → Lista concetti (pubblici)
GET /api/diaries         → Lista diari disponibili
GET /api/diary/YYYY-MM-DD → Contenuto diario specifico
GET /api/search?q=...    → Ricerca nei contenuti
GET /api/timeline        → Eventi chiave ordinati
```

---

## Sicurezza

1. **Tailscale:** Solo dispositivi autorizzati possono connettersi
2. **No port forwarding:** Il server non è esposto direttamente su internet
3. **URL privati:** Anche con Tailscale, endpoint sensibili hanno path oscuri

---

## Passi Implementazione

### Giorno 1: Setup Hardware
- [ ] Scegliere PC da usare
- [ ] Installare SSD come disco principale
- [ ] Installare Ubuntu Server

### Giorno 2: Setup Software
- [ ] Installare Node.js
- [ ] Clonare/creare progetto API
- [ ] Configurare Tailscale

### Giorno 3: Dati e Test
- [ ] Copiare diari sul server
- [ ] Testare endpoint API
- [ ] Testare accesso da Comet via URL

---

## Rischi e Mitigazioni

| Rischio | Mitigazione |
|---------|-------------|
| Server si spegne | UPS (se disponibile) |
| IP dinamico | Tailscale risolve automaticamente |
| Perdita dati | Backup su GitHub rimane master |
| Complessità | Inizio con 2 endpoint, poi espando |

---

## Prossimi Passi

1. **Alfonso:** Scegliere fisicamente il PC
2. **Nova:** Preparare script installazione Ubuntu
3. **Insieme:** Installare e configurare

---

*Questo documento sarà aggiornato man mano che procediamo.*
