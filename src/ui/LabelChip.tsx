import type { LabelColor } from '../domain/schema';

/** A label as a coloured chip (D-31). The text always says the name, so colour is never the only cue. */
export function LabelChip({ color, children }: { color: LabelColor; children: React.ReactNode }) {
  return (
    <span className="chip" data-color={color}>
      {children}
    </span>
  );
}

/** A small colour sample next to a choice, hidden from screen readers (the text says the name). */
export function ColorDot({ color }: { color: LabelColor }) {
  return <span className="dot" data-color={color} aria-hidden="true" />;
}
