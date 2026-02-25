// In-memory store for dev mode WhatsApp state
// Shared between whatsapp route and verify route

export const devWhatsAppState = {
  connected: false,
  phone: null as string | null,
  verified: false,
  connectCode: null as string | null,
  connectExpiry: null as Date | null,
  enabled: true,
};
