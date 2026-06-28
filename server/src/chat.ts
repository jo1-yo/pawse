import { callLlm } from './fal.js';
import { buildChatPrompt, CHAT_SYSTEM } from './prompts.js';

export async function makeChatReply(
  messages: { role: 'user' | 'assistant'; content: string }[],
): Promise<string> {
  // Only the last ~12 turns matter for a short companion reply.
  const recent = messages.slice(-12);
  const reply = await callLlm({
    system: CHAT_SYSTEM,
    prompt: buildChatPrompt(recent),
    timeoutMs: 30_000,
  });
  return reply.trim();
}
