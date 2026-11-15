const DEFAULT_MESSAGE = 'Olá! Vi seu perfil no Tem Quem Faz e gostaria de solicitar um orçamento.';

// WhatsApp do dono do app, destino das mensagens de pagamento.
// Troque o número aqui quando quiser (formato: 55 + DDD + número, só dígitos).
export const ADMIN_WHATSAPP = '5512996169874';

export function buildWhatsAppUrl(phone: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;
}

export function buildAdminWhatsAppUrl(message: string): string {
  return `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`;
}
