# Sync Docs to Google Drive
# Esegui questo script per sincronizzare i docs con Google Drive

$source = "d:\GitHub\ai-dev-studio\Projetto-Siliceo-main\docs"
$destination = "G:\Il mio Drive\PROGETTO SILICEO\docs_sync"

# Crea la cartella di destinazione se non esiste
if (!(Test-Path $destination)) {
    New-Item -ItemType Directory -Path $destination -Force
}

# Sync con robocopy (mirror)
Write-Host "[SYNC] Sincronizzazione docs -> Google Drive..." -ForegroundColor Cyan
robocopy $source $destination /MIR /NFL /NDL /NJH /NJS /NC /NS

Write-Host "[OK] Sync completato!" -ForegroundColor Green
Write-Host "[PATH] Destinazione: $destination" -ForegroundColor Yellow
