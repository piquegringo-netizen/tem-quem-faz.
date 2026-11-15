import { MessageCircle } from 'lucide-react';
import { recordContactClick } from '@/services/marketplace';
import { buildWhatsAppUrl } from '@/lib/whatsapp';

interface WhatsAppButtonProps {
  providerId: string;
  whatsapp: string;
  size?: 'card' | 'large';
}

export default function WhatsAppButton({ providerId, whatsapp, size = 'card' }: WhatsAppButtonProps) {
  const sizeClass = size === 'large' ? 'py-4 text-base' : 'py-3 text-sm';

  return (
    <a
      href={buildWhatsAppUrl(whatsapp)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => void recordContactClick(providerId)}
      className={`flex w-full items-center justify-center gap-2 rounded-full bg-whatsapp px-5 font-semibold text-ink shadow-soft transition hover:-translate-y-0.5 hover:bg-whatsapp-dark hover:text-paper hover:shadow-card focus:outline-none focus-visible:ring-4 focus-visible:ring-whatsapp/40 active:translate-y-0 active:scale-[0.98] ${sizeClass}`}
    >
      <MessageCircle className="h-5 w-5" aria-hidden="true" />
      Chamar no WhatsApp
    </a>
  );
}
