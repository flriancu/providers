import { useState } from 'react';
import type { DirectoryDoc } from '../domain/schema';
import { labelsJoined, type JoinedLabel } from '../domain/unique';

/**
 * Labels that became one with another of their name since this page opened (D-47): a version
 * from another device arrived with a label of the same name in the same group. Said once, until
 * dismissed; more joined later are added to what is said.
 */
export function useJoinedLabels(doc: DirectoryDoc | null): { joined: JoinedLabel[]; dismiss: () => void } {
  const [seen, setSeen] = useState(doc);
  const [joined, setJoined] = useState<JoinedLabel[]>([]);
  // Compared with the version shown before, while drawing: the React way to follow a prop
  // (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  if (doc !== seen) {
    setSeen(doc);
    if (seen && doc) {
      const now = labelsJoined(seen, doc).filter((j) => !joined.some((k) => k.id === j.id));
      if (now.length) setJoined([...joined, ...now]);
    }
  }
  return { joined, dismiss: () => setJoined([]) };
}
