import type { ReactNode } from 'react';
import { firstLinks, handleOf, webHref } from '../domain/links';
import type { Provider } from '../domain/schema';
import { useI18n } from '../i18n';
import { GlobeIcon, InstagramIcon, MailIcon, PhoneIcon, TikTokIcon } from './icons';

/** A phone number as a tel: address: digits and a leading +, as phones dial them. */
const telOf = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

/** A link firstLinks chose, as the address to open: always a web address (links.ts). */
const webOf = (link: string) => webHref(link) ?? '';

/** The slots, in the order they are shown, each with its icon. */
const SLOTS: { key: string; icon: ReactNode }[] = [
  { key: 'phone', icon: <PhoneIcon /> },
  { key: 'email', icon: <MailIcon /> },
  { key: 'web', icon: <GlobeIcon /> },
  { key: 'instagram', icon: <InstagramIcon /> },
  { key: 'tiktok', icon: <TikTokIcon /> },
];

/**
 * One-tap actions for a provider: call its first phone, write to its first email address, open
 * its website, its Instagram, its TikTok. Each is a plain link (tel:, mailto: or the address), so
 * the phone offers to call and opens the Instagram or TikTok app when installed. Every kind keeps
 * its slot, so the icons line up in columns down the list; one the provider lacks is drawn barely
 * visible and does nothing. The icon carries no meaning alone: each link is named in full
 * ("Call 0721 234 567").
 */
export function QuickActions({ provider }: { provider: Provider }) {
  const { t } = useI18n();
  const links = firstLinks(provider.links);
  const phone = provider.phones[0];
  const email = provider.emails[0];
  const targets: ({ href: string; name: string; external?: true } | null)[] = [
    phone ? { href: telOf(phone), name: t('quick.call', { phone }) } : null,
    email ? { href: `mailto:${email.trim()}`, name: t('quick.email', { email }) } : null,
    links.website ? { href: webOf(links.website), name: t('quick.website', { site: links.website }), external: true } : null,
    links.instagram
      ? { href: webOf(links.instagram), name: t('quick.instagram', { handle: handleOf(links.instagram) }), external: true }
      : null,
    links.tiktok ? { href: webOf(links.tiktok), name: t('quick.tiktok', { handle: handleOf(links.tiktok) }), external: true } : null,
  ];
  if (!targets.some(Boolean)) return null;
  return (
    <span className="quick-actions">
      {SLOTS.map((slot, i) => {
        const target = targets[i];
        return target ? (
          <a
            key={slot.key}
            className="icon-link"
            href={target.href}
            aria-label={target.name}
            title={target.name}
            {...(target.external && { target: '_blank', rel: 'noopener noreferrer' })}
          >
            {slot.icon}
          </a>
        ) : (
          <span key={slot.key} className="icon-slot" aria-hidden="true">
            {slot.icon}
          </span>
        );
      })}
    </span>
  );
}
