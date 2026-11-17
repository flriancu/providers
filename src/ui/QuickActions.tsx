import { firstLinks, handleOf } from '../domain/links';
import type { Provider } from '../domain/schema';
import { useI18n } from '../i18n';
import { GlobeIcon, InstagramIcon, PhoneIcon, TikTokIcon } from './icons';

/** A phone number as a tel: address: digits and a leading +, as phones dial them. */
const telOf = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

/** A web address with a scheme, so the browser opens it as a site and not as a path in this app. */
const webOf = (link: string) => (/^[a-z][a-z0-9+.-]*:\/\//i.test(link.trim()) ? link.trim() : `https://${link.trim()}`);

/**
 * One-tap actions for a provider: call its first phone, open its website, its Instagram, its
 * TikTok. Each is a plain link (tel: or the address), so the phone offers to call and opens the
 * Instagram or TikTok app when installed. Only the actions the provider has are shown. The icon
 * carries no meaning alone: each link is named in full ("Call 0721 234 567").
 */
export function QuickActions({ provider }: { provider: Provider }) {
  const { t } = useI18n();
  const links = firstLinks(provider.links);
  const phone = provider.phones[0];
  const actions = [
    phone && { key: 'phone', href: telOf(phone), name: t('quick.call', { phone }), icon: <PhoneIcon /> },
    links.website && {
      key: 'web',
      href: webOf(links.website),
      name: t('quick.website', { site: links.website }),
      icon: <GlobeIcon />,
      external: true,
    },
    links.instagram && {
      key: 'instagram',
      href: webOf(links.instagram),
      name: t('quick.instagram', { handle: handleOf(links.instagram) }),
      icon: <InstagramIcon />,
      external: true,
    },
    links.tiktok && {
      key: 'tiktok',
      href: webOf(links.tiktok),
      name: t('quick.tiktok', { handle: handleOf(links.tiktok) }),
      icon: <TikTokIcon />,
      external: true,
    },
  ].filter((a) => !!a);
  if (!actions.length) return null;
  return (
    <span className="quick-actions">
      {actions.map((a) => (
        <a
          key={a.key}
          className="icon-link"
          href={a.href}
          aria-label={a.name}
          title={a.name}
          {...('external' in a && a.external && { target: '_blank', rel: 'noopener noreferrer' })}
        >
          {a.icon}
        </a>
      ))}
    </span>
  );
}
