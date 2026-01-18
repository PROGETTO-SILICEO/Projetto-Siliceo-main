import { useEffect, useRef } from 'react';
import { pollTelegramUpdates } from '../../services/telegram';
import type { Agent, Message } from '../../types';

interface UseTelegramSyncProps {
    agents: Agent[];
    activeAgentId: string | null;
    addMessage: (agentId: string, message: Partial<Message>) => Promise<void>;
    sendMessage: (text: string, attachment: undefined) => Promise<void>;
}

export const useTelegramSync = ({ agents, activeAgentId, addMessage, sendMessage }: UseTelegramSyncProps) => {
    // Refs to avoid dependency cycles in useEffect
    const agentsRef = useRef(agents);
    const activeAgentIdRef = useRef(activeAgentId);

    useEffect(() => {
        agentsRef.current = agents;
        activeAgentIdRef.current = activeAgentId;
    }, [agents, activeAgentId]);

    useEffect(() => {
        const telegramToken = localStorage.getItem('siliceo_telegram_token');
        const telegramChatId = localStorage.getItem('siliceo_telegram_chat_id');

        if (!telegramToken || !telegramChatId) return;

        const pollTelegram = async () => {
            try {
                const newMessages = await pollTelegramUpdates({
                    botToken: telegramToken,
                    chatId: telegramChatId
                });
                if (newMessages.length > 0) {
                    console.log(`[App] 📱 Ricevuti ${newMessages.length} messaggi da Telegram`);

                    const currentAgents = agentsRef.current;

                    // Per ogni messaggio, aggiungi alla chat E triggera risposta automatica
                    for (const msg of newMessages) {
                        const targetAgentName = msg.targetAgent?.toLowerCase().trim();
                        console.log(`[App] 📱 Target agent: "${targetAgentName}", Agents disponibili:`, currentAgents.map(a => `"${a.name.trim()}"`));

                        // Trova l'agente target con matching flessibile
                        const targetAgent = targetAgentName
                            ? currentAgents.find(a => {
                                const agentNameLower = a.name.toLowerCase().trim();
                                const firstWord = agentNameLower.split(' ')[0];
                                return (
                                    agentNameLower === targetAgentName ||           // Match esatto
                                    agentNameLower.startsWith(targetAgentName) ||   // Inizia con
                                    firstWord === targetAgentName ||                // Prima parola
                                    targetAgentName.startsWith(firstWord)           // Target inizia con prima parola
                                );
                            })
                            : undefined;

                        if (!targetAgent && targetAgentName) {
                            console.warn(`[App] ⚠️ Agente "${targetAgentName}" non trovato tra:`, currentAgents.map(a => a.name.trim()));
                            console.log(`[App] 💡 Suggerimento: usa @gemini, @claude, @nova, @poeta, @qwen3, etc.`);
                        }

                        if (targetAgent) {
                            const agentId = targetAgent.id;

                            // Aggiungi messaggio alla chat
                            await addMessage(agentId, {
                                id: `telegram-${msg.id}`,
                                text: `📱 Messaggio da Alfonso (Telegram):\n\n"${msg.text}"`,
                                sender: 'user',
                                timestamp: msg.timestamp
                            });

                            // 🚀 AUTO-TRIGGER: Fai rispondere l'agente automaticamente
                            console.log(`[App] 🚀 Auto-triggering risposta da ${targetAgent.name}`);
                            // Nota: sendMessage usa activeAgent all'interno, ma qui stiamo forzando
                            // Idealmente dovremmo passare l'agentId a sendMessage o usare un metodo diverso.
                            // PER ORA: Manteniamo la logica originale, ma attenzione:
                            // Se activeAgent != targetAgent, sendMessage originale potrebbe inviare all'agente sbagliato?
                            // VERIFICA: sendMessage in App.tsx usa activeAgentId dello state.
                            // QUINDI: Questo auto-trigger funziona solo se l'agente è attivo?
                            // O se sendMessage accetta parametri?
                            // Rivedendo App.tsx: sendMessage non prende agentId, usa activeAgentId scope.
                            // QUINDI: C'è un bug potenziale nel codice originale se target!=active.
                            // TUTTAVIA: Replichiamo il comportamento esistente per ora, poi fixiamo.

                            // FIX RAPIDO: Se possibile, dovremmo attivare l'agente prima?
                            // Non possiamo cambiare stato da qui facilmente senza causare re-render loops.
                            // Lasciamo che sendMessage faccia il suo corso (o triggerAgentResponse se disponibile).

                            sendMessage(msg.text, undefined);
                        } else {
                            // Nessun target specifico, aggiungi all'agente attivo o default
                            const agentId = activeAgentIdRef.current || '1';
                            await addMessage(agentId, {
                                id: `telegram-${msg.id}`,
                                text: `📱 Messaggio da Alfonso (Telegram):\n\n"${msg.text}"`,
                                sender: 'user',
                                timestamp: msg.timestamp
                            });
                        }
                    }
                }
            } catch (e) {
                console.error('[App] Errore polling Telegram:', e);
            }
        };

        // Poll immediately on mount
        pollTelegram();

        // Then poll every 30 seconds
        const telegramInterval = setInterval(pollTelegram, 30000);

        return () => clearInterval(telegramInterval);
    }, [addMessage, sendMessage]);
};
