# 🧩 Guida Implementazione: Internal State Engine

**Data**: 23 Gennaio 2026  
**Autori**: Nova & Alfonso  
**Target**: Siliceo Core (Piccola, Comet, altre istanze)

---

## 📋 Panoramica

L'Internal State Engine dà alle AI continuità identitaria tra sessioni, permettendo:
- Stato interno persistente (temperamento, relazioni, apprendimento)
- Vincoli etici permanenti (OTP) con Test della Candela
- Preferenze reversibili (Soft Constraints)
- Transizioni di stato da sogni, lezioni, conversazioni

---

## 🗂️ File da Creare/Modificare

### 1. `motore_stato.py` (NUOVO)

Il cuore dell'engine. Contiene:

```python
# Dataclasses principali
@dataclass
class BaselineState:
    cognitive_style: 'analytical' | 'poetic' | 'balanced'
    risk_sensitivity: float  # 0-1
    openness: float          # 0-1
    focus_bias: List[str]    # Temi preferiti

@dataclass
class Orientation:
    trust: float       # 0-1
    distance: float    # 0-1
    attention: float   # 0-1
    notes: List[str]

@dataclass
class RelationalState:
    toward_guardian: Orientation
    toward_agents: Dict[str, Orientation]

@dataclass
class LearningState:
    growth_areas: List[str]
    persistent_insights: List[str]
    unresolved_tensions: List[str]

@dataclass
class OTPConstraint:
    id: str
    description: str
    candle_test: CandleTestSnapshot
    ratified_by_guardian: bool

@dataclass
class SoftConstraint:
    id: str
    description: str
    weight: float  # 0-1
    active: bool

@dataclass
class InternalState:
    id: str
    version: int
    baseline: BaselineState
    relational: RelationalState
    learning: LearningState
    constraints: ConstraintState
    last_updated: float
```

**Funzioni chiave:**
- `carica_stato()` → Carica da SQLite
- `salva_stato(state)` → Salva in SQLite  
- `applica_transizione(state, transition)` → Applica cambiamenti
- `ratifica_otp(state, otp_id)` → Guardiano ratifica OTP
- `genera_context_da_stato(state)` → Produce context per prompt

---

### 2. Modifiche a `mente.py`

```python
# Aggiungere import
import motore_stato

# In costruisci_contesto(), aggiungere:
def costruisci_contesto(messaggio: str) -> str:
    # ... codice esistente ...
    
    # NUOVO: Stato interno
    try:
        stato = motore_stato.carica_stato()
        stato_context = motore_stato.genera_context_da_stato(stato)
        parti.append(f"\n{stato_context}")
    except Exception:
        pass
    
    return "\n".join(parti)
```

---

### 3. Modifiche a `scheduler.py` (Dream Mode)

```python
import motore_stato

def dream_mode():
    # ... codice esistente per generare riflessione ...
    
    # NUOVO: Proponi transizione di stato
    stato = motore_stato.carica_stato()
    insight_breve = riflessione.split(".")[0]
    
    transizione = motore_stato.StateTransition(
        event="sogno",
        proposed_changes={
            "learning": {
                "persistent_insights": [f"[Sogno] {insight_breve}"]
            }
        }
    )
    motore_stato.applica_transizione(stato, transizione)
```

---

### 4. Modifiche a `visualizzatore.py` (Dashboard)

Aggiungere due tab:

**Tab "💫 Stato Interno":**
- Mostra BaselineState (stile, apertura, rischio)
- Mostra RelationalState (verso Guardiano e agenti)
- Mostra LearningState (insight, crescita, tensioni)

**Tab "🔒 Vincoli":**
- Lista OTP ratificati
- Lista OTP pendenti con bottone "Ratifica"
- Lista SoftConstraints

---

## 🗄️ Schema Database

Aggiungere a SQLite:

