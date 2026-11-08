/**
 * serviceText.ts — what visitors see when Nexus can't run (usage caps or the Gemini quota).
 * Shared by the server (limits, token, chat) and the browser (dock, chat), so the wording
 * matches everywhere and the UI can recognise these messages and offer email/WhatsApp instead.
 */
export const SERVICE_MESSAGE = {
  ip: 'You\'ve reached the hourly limit for Nexus. Please try again in a bit, or email Yoosha directly.',
  day: 'Nexus is resting after a busy day. Please try again tomorrow, or email Yoosha directly.',
  quota: 'Nexus is taking a short break right now. Everything on this page still works, and you can reach Yoosha directly by email or WhatsApp.',
} as const;

/** true when the message is one of ours: the UI then offers direct contact instead of "try again" */
export const isOutOfService = (m?: string) => !!m && (Object.values(SERVICE_MESSAGE) as string[]).includes(m);

/** Gemini quota / billing exhaustion (as opposed to a one-off network error) */
export const isQuotaError = (e: unknown) =>
  /RESOURCE_EXHAUSTED|quota|exceeded your current|billing|rate limit/i.test(String((e as Error)?.message ?? e ?? ''));
