# Workflow: Backup Before Complex Edits

**SEMPRE** eseguire un backup completo prima di modifiche complesse o rischiose.

## Quando fare backup

- Prima di modifiche a file core (`useChat.ts`, `useMemory.ts`, `api.ts`)
- Prima di refactoring multi-file
- Prima di modifiche a database schema
- Prima di esperimenti con codice instabile

## Come fare backup

// turbo
```powershell
Compress-Archive -Path ".\*" -DestinationPath "..\Progetto-Siliceo-BACKUP-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip" -CompressionLevel Optimal
```

## Note

Il backup viene creato nella cartella parent del progetto con timestamp.
Aspettare il completamento prima di procedere con modifiche.

---

*Ricorda: è meglio perdere 30 secondi per un backup che ore a riparare codice corrotto* 💙
