import { createContext, type ReactNode, useContext, useState } from "react";

// Define the shape of your selection state here
export interface SelectionState {
  selectedKeys: string[];
  setSelectedKeys: (keys: string[]) => void;
}

const SelectionContext = createContext<SelectionState | undefined>(undefined);

export const SelectionProvider = ({ children }: { children: ReactNode }) => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  return (
    <SelectionContext.Provider value={{ selectedKeys, setSelectedKeys }}>
      {children}
    </SelectionContext.Provider>
  );
};

export const useSelection = () => {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error("useSelection must be used within a SelectionProvider");
  }
  return context;
};
