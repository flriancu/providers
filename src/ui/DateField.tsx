import { DayPicker } from '@daypicker/react';
import { enGB, ro } from '@daypicker/react/locale';
import '@daypicker/react/style.css';
import { useEffect, useId, useRef, useState } from 'react';
import { dayOf } from '../domain/days';
import { useI18n } from '../i18n';

/** DayPicker works with local Date objects; the app with whole-day ISO strings (YYYY-MM-DD). */
function toDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

const toIso = dayOf;

/** Today on this device, as a calendar day. */
export const todayIso = () => dayOf(new Date());

/**
 * One calendar day, shown in words ("Monday, 16 November 2026") on a button that opens a month
 * calendar below it. Replaces the browser's date input, which shows the operating system's short
 * format ("16-Nov-2026"). The calendar is inline, so no container clips it. Below the month:
 * Today and Cancel. It closes on a pick, Cancel, Escape, or when focus leaves the field.
 */
export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (iso: string) => void }) {
  const { t, lang, date } = useI18n();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => toDate(value));
  const ids = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // Keyboard users land on the chosen day when the calendar opens (WAI-ARIA date picker pattern).
  useEffect(() => {
    if (!open) return;
    // DayPicker marks the chosen day's cell; the button inside it takes focus.
    const frame = requestAnimationFrame(() =>
      panel.current?.querySelector<HTMLButtonElement>('[aria-selected="true"] button, .rdp-selected button')?.focus(),
    );
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  // While open, Escape closes the calendar wherever focus is, and keeps the day.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div
      className="date-field"
      onBlur={(e) => {
        // Focus moved outside the field (Tab past it, a click elsewhere): close, keeping the day.
        if (open && !e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <span className="field-label" id={`${ids}-label`}>
        {label}
      </span>
      <button
        ref={trigger}
        type="button"
        className="date-button"
        aria-labelledby={`${ids}-label ${ids}-value`}
        aria-expanded={open}
        onClick={() => (open ? close() : (setMonth(toDate(value)), setOpen(true)))}
      >
        <span id={`${ids}-value`}>{date(value)}</span>
        <span aria-hidden="true">📅</span>
      </button>
      {open && (
        <div ref={panel} className="date-panel" role="dialog" aria-label={t('date.choose')}>
          <DayPicker
            mode="single"
            required
            locale={lang === 'ro' ? ro : enGB}
            weekStartsOn={1}
            month={month}
            onMonthChange={setMonth}
            selected={toDate(value)}
            onSelect={(d) => {
              onChange(toIso(d));
              close();
            }}
            labels={{ labelPrevious: () => t('date.prevMonth'), labelNext: () => t('date.nextMonth') }}
          />
          <div className="date-footer">
            <button
              type="button"
              className="secondary"
              onClick={() => {
                onChange(todayIso());
                close();
              }}
            >
              {t('date.today')}
            </button>
            <button type="button" className="link-button" onClick={close}>
              {t('form.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
