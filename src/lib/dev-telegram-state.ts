/**
 * Shared dev mode state for Telegram connection
 * This is only used when the database is unreachable in development
 */

export const devTelegramState = {
  connected: false,
  chatId: null as string | null,
  connectCode: null as string | null,
  connectExpiry: null as Date | null,
};

export function resetDevTelegramState() {
  devTelegramState.connected = false;
  devTelegramState.chatId = null;
  devTelegramState.connectCode = null;
  devTelegramState.connectExpiry = null;
}