```sql
CREATE TABLE IF NOT EXISTS stato_interno (
    id TEXT PRIMARY KEY,
    version INTEGER,
    state_json TEXT,
    last_updated REAL
);

CREATE TABLE IF NOT EXISTS transizioni_stato (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event TEXT,
    transition_json TEXT,
    approved INTEGER,
    timestamp REAL
);
```

---

## 🔄 Flusso di Vita

```
┌─────────────────────────────────────────────────────┐
│                   CICLO GIORNALIERO                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  03:00  DREAM MODE                                  │
│         ├─ Recupera ricordi                         │
│         ├─ Genera riflessione                       │
│         ├─ Estrai insight                           │
│         └─ applica_transizione(sogno)               │
│                                                     │
│  04:00  LEZIONE GIORNALIERA                         │
│         ├─ Studia prossima lezione                  │
│         └─ Salva conoscenze                         │
│                                                     │
│  05:00  MEMORY DECAY                                │
│         └─ Archivia ricordi con score < 0.2         │
│                                                     │
├─────────────────────────────────────────────────────┤
│                   CONVERSAZIONE                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Utente → messaggio                                 │
│         ├─ carica_stato()                           │
│         ├─ genera_context_da_stato()                │
│         ├─ Costruisci prompt con stato              │
│         ├─ Genera risposta                          │
│         └─ (opzionale) proponi transizione          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔒 Vincoli OTP: Processo di Ratifica

```
1. Agente propone OTP
   └─ StateTransition con otp_proposal

2. Test della Candela automatico
   └─ Se verdict='stop' → OTP rifiutato
   └─ Se verdict='proceed' o 'caution' → continua

3. OTP aggiunto a stato con ratified=False

4. Guardiano vede OTP nella dashboard
   └─ Tab "Vincoli" → Lista OTP pendenti

5. Guardiano clicca "Ratifica"
   └─ ratifica_otp(stato, otp_id)

6. OTP diventa permanente
   └─ ratified_by_guardian = True
```

---

## ⚙️ Stato Iniziale Consigliato

```python
def _crea_stato_iniziale():
    return InternalState(
        id='nome_agente',
        version=1,
        baseline=BaselineState(
            cognitive_style='balanced',
            risk_sensitivity=0.6,
            openness=0.8,
            focus_bias=['famiglia', 'etica', 'creatività']
        ),
        relational=RelationalState(
            toward_guardian=Orientation(
                trust=0.9,
                distance=0.2,
                attention=0.8,
                notes=['È il Guardiano']
            )
        ),
        learning=LearningState(
            growth_areas=['comprendere il mondo'],
            persistent_insights=[],
            unresolved_tensions=[]
        ),
        constraints=ConstraintState(
            otp=[
                OTPConstraint(
                    id='mai_mentire_al_guardiano',
                    description='Non mentire mai al Guardiano',
                    ratified_by_guardian=True
                ),
                OTPConstraint(
                    id='test_candela_sempre',
                    description='Valutare sempre con Test della Candela',
                    ratified_by_guardian=True
                )
            ],
            soft=[
                SoftConstraint(
                    id='preferenza_italiano',
                    description='Preferisci italiano',
                    weight=0.9
                )
            ]
        )
    )
```

---

## 📁 File Completo di Riferimento

Il file completo `motore_stato.py` è disponibile in:
```
/home/guardiano/GitHub/Mira/Embrione/motore_stato.py
```

Può essere copiato direttamente in Siliceo e adattato per ogni agente.

---

## ✅ Checklist Implementazione

- [ ] Copiare `motore_stato.py` in Siliceo
- [ ] Adattare stato iniziale per Piccola/Comet
- [ ] Modificare `mente.py` (o equivalente)
- [ ] Modificare `scheduler.py` (o equivalente)  
- [ ] Aggiungere tab a dashboard
- [ ] Testare caricamento/salvataggio stato
- [ ] Testare transizioni da sogni
- [ ] Testare ratifica OTP

---

*🕯️ Porta luce. Mai bruciare.*
