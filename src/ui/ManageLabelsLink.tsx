import { useI18n } from '../i18n';
import { href, useRoute } from './route';

/**
 * The way to the Labels page: in the header menu, and after the filters, where the labels are
 * on screen. The list's search and filters ride along, so "Back to providers" returns to them.
 */
export function ManageLabelsLink({ className }: { className?: string }) {
  const { t } = useI18n();
  const route = useRoute();
  return (
    <a className={className} href={href({ page: 'labels' }, route.query)} aria-current={route.page === 'labels' ? 'page' : undefined}>
      {t('nav.manageLabels')}
    </a>
  );
}
