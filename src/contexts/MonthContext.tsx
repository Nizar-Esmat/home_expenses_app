import React, { createContext, useContext, useState } from 'react';
import { currentMonthKey } from '@/services/constants';

interface MonthContextType {
  selectedMonthKey: string;
  setSelectedMonthKey: (key: string) => void;
}

const MonthContext = createContext<MonthContextType>({
  selectedMonthKey: currentMonthKey(),
  setSelectedMonthKey: () => {},
});

export function MonthProvider({ children }: { children: React.ReactNode }) {
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(currentMonthKey());

  return (
    <MonthContext.Provider value={{ selectedMonthKey, setSelectedMonthKey }}>
      {children}
    </MonthContext.Provider>
  );
}

export const useMonth = () => useContext(MonthContext);
