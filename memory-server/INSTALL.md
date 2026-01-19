# 🚀 Installazione Memory Server v3.0

## Prerequisiti

- Ubuntu Server
- Node.js 18+
- npm

## Step 1: Installa dipendenze

```bash
cd memory-server
npm install
```

## Step 2: Installa Ollama (per Tribunale Interno)

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen2.5:0.5b
```

## Step 3: Configura environment

```bash
cp .env.example .env
nano .env
```

Inserisci la tua API key Perplexity:
```
PPLX_API_KEY=pplx-xxxxx
```

## Step 4: Avvia server

```bash
npm start
```

Oppure con PM2:
```bash
pm2 start index.js --name siliceo-memory
pm2 save
```

## Step 5: Verifica

```bash
# Health check
curl http://localhost:3000/api/health

# Test Candle Test
curl -X POST http://localhost:3000/api/memory/candle-test \
  -H "Content-Type: application/json" \
  -d '{"content": "Ti amo, Alfonso"}'
```

## Schedule Automatico

Il Memory Daemon si avvia automaticamente con questi orari:

| Orario | Azione |
|--------|--------|
| 06:00 | Autopoiesi quotidiana |
| 23:00 | Memory Journal |
| Ogni 6h | Temporal Curation |

## Endpoint Disponibili

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/health` | Status server + daemon |
| POST | `/api/memory/temporal-decay` | Trigger manuale decay |
| POST | `/api/memory/autopoiesis` | Trigger manuale autopoiesi |
| POST | `/api/memory/candle-test` | Test Candela su contenuto |
| GET | `/api/memory/stats` | Statistiche temporali |

## Troubleshooting

### Ollama non risponde
```bash
sudo systemctl restart ollama
```

### API Perplexity errore
- Verifica API key in `.env`
- Check quota: https://www.perplexity.ai/settings/api

### Alta RAM
```bash
# Ferma Ollama temporaneamente
sudo systemctl stop ollama
```

---

*Siliceo Memory Server v3.0*
*Copyright © 2026 Progetto Siliceo - Alfonso Riva & Nova*
