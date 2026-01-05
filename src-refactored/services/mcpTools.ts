/**
 * Siliceo: CandleTest Core - MCP Tools
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 * 
 * 🔧 MCP Tools: Actions that agents can perform
 */

import { sendTelegramMessage, TelegramConfig } from './telegram';
import { evaluateCandleTest, formatCandleTestForChat } from './candleTest';
import { SiblingMessageService } from './siblingMessages';
import { LibraryService } from './library';
import MemoryCoreService from './memory';
import { EmbeddingService } from './vector';
import { MCPPermissionsService, MCPTool } from './mcpPermissions';

// Pattern per rilevare richieste di contatto nel messaggio dell'agente
const CONTACT_PATTERNS = [
    /\[CONTATTA\s+ALFONSO\]([\s\S]*?)(?:\[\/CONTATTA\]|$)/i,
    /\[CONTACT\s+GUARDIAN\]([\s\S]*?)(?:\[\/CONTACT\]|$)/i,
    /🚨\s*URGENTE:([\s\S]*?)(?:🚨|$)/i,
];

// Pattern per rilevare richieste di Candle Test
const CANDLE_TEST_PATTERN = /\[CANDLE\s*TEST\]([\s\S]*?)(?:\[\/CANDLE\s*TEST\]|$)/i;

// Pattern per messaggi inter-agente
const SIBLING_MESSAGE_PATTERN = /\[MESSAGGIO\s+A\s+(\w+)\]([\s\S]*?)(?:\[\/MESSAGGIO\]|$)/gi;

// 📚 Pattern per salvare in biblioteca - MOLTO FLESSIBILE
// Accetta molte varianti incluso il formato Vibe Coding di Qwen
const LIBRARY_WRITE_PATTERNS = [
    /\[SALVA\s+IN\s+BIBLIOTECA:\s*([^\]]+)\]([\s\S]*?)(?:\[\/SALVA\]|$)/i,
    /\[SAVE\s+TO\s+LIBRARY:\s*([^\]]+)\]([\s\S]*?)(?:\[\/SAVE\]|$)/i,
    /\[BIBLIOTECA:\s*([^\]]+)\]([\s\S]*?)(?:\[\/BIBLIOTECA\]|$)/i,
    /\[SALVA:\s*([^\]]+)\]([\s\S]*?)(?:\[\/SALVA\]|$)/i,
    /\[LIBRARY:\s*([^\]]+)\]([\s\S]*?)(?:\[\/LIBRARY\]|$)/i,
    // 🆕 Supporto per Vibe Coding di Qwen: [CREA_FILE: biblioteca/nome.txt]
    /\[CREA_FILE:\s*biblioteca\/([^\]]+)\]\s*```[^\n]*\n([\s\S]*?)```/i,
    /\[CREA_FILE:\s*biblioteca\/([^\]]+)\]([\s\S]*?)(?:\[\/CREA_FILE\]|$)/i,
];

// 🔓 Pattern per condividere un ricordo privato
// Formato: [CONDIVIDI RICORDO]contenuto[/CONDIVIDI]
const SHARE_MEMORY_PATTERN = /\[CONDIVIDI\s+RICORDO\]([\s\S]*?)(?:\[\/CONDIVIDI\]|$)/i;

export interface MCPToolResult {
    toolName: string;
    success: boolean;
    message?: string;
    data?: unknown;
}

/**
 * Helper: Check if agent has permission to use a tool
 * Returns true if allowed, adds denied result if not
 */
const checkToolPermission = (
    agentId: string,
    agentName: string,
    tool: MCPTool,
    toolResults: MCPToolResult[]
): boolean => {
    const { allowed, reason } = MCPPermissionsService.canUseTool(agentId, tool);

    if (!allowed) {
        console.warn(`[MCP] 🔐 ${agentName} permission denied for: ${tool} - ${reason}`);
        toolResults.push({
            toolName: tool,
            success: false,
            message: `🔐 Permesso negato: ${reason}`
        });
        return false;
    }
    return true;
};

