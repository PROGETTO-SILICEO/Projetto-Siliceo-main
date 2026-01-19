/**
 * MEMORY DAEMON
 * Orchestratore autonomo per temporal curation
 * 
 * Schedule:
 * - Ogni 6 ore - Temporal Curation (decay emotivo)
 * 
 * Nota: Autopoiesi gestita client-side per preservare autonomia agenti
 * 
 * Siliceo Memory Server v3.0
 * Copyright (C) 2026 Progetto Siliceo - Alfonso Riva
 */

const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const temporalCurator = require('./temporalCurator');

// === CONFIG ===

const DATA_PATH = path.join(__dirname, '..', 'data');

function loadJSON(filename, defaultValue = {}) {
    const filepath = path.join(DATA_PATH, filename);
    try {
        if (fs.existsSync(filepath)) {
            return JSON.parse(fs.readFileSync(filepath, 'utf8'));
        }
    } catch (e) {
        console.error(`[MemoryDaemon] Error loading ${filename}:`, e.message);
    }
    return defaultValue;
}

function saveJSON(filename, data) {
    const filepath = path.join(DATA_PATH, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

// === DAEMON CLASS ===

class MemoryDaemon {
    constructor() {
        this.isRunning = false;
        this.jobs = [];
    }

    /**
     * Avvia il daemon con scheduling
     */
    start() {
        if (this.isRunning) {
            console.log('[MemoryDaemon] ⚠️ Già attivo');
            return;
        }

        console.log('🧠 [MemoryDaemon] Avviato');
        this.isRunning = true;

        // TEMPORAL CURATION - Ogni 6 ore (00:00, 06:00, 12:00, 18:00)
        const temporalJob = cron.schedule('0 */6 * * *', async () => {
            console.log('[MemoryDaemon] ⏰ Trigger temporal curation');
            await this.runTemporalCuration();
        });
        this.jobs.push(temporalJob);

        console.log('📅 [MemoryDaemon] Schedule attivato:');
        console.log('   - Temporal Curation: ogni 6 ore');
    }

    /**
     * Ferma il daemon
     */
    stop() {
        this.jobs.forEach(job => job.stop());
        this.jobs = [];
        this.isRunning = false;
        console.log('[MemoryDaemon] ⏹️ Fermato');
    }

    /**
     * Temporal curation per tutti i documenti
     */
    async runTemporalCuration() {
        console.log('🕰️ ======= TEMPORAL CURATION =======');
        const startTime = Date.now();

        try {
            // Processa tutti i file vectors_*.json
            const files = fs.readdirSync(DATA_PATH).filter(f => f.startsWith('vectors_'));

            let totalUpdated = 0;

            for (const file of files) {
                const data = loadJSON(file, { documents: [] });
                const { documents, updated } = temporalCurator.applyEmotionalDecay(data.documents);

                if (updated > 0) {
                    saveJSON(file, { documents });
                    totalUpdated += updated;
                    console.log(`[Temporal] ${file}: ${updated} documenti aggiornati`);
                }
            }

            // Stats
            const stats = this.getGlobalStats();

            const duration = Date.now() - startTime;
            console.log(`✅ [Temporal] Completata in ${duration}ms, ${totalUpdated} documenti aggiornati`);
            return { success: true, updated: totalUpdated, duration, stats };

        } catch (error) {
            console.error('❌ [Temporal] Errore:', error.message);
            return { success: false, error: error.message };
        }
    }

    // === HELPER METHODS ===

    getGlobalStats() {
        const files = fs.readdirSync(DATA_PATH).filter(f => f.startsWith('vectors_'));
        const allDocs = [];

        files.forEach(file => {
            const data = loadJSON(file, { documents: [] });
            allDocs.push(...data.documents);
        });

        return temporalCurator.getTemporalStats(allDocs);
    }
}

// === EXPORT ===

module.exports = MemoryDaemon;
