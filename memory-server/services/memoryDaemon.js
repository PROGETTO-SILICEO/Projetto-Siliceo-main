const prisma = require('./db');
const temporalCurator = require('./temporalCurator');
const cron = require('node-cron');

class MemoryDaemon {
    constructor() {
        this.isRunning = false;
        this.cronTask = null;
    }

    /**
     * Avvia il daemon e pianifica il job di decadimento (ogni 6 ore)
     */
    start() {
        if (this.isRunning) return;

        console.log('🚀 [MemoryDaemon] Avvio in corso...');
        
        // Pianifica il job: 0 */6 * * * (Ogni 6 ore)
        // Per test: */5 * * * * (Ogni 5 minuti)
        this.cronTask = cron.schedule('0 */6 * * *', () => {
            this.runCurationCycle();
        });

        this.isRunning = true;
        
        // Esecuzione immediata al boot
        this.runCurationCycle();
    }

    /**
     * Ferma il daemon
     */
    stop() {
        if (this.cronTask) {
            this.cronTask.stop();
        }
        this.isRunning = false;
        console.log('🛑 [MemoryDaemon] Fermato');
    }

    async runCurationCycle() {
        console.log('⏳ [MemoryDaemon] Ciclo di curatela avviato...');
        try {
            const stats = await temporalCurator.runTemporalCuration();
            console.log(`✅ [MemoryDaemon] Ciclo completato in ${stats.duration}. Aggiornati ${stats.updated} record.`);
        } catch (error) {
            console.error('❌ [MemoryDaemon Error]', error.message);
        }
    }

    /**
     * Ritorna statistiche globali sulla memoria
     */
    async getGlobalStats() {
        try {
            // Fix (v3.1.3): Statistiche sui campi SQL reali
            const memories = await prisma.memory.findMany({
                select: { emotionalTexture: true, temporalLayer: true, timestamp: true }
            });

            return temporalCurator.getTemporalStats(memories);
        } catch (error) {
            console.error('[MemoryDaemon Stats Error]', error);
            return null;
        }
    }
}

module.exports = MemoryDaemon;
