import { useCombobox } from 'downshift';
import { useState } from 'react';
import { fold } from '../domain/fold';
import { matchLabels } from '../domain/labels';
import { live, type DirectoryDoc, type Label } from '../domain/schema';
import { useI18n } from '../i18n';
import { LabelChip } from './LabelChip';
import { labelName } from './labelText';

/** A label to tick, or a new label to create with the typed name. */
type Option = { kind: 'label'; label: Label } | { kind: 'create'; name: string };

/** How many matches the list shows; typing more narrows it. */
const SHOWN = 8;

/**
 * FR-07, in the provider form: "+ Add a label" opens a field that finds this group's labels by
 * name or other words, ignoring case and diacritics, and offers to create a label when none has
 * the typed name. Creating takes that explicit choice; typing alone creates nothing. Built on
 * Downshift's combobox (WAI-ARIA combobox pattern, keyboard and screen readers included).
 */
type PickerProps = {
  doc: DirectoryDoc;
  facetId: string;
  /** The label group's name, for the field's name read out ("Find or add a label in Area"). */
  groupName: string;
  chosen: readonly string[];
  choose: (labelId: string) => void;
  create: (name: string) => void;
};

export function LabelPicker(props: PickerProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" className="link-button add-in-form" onClick={() => setOpen(true)}>
        {t('form.addLabel')}
      </button>
    );
  }
  return <PickerField {...props} close={() => setOpen(false)} />;
}

/** The open picker: the field and its list of matches. */
function PickerField({ doc, facetId, groupName, chosen, choose, create, close }: PickerProps & { close: () => void }) {
  const { t } = useI18n();
  const [text, setText] = useState('');

  const typed = text.trim();
  const matches = matchLabels(doc, typed, facetId)
    .filter((l) => !chosen.includes(l.id))
    .slice(0, SHOWN);
  const taken = live(doc.labels).some((l) => l.facetId === facetId && fold(l.name) === fold(typed));
  const items: Option[] = [
    ...matches.map((label): Option => ({ kind: 'label', label })),
    ...(typed && !taken ? [{ kind: 'create', name: typed } as const] : []),
  ];

  const { isOpen, highlightedIndex, getLabelProps, getMenuProps, getInputProps, getItemProps } = useCombobox<Option>({
    items,
    inputValue: text,
    selectedItem: null,
    itemToString: (o) => (o ? (o.kind === 'label' ? labelName(o.label) : o.name) : ''),
    itemToKey: (o) => (o ? (o.kind === 'label' ? o.label.id : `create:${o.name}`) : null),
    onInputValueChange: ({ inputValue }) => setText(inputValue),
    // After a choice the field empties, ready for the next label.
    stateReducer: (_state, { type, changes }) =>
      type === useCombobox.stateChangeTypes.ItemClick || type === useCombobox.stateChangeTypes.InputKeyDownEnter
        ? { ...changes, inputValue: '' }
        : changes,
    onSelectedItemChange: ({ selectedItem }) => {
      if (!selectedItem) return;
      if (selectedItem.kind === 'label') choose(selectedItem.label.id);
      else create(selectedItem.name);
    },
  });

  return (
    <div className="label-picker">
      <label {...getLabelProps()}>
        {t('form.findLabel')}
        <span className="sr-only"> ({groupName})</span>
      </label>
      <input
        {...getInputProps({
          // Opened by "+ Add a label": typing can start at once.
          autoFocus: true,
          onKeyDown: (e) => {
            // Escape on an empty field closes it again.
            if (e.key === 'Escape' && !text) close();
          },
        })}
      />
      <ul {...getMenuProps()} className={isOpen && items.length ? 'picker-menu' : 'picker-menu empty'}>
        {isOpen &&
          items.map((item, index) => (
            <li
              key={item.kind === 'label' ? item.label.id : `create:${item.name}`}
              className={highlightedIndex === index ? 'highlighted' : undefined}
              {...getItemProps({ item, index })}
            >
              {item.kind === 'label' ? (
                <>
                  <LabelChip color={item.label.color}>{labelName(item.label)}</LabelChip>
                </>
              ) : (
                t('form.createLabel', { name: item.name })
              )}
            </li>
          ))}
      </ul>
    </div>
  );
}