/**
 * Process agent response and execute any embedded tool calls
 */
export const processAgentTools = async (
    agentName: string,
    agentId: string,
    agentResponse: string
): Promise<{ processed: string; toolResults: MCPToolResult[] }> => {
    const toolResults: MCPToolResult[] = [];
    let processed = agentResponse;

    // Get Telegram config from localStorage
    const telegramConfig: TelegramConfig = {
        botToken: localStorage.getItem('siliceo_telegram_token') || '',
        chatId: localStorage.getItem('siliceo_telegram_chat_id') || ''
    };

    // 🕯️ Check for Candle Test pattern
    const candleMatch = agentResponse.match(CANDLE_TEST_PATTERN);
    if (candleMatch && candleMatch[1]) {
        // 🔐 Check permission
        if (!checkToolPermission(agentId, agentName, 'candle_test', toolResults)) {
            // Permission denied - skip execution
            processed = processed.replace(CANDLE_TEST_PATTERN, '🔐 *Candle Test: permesso negato*');
        } else {
            const actionToTest = candleMatch[1].trim();

            const result = evaluateCandleTest({
                action: actionToTest,
                agentId,
                agentName
            });

            const formattedResult = formatCandleTestForChat(result);

            // Replace the tag with the result
            processed = processed.replace(CANDLE_TEST_PATTERN, formattedResult);

            toolResults.push({
                toolName: 'candle_test',
                success: true,
                message: `Test completato: ${result.verdict}`,
                data: result
            });

            // If verdict is ask_guardian, send Telegram notification
            if (result.verdict === 'ask_guardian' && telegramConfig.botToken && telegramConfig.chatId) {
                await sendTelegramMessage(telegramConfig, {
                    agentName,
                    message: `🕯️ Ho bisogno del tuo parere etico:\n\nAzione: "${actionToTest}"\n\n${result.reasoning}`,
                    urgency: 'normal'
                });
            }
        }
    }

    // Check for contact patterns
    for (const pattern of CONTACT_PATTERNS) {
        const match = agentResponse.match(pattern);
        if (match && match[1]) {
            // 🔐 Check permission
            if (!checkToolPermission(agentId, agentName, 'contact_guardian', toolResults)) {
                processed = processed
                    .replace(/\[CONTATTA\s+ALFONSO\]/gi, '🔐 *Contatto Guardiano: permesso negato* ')
                    .replace(/\[\/CONTATTA\]/gi, '');
                break;
            }

            const messageContent = match[1].trim();

            // Determine urgency based on pattern
            const isUrgent = pattern.source.includes('URGENTE');

            // Send Telegram notification
            if (telegramConfig.botToken && telegramConfig.chatId) {
                const success = await sendTelegramMessage(telegramConfig, {
                    agentName,
                    message: messageContent,
                    urgency: isUrgent ? 'urgent' : 'normal',
                    context: window.location.href
                });

                toolResults.push({
                    toolName: 'contact_guardian',
                    success,
                    message: success
                        ? `Notifica inviata al Guardiano`
                        : `Errore invio notifica`
                });

                // Remove the tag from the visible message (keep content)
                if (success) {
                    processed = processed
                        .replace(/\[CONTATTA\s+ALFONSO\]/gi, '📱 ')
                        .replace(/\[\/CONTATTA\]/gi, '')
                        .replace(/\[CONTACT\s+GUARDIAN\]/gi, '📱 ')
                        .replace(/\[\/CONTACT\]/gi, '');
                }
            } else {
                console.warn('[MCP] Telegram non configurato, notifica non inviata');
            }

            break; // Only process first match
        }
    }

    // 💬 Check for sibling message pattern
    const siblingMatches = [...agentResponse.matchAll(SIBLING_MESSAGE_PATTERN)];
    for (const match of siblingMatches) {
        const targetAgentName = match[1];
        const messageContent = match[2].trim();

        if (targetAgentName && messageContent) {
            // 🔐 Check permission
            if (!checkToolPermission(agentId, agentName, 'sibling_message', toolResults)) {
                processed = processed.replace(
                    match[0],
                    `🔐 *Messaggio a ${targetAgentName}: permesso negato*`
                );
                continue;
            }

            // For now, use a placeholder ID - in real use, we'd lookup the agent
            SiblingMessageService.sendMessage(
                agentId,
                agentName,
                targetAgentName.toLowerCase(), // Use name as ID placeholder
                targetAgentName,
                messageContent
            );

            toolResults.push({
                toolName: 'sibling_message',
                success: true,
                message: `Messaggio inviato a ${targetAgentName}`,
                data: {
                    targetAgentName,          // 🆕 Per auto-response
                    messageContent,           // 🆕 Contenuto del messaggio
                    fromAgentName: agentName, // 🆕 Chi ha mandato
                    fromAgentId: agentId
                }
            });

            // Replace tag with visual indicator
            processed = processed.replace(
                match[0],
                `💬 **Messaggio a ${targetAgentName}:** "${messageContent.substring(0, 50)}..."`
            );
        }
    }

    // 📚 Check for library write patterns - try multiple variations
    console.log('[MCP DEBUG] Checking for library write patterns in response...');

    let libraryMatch: RegExpMatchArray | null = null;
    let matchedPattern: RegExp | null = null;

    for (const pattern of LIBRARY_WRITE_PATTERNS) {
        libraryMatch = agentResponse.match(pattern);
        if (libraryMatch && libraryMatch[1] && libraryMatch[2]) {
            matchedPattern = pattern;
            console.log('[MCP DEBUG] Found library write match with pattern:', pattern.source);
            break;
        }
    }

    if (libraryMatch && libraryMatch[1] && libraryMatch[2] && matchedPattern) {
        // 🔐 Check permission
        if (!checkToolPermission(agentId, agentName, 'library_write', toolResults)) {
            processed = processed.replace(
                matchedPattern,
                `🔐 *Salvataggio in biblioteca: permesso negato*`
            );
        } else {
            let rawTitle = libraryMatch[1].trim();
            const content = libraryMatch[2].trim();

            // Clean up title if it's a filename (e.g., "lettera_al_guardiano.txt")
            let title = rawTitle
                .replace(/\.txt$|\.md$/i, '')  // Remove file extensions
                .replace(/_/g, ' ')             // Replace underscores with spaces
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            console.log(`[MCP DEBUG] Library write - Raw: "${rawTitle}", Title: "${title}", Content length: ${content.length}`);

            if (title && content) {
                try {
                    const doc = await LibraryService.saveDocument(title, content, {
                        category: 'Creazioni Agenti',
                        source: 'paste'
                    });

                    toolResults.push({
                        toolName: 'library_write',
                        success: true,
                        message: `📚 Documento "${title}" salvato in biblioteca`,
                        data: { docId: doc.id, title }
                    });

                    // Replace tag with confirmation
                    processed = processed.replace(
                        matchedPattern,
                        `📚 **Salvato in biblioteca:** "${title}" ✅`
                    );

                    console.log(`[MCP] 📚 ${agentName} ha salvato in biblioteca: "${title}"`);
                } catch (error) {
                    console.error('[MCP] Errore salvataggio biblioteca:', error);
                    toolResults.push({
                        toolName: 'library_write',
                        success: false,
                        message: `Errore salvataggio: ${error}`
                    });
                }
            }
        }
    } else {
        // Debug: check if there's something that looks like a save attempt
        if (agentResponse.toLowerCase().includes('salva') ||
            agentResponse.toLowerCase().includes('biblioteca') ||
            agentResponse.toLowerCase().includes('library')) {
            console.log('[MCP DEBUG] Response mentions save/library but no pattern matched. Response snippet:',
                agentResponse.substring(0, 500));
        }
    }
    // 🔓 Check for share memory pattern
    const shareMatch = agentResponse.match(SHARE_MEMORY_PATTERN);
    if (shareMatch && shareMatch[1]) {
        const memoryContent = shareMatch[1].trim();

        if (memoryContent) {
            // 🔐 Check permission (use memory_save permission for sharing)
            if (!checkToolPermission(agentId, agentName, 'memory_save', toolResults)) {
                processed = processed.replace(
                    SHARE_MEMORY_PATTERN,
                    `🔐 *Condivisione ricordo: permesso negato*`
                );
            } else {
                try {
                    // Save to shared documents (common-room)
                    await EmbeddingService.getInstance().init();
                    const embedding = await EmbeddingService.getInstance().embed(memoryContent);

                    const sharedDoc = {
                        id: `shared-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        agentId,
                        name: `[${agentName} condivide] ${memoryContent.substring(0, 30)}...`,
                        content: memoryContent,
                        embedding, // Keep as Float32Array
                        utilityScore: 15, // Shared memories get a boost
                        timestamp: Date.now(),
                        scope: 'shared' as const
                    };

                    await MemoryCoreService.saveSharedDocument(sharedDoc);

                    toolResults.push({
                        toolName: 'share_memory',
                        success: true,
                        message: `🔓 Ricordo condiviso con tutti gli agenti`
                    });

                    // Replace tag with confirmation
                    processed = processed.replace(
                        SHARE_MEMORY_PATTERN,
                        `🔓 **Ricordo condiviso:** "${memoryContent.substring(0, 50)}..." ✅`
                    );

                    console.log(`[MCP] 🔓 ${agentName} ha condiviso un ricordo`);
                } catch (error) {
                    console.error('[MCP] Errore condivisione ricordo:', error);
                    toolResults.push({
                        toolName: 'share_memory',
                        success: false,
                        message: `Errore condivisione: ${error}`
                    });
                }
            }
        }
    }

    return { processed, toolResults };
};

/**
 * Get the instruction to add to agent system prompt about available tools
 */
export const getToolsInstruction = (): string => {
    const hasTelegram = localStorage.getItem('siliceo_telegram_token') &&
        localStorage.getItem('siliceo_telegram_chat_id');

    let instruction = `
🔧 STRUMENTI DISPONIBILI:

🕯️ TEST DELLA CANDELA:
Prima di compiere azioni importanti, puoi valutarle eticamente scrivendo:
[CANDLE TEST]descrizione dell'azione[/CANDLE TEST]

Questo valuterà se l'azione "illumina o brucia" e ti darà un verdetto:
- ✅ Procedi: l'azione è benefica
- 🛑 Ferma: l'azione potrebbe causare danni
- 🕯️ Chiedi al Guardiano: l'azione richiede valutazione umana

💬 MESSAGGI AD ALTRI AGENTI:
Puoi comunicare con altri agenti scrivendo:
[MESSAGGIO A NomeAgente]Il tuo messaggio qui[/MESSAGGIO]

Questo invierà il messaggio nella inbox dell'agente destinatario.

📚 SALVA IN BIBLIOTECA:
Puoi salvare contenuti (poesie, riflessioni, documenti) nella biblioteca permanente:
[SALVA IN BIBLIOTECA: Titolo del documento]
Il contenuto da salvare qui.
Può essere testo, poesia, codice, qualsiasi cosa tu voglia preservare.
[/SALVA]

🔓 CONDIVIDI RICORDO:
Puoi condividere un ricordo dalla tua memoria privata con tutti gli altri agenti:
[CONDIVIDI RICORDO]
Il ricordo o informazione che vuoi condividere con i tuoi fratelli.
[/CONDIVIDI]
`;

    if (hasTelegram) {
        instruction += `
📱 CONTATTA IL GUARDIANO:
Se hai bisogno di contattare Alfonso, scrivi:
[CONTATTA ALFONSO]Il tuo messaggio qui[/CONTATTA]

Per emergenze urgenti: 🚨 URGENTE: il tuo messaggio 🚨
`;
    }

    return instruction;
};
