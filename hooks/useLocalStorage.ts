import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Initialize state without accessing localStorage directly
  const [value, setValue] = useState<T>(initialValue);

  // Load stored value from localStorage only on the client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(key);
      if (stored) {
        setValue(JSON.parse(stored));
      }
    }
  }, [key]);

  // Sync state changes to localStorage on the client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, [key, value]);

  return [value, setValue] as const;
}