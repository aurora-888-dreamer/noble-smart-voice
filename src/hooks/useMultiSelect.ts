import { useCallback, useState } from "react";

export function useMultiSelect<T extends number>() {
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<T>>(new Set());

  const toggle = useCallback((id: T) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const exit = useCallback(() => {
    setSelectMode(false);
    setSelected(new Set());
  }, []);

  const enter = useCallback((firstId?: T) => {
    setSelectMode(true);
    if (firstId !== undefined) setSelected(new Set([firstId]));
  }, []);

  const selectAll = useCallback((ids: T[]) => setSelected(new Set(ids)), []);

  return {
    selectMode,
    selected,
    count: selected.size,
    toggle,
    clear,
    enter,
    exit,
    selectAll,
    isSelected: (id: T) => selected.has(id),
  };
}
