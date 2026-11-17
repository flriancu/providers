import { useEffect, useRef, type ReactNode } from 'react';

/**
 * A menu that opens below its button in the header (the account, the settings). Escape closes
 * it and returns to its button; a click outside closes it. Built on <details>, so it works and
 * is announced as expandable without script.
 */
export function HeaderMenu({ button, label, children }: { button: ReactNode; label: string; children: ReactNode }) {
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: Event) => {
      const el = menu.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !el.contains(e.target as Node)) {
        el.open = false;
        if (e instanceof KeyboardEvent) el.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('keydown', close);
    document.addEventListener('pointerdown', close);
    return () => {
      document.removeEventListener('keydown', close);
      document.removeEventListener('pointerdown', close);
    };
  }, []);
  return (
    <details ref={menu} className="account account-menu">
      <summary aria-label={label}>
        <span aria-hidden="true">{button}</span>
        <span aria-hidden="true">▾</span>
      </summary>
      <div className="menu-panel">{children}</div>
    </details>
  );
}
