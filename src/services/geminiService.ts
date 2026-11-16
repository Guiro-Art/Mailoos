import { apiFetch } from './apiAuth';

export interface ComposePromptOptions {
  purpose: string;
  recipientName?: string;
  tone: 'professionnel' | 'amical' | 'formel' | 'urgent';
  language?: 'fr' | 'en';
  context?: string;
  replyToSubject?: string;
  replyToBody?: string;
}

export async function generateEmailContent(options: ComposePromptOptions): Promise<{ subject: string; body: string }> {
  try {
    const res = await apiFetch('/api/ai/compose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });

    if (res.ok) {
      const parsed = (await res.json()) as { subject?: string; body?: string };
      if (parsed.subject && parsed.body) {
        return {
          subject: parsed.subject,
          body: parsed.body,
        };
      }
    }
  } catch {
    // Fallback local ci-dessous en cas d'indisponibilité réseau
  }

  const recipient = options.recipientName || 'Madame, Monsieur';
  if (options.replyToSubject) {
    return {
      subject: options.replyToSubject.startsWith('Re:') ? options.replyToSubject : `Re: ${options.replyToSubject}`,
      body: `Bonjour ${recipient},\n\nMerci pour votre retour. J'ai bien pris note de votre message et je vous confirme que nous traitons votre demande avec la plus grande attention.\n\nNous restons à votre entière disposition pour tout renseignement complémentaire.\n\nBien cordialement,\nL'équipe Mailoos`,
    };
  }

  return {
    subject: options.purpose.slice(0, 60),
    body: `Bonjour ${recipient},\n\nJe vous contacte concernant : ${options.purpose}.\n\n${options.context || 'Nous restons disponibles pour échanger à ce sujet.'}\n\nDans l'attente de votre retour, je vous souhaite une excellente journée.\n\nBien cordialement,\nL'équipe Mailoos`,
  };
}
