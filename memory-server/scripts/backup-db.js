const fs = require('fs');
const path = require('path');

const PRISMA_DIR = path.join(__dirname, '..', 'prisma');
const DB_FILE = path.join(PRISMA_DIR, 'dev.db');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

function backupDatabase() {
    if (!fs.existsSync(DB_FILE)) {
        console.error('❌ Database file not found at:', DB_FILE);
        process.exit(1);
    }

    if (!fs.existsSync(BACKUP_DIR)) {
        console.log('📁 Creazione directory di backup...');
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `dev_backup_${timestamp}.db`;
    const backupFilePath = path.join(BACKUP_DIR, backupFileName);

    try {
        console.log(`⏳ Copia di dev.db in ${backupFilePath}...`);
        fs.copyFileSync(DB_FILE, backupFilePath);
        console.log(`✅ Backup completato con successo: ${backupFileName}`);
        
        // Pulisce backup più vecchi di 7 giorni per non intasare l'hard disk
        cleanOldBackups();
    } catch (error) {
        console.error('❌ Errore durante il backup del database:', error.message);
        process.exit(1);
    }
}

function cleanOldBackups() {
    const files = fs.readdirSync(BACKUP_DIR);
    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    
    let deleted = 0;
    for (const file of files) {
        if (file.startsWith('dev_backup_') && file.endsWith('.db')) {
            const filePath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > SEVEN_DAYS) {
                fs.unlinkSync(filePath);
                deleted++;
            }
        }
    }
    if (deleted > 0) {
        console.log(`🧹 Rimosse ${deleted} copie di backup più vecchie di 7 giorni.`);
    }
}

backupDatabase();
