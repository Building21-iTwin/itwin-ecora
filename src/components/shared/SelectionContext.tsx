import { createContext, type ReactNode, useContext, useState } from "react";
import type { Field } from "@itwin/presentation-common";

// Define table filter type
export interface TableFilter {
  id: string;
  value: string;
  field?: Field;
}

export interface SelectionState {
  selectedKeys: string[];
  setSelectedKeys: (keys: string[]) => void;
  selectedCategoryIds: string[];
  setSelectedCategoryIds: (ids: string[]) => void;
  selectedModelIds: string[];
  setSelectedModelIds: (ids: string[]) => void;
  // Table filtering functionality
  tableFilters: TableFilter[];
  setTableFilters: (filters: TableFilter[]) => void;
  availableFields: Field[];
  setAvailableFields: (fields: Field[]) => void;
}

const SelectionContext = createContext<SelectionState | undefined>(undefined);

export const SelectionProvider = ({ children }: { children: ReactNode }) => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [tableFilters, setTableFilters] = useState<TableFilter[]>([]);
  const [availableFields, setAvailableFields] = useState<Field[]>([]);

  return (
    <SelectionContext.Provider
      value={{
        selectedKeys,
        setSelectedKeys,
        selectedCategoryIds,
        setSelectedCategoryIds,
        selectedModelIds,
        setSelectedModelIds,
        tableFilters,
        setTableFilters,
        availableFields,
        setAvailableFields,
      }}
    >
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
