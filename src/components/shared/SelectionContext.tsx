/* eslint-disable @typescript-eslint/no-deprecated */
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { type Field, type Keys, KeySet } from "@itwin/presentation-common";
import { Presentation } from "@itwin/presentation-frontend";
import { IModelApp } from "@itwin/core-frontend";
import { QueryRowFormat } from "@itwin/core-common";
import { elementQuery } from "../utils/QueryBuilders";

export interface TableFilter {
  columnId: any;
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
  tableFilters: TableFilter[];
  setTableFilters: (filters: TableFilter[]) => void;
  availableFields: Field[];
  setAvailableFields: (fields: Field[]) => void;
  selectedClassName?: string;
  setSelectedClassName: (className?: string) => void;
  clearAllFilters: () => void;
}

const SelectionContext = createContext<SelectionState | undefined>(undefined);

/**
 * Builds an ECSQL query string to select elements based on selected models, categories, and table filters.
 *
 * @param modelIds - Array of selected model ECInstanceIds
 * @param categoryIds - Array of selected category ECInstanceIds
 * @param filters - Array of TableFilter objects (column filters)
 * @param _availFields - Array of available Field objects (not used here)
 * @returns ECSQL query string or empty string if no selection
 *
 * Example output:
 * SELECT ... FROM bis.GeometricElement3d e JOIN bis.Model m ... WHERE ...
 */

export const SelectionProvider = ({ children }: { children: ReactNode }) => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [selectedClassName, setSelectedClassName] = useState<string | undefined>(undefined);
  
  // Load saved filters from localStorage on initialization
  const [tableFilters, setTableFiltersState] = useState<TableFilter[]>(() => {
    try {
      const saved = localStorage.getItem('itwin-grid-filters');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const [availableFields, setAvailableFields] = useState<Field[]>([]);

  // Custom setTableFilters that also saves to localStorage
  const setTableFilters = (filters: TableFilter[]) => {
    setTableFiltersState(filters);
    try {
      localStorage.setItem('itwin-grid-filters', JSON.stringify(filters));
    } catch {
      // Silently fail if localStorage is not available
    }
  };

  // Clear all table filters
  const clearAllFilters = () => setTableFilters([]);

  useEffect(() => {
    void updateSelectedElements(selectedModelIds, selectedCategoryIds, tableFilters, availableFields, selectedClassName);
  }, [selectedModelIds, selectedCategoryIds, tableFilters, availableFields, selectedClassName]);

  // Update selected elements based on model, category, and filters
  const updateSelectedElements = async (modelIds: string[], categoryIds: string[], filters: TableFilter[], availFields: Field[], className?: string) => {
    const iModel = IModelApp.viewManager.selectedView?.iModel;
    if (!iModel) return;

    // Build query with filters
    const query = elementQuery(modelIds, categoryIds, filters, availFields, className);
    
    // If no query (no selection and no filters), do not override manual selection/emphasis
    if (!query) return;

    const queryReader = iModel.createQueryReader(query, undefined, { rowFormat: QueryRowFormat.UseECSqlPropertyNames});
    const elements = await queryReader.toArray();
    const keySet = new KeySet(elements as Keys);
    Presentation.selection.replaceSelection("My Selection", iModel, keySet);
    // Emphasize all selected elements
    const vp = IModelApp.viewManager.selectedView;
    if (vp) {
      // Dynamically import EmphasizeElements
      const { EmphasizeElements } = await import("@itwin/core-frontend");
      const emphasize = EmphasizeElements.getOrCreate(vp);
      emphasize.clearEmphasizedElements(vp);
      emphasize.emphasizeElements(elements.map((el: any) => el.id), vp, undefined, true);
    }
  }

  // Helper to clear all selections and emphasis
  const clearSelectionAndEmphasis = () => {
    const iModel = IModelApp.viewManager.selectedView?.iModel;
    if (!iModel) return;
    Presentation.selection.replaceSelection("My Selection", iModel, new KeySet());
    const vp = IModelApp.viewManager.selectedView;
    if (vp) {
      void import("@itwin/core-frontend").then(({ EmphasizeElements }) => {
        EmphasizeElements.getOrCreate(vp).clearEmphasizedElements(vp);
      });
    }
  };

  // Update category/model selection handlers to pass availableFields
  const onSelectionChange = (type: "category" | "model", ids: string[]) => {
    if (type === "category") {
      setSelectedCategoryIds(ids);
    } else {
      setSelectedModelIds(ids);
    }
    if (ids.length === 0 && (type === "category" ? selectedModelIds.length : selectedCategoryIds.length) === 0) {
      clearSelectionAndEmphasis();
    }
  };

  // Generic wrapper for selection change
  const setSelectedIdsWrapper = (type: "category" | "model") => (ids: string[]) => onSelectionChange(type, ids);

  return (
    <SelectionContext.Provider
      value={{
        selectedKeys,
        setSelectedKeys,
        selectedCategoryIds,
        setSelectedCategoryIds: setSelectedIdsWrapper("category"),
        selectedModelIds,
        setSelectedModelIds: setSelectedIdsWrapper("model"),
        tableFilters,
        setTableFilters,
        availableFields,
        setAvailableFields,
        selectedClassName,
        setSelectedClassName,
        clearAllFilters,
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

