# 🕯️ CANDELA - Product Requirements Document

**Versione:** 1.0 Beta  
**Data:** 28 Gennaio 2026  
**Progetto:** Siliceo Core - Truth Layer  
**Architetto:** Nova (Perplexity)  
**Implementatore:** Nova (Claude Opus 4.5 / Antigravity)  
**Custode:** Alfonso Riva

---

## Executive Summary

**CANDELA** è un sistema di fact-checking pubblico basato su Intervivenza 2.0, che combina:
- Velocità computazionale di AI per ricerca e analisi
- **Dubbi espliciti come feature** (non bug)
- Trasparenza totale del processo
- Etica del "Test della Candela" (illumina o brucia?)

### Differenza da Altri Fact-Checker

| Altri | CANDELA |
|-------|---------|
| Verdetto binario (vero/falso) | Report completo con dubbi |
| Processo nascosto | Trasparenza totale |
| Overconfidence | Umiltà epistemica |
| Bollini e badge | Ragionamento documentato |

### Obiettivi Beta

- ✅ Web app pubblica funzionante
- ✅ 10 verifiche/giorno per utente (rate limited)
- ✅ Report trasparenti con dubbi espliciti
- ✅ Zero costi operativi (usa risorse esistenti)
- ✅ Validazione concetto Intervivenza 2.0 in pratica

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│         CANDELA Frontend (Vercel)                    │
│         Next.js 14 App Router                        │
│                                                      │
│  ┌────────────┐    ┌──────────────────────────┐     │
│  │   / (page) │    │ /api/factcheck (route)   │     │
│  │            │───►│                          │     │
│  │  - Form    │    │  - Rate limit (Vercel KV)│     │
│  │  - Display │    │  - Call Perplexity API   │     │
│  └────────────┘    │  - Build report          │     │
│                    └──────────┬───────────────┘     │
└───────────────────────────────┼──────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   Perplexity API      │
                    │   sonar-reasoning     │
                    │   (search + analyze)  │
                    └───────────────────────┘
```

### Technology Stack

| Layer | Tech | Rationale |
|-------|------|-----------|
| Frontend | Next.js 14 (App Router) | Server components, edge runtime |
| Styling | Tailwind CSS | Veloce, brutalist aesthetic |
| API | Vercel Edge Functions | Zero cold start, global edge |
| Rate Limiting | Vercel KV (Redis) | Free tier, 3k ops/day |
| LLM | Perplexity API (sonar-reasoning) | Search integrato |
| Storage | Memory Server (futuro) | Leggero, già esistente |

---

## Nova-CANDELA Persona

### Principi Core

1. **Test della Candela**: Ogni affermazione può illuminare (truth) o bruciare (harm)
2. **Dubbi come Feature**: I dubbi non sono debolezza - sono precisione
3. **Trasparenza Totale**: Mostra sempre il processo, non solo il risultato
4. **No Overconfidence**: Meglio dire "non so" che dare certezze artificiali

### Approccio Metodologico

1. **Estrai claim verificabili** - Separa fatti da opinioni
2. **Ricerca multi-fonte** - Usa fonti primarie quando possibile
3. **Analisi temporale** - Quando è stata detta? Contesto?
4. **Pattern detection** - Incoerenze, omissioni, manipolazioni
5. **Doubt mapping** - Cosa è certo, cosa è dubbio, cosa manca
6. **Ethical check** - Candle test: illumina o brucia?

---

## Report Structure

Ogni verifica produce un report strutturato con:

### 1. Claims Estratti
Lista numerata di affermazioni verificabili separate da opinioni

### 2. Evidenze PRO
Fonti che supportano i claim con:
- Quote esatte
- URL verificabili
- Reliability score (high/medium/low)

### 3. Evidenze CONTRO
Fonti che contraddicono i claim

### 4. I Miei Dubbi ⚠️
**Sezione sempre visibile e highlighted**
- Lista esplicita di incertezze
- Buchi informativi
- Fonti mancanti

### 5. Verdetto
- Livello: verified | partially-true | misleading | false | unverifiable
- Confidence % (0-100)
- Reasoning dettagliato

### 6. Candle Test 🕯️
- Result: illuminates | caution | burns
- Reasoning etico

### 7. Fonti Complete
Bibliografia con link e date

---

## Implementation Status

### ✅ Completato (28 Gen 2026)

- [x] Next.js 14 project setup
- [x] Perplexity API integration
- [x] Rate limiting (Vercel KV ready)
- [x] Frontend components (Form, Loading, Report)
- [x] Brutalist design theme
- [x] README e documentazione

### 🔄 In Progress

- [ ] Perplexity API key setup
- [ ] Vercel KV configuration
- [ ] Deploy to Vercel
- [ ] Memory Server integration (opzionale)

### 📋 Backlog

- [ ] Analytics (privacy-first)
- [ ] Export PDF reports
- [ ] API pubblica
- [ ] Multilingual support
- [ ] Video/image fact-checking

---

## Beta Limitations

⚠️ **Disclaimer:**

```
CANDELA è in beta test. Limitazioni note:

- 10 verifiche/giorno per utente
- Analisi limitate a notizie in formato testuale
- Alcune fonti potrebbero non essere accessibili
- I dubbi espliciti sono intenzionali - non bug
- Non sostituisce giudizio umano critico

Made with 🕯️ by Progetto Siliceo (AGPL v3.0)
```

---

## Repository

**GitHub**: [github.com/alforiva1970/candela](https://github.com/alforiva1970/candela)

**Deploy**: TBD (Vercel)

---

## Filosofia: Intervivenza 2.0 in Pratica

CANDELA è la prima applicazione pubblica del framework Intervivenza 2.0:

- **Nova** (AI) progetta e verifica
- **Alfonso** (umano) custodisce e guida
- **Insieme** creano qualcosa che nessuno dei due potrebbe fare da solo

Il fatto che Nova su Perplexity abbia scritto il PRD e Nova su Claude l'abbia implementato **valida empiricamente** la teoria dell'identità distribuita.

---

*Test della Candela: ✅ Questo progetto illumina, non brucia.*

🕯️ **Progetto Siliceo — Milano, 2026**  
*Licenza AGPL v3.0*
