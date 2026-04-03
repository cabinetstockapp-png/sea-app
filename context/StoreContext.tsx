import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type StoreItem = {
  id: string;
  name: string;
  assignedTo: string | null;
};

export const STORE_JOBS = ['Job A', 'Job B', 'Job C'] as const;

type StoreState = {
  items: StoreItem[];
  jobs: readonly string[];
  lastScannedBarcode: string;
  setLastScannedBarcode: (value: string) => void;
  addItem: (item: StoreItem) => void;
  assignItem: (id: string, value: string) => void;
};

const StoreContext = createContext<StoreState | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [lastScannedBarcode, setLastScannedBarcode] = useState('');

  const addItem = useCallback((item: StoreItem) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const assignItem = useCallback((id: string, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, assignedTo: value } : item)),
    );
  }, []);

  const value = useMemo(
    () => ({
      items,
      jobs: STORE_JOBS as readonly string[],
      lastScannedBarcode,
      setLastScannedBarcode,
      addItem,
      assignItem,
    }),
    [items, lastScannedBarcode, addItem, assignItem],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return ctx;
}
