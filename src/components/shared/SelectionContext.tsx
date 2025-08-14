/* eslint-disable @typescript-eslint/no-deprecated */
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
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
  categoryLabels: Record<string, string>;
  setCategoryLabels: (labels: Record<string, string>) => void;
  modelLabels: Record<string, string>;
  setModelLabels: (labels: Record<string, string>) => void;
  tableFilters: TableFilter[];
  setTableFilters: (filters: TableFilter[]) => void;
  availableFields: Field[];
  setAvailableFields: (fields: Field[]) => void;
  selectedClassNames: string[];
  setSelectedClassNames: (classNames: string[]) => void;
  selectedSchemaNames: string[];
  setSelectedSchemaNames: (schemaNames: string[]) => void;
  clearAllFilters: () => void;
  totalSelectedCount: number;
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
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string>>({});
  const [modelLabels, setModelLabels] = useState<Record<string, string>>({});
  const [selectedClassNames, setSelectedClassNames] = useState<string[]>([]);
  const [selectedSchemaNames, setSelectedSchemaNames] = useState<string[]>([]);
  const [totalSelectedCount, setTotalSelectedCount] = useState<number>(0);
  
  // Do not persist table filters; always start empty on reload
  const [tableFilters, setTableFiltersState] = useState<TableFilter[]>([]);
  
  const [availableFields, setAvailableFields] = useState<Field[]>([]);
  // Keep a ref of availableFields to avoid triggering selection updates on manual selection (which changes columns)
  const availableFieldsRef = useRef<Field[]>(availableFields);
  useEffect(() => {
    availableFieldsRef.current = availableFields;
  }, [availableFields]);

  // Do not persist filters; just update state
  const setTableFilters = (filters: TableFilter[]) => {
    setTableFiltersState(filters);
  };

  // Clear all table filters
  const clearAllFilters = () => setTableFilters([]);

  // Do not persist class/schema selections or table filters: proactively remove any legacy keys
  useEffect(() => {
    try {
      localStorage.removeItem('itwin-grid-selected-classes');
      localStorage.removeItem('itwin-grid-selection');
      localStorage.removeItem('itwin-grid-filters');
    } catch {
      // Ignore storage errors (SSR or restricted environments)
    }
  }, []);

  // Helper to clear all selections and emphasis
  const clearSelectionAndEmphasis = useCallback(() => {
    const iModel = IModelApp.viewManager.selectedView?.iModel;
    if (!iModel) return;
    Presentation.selection.replaceSelection("My Selection", iModel, new KeySet());
    const vp = IModelApp.viewManager.selectedView;
    if (vp) {
      void import("@itwin/core-frontend").then(({ EmphasizeElements }) => {
        EmphasizeElements.getOrCreate(vp).clearEmphasizedElements(vp);
      });
    }
  }, []);

  // Update selected elements based on model, category, filters, and class/schema selections
  const updateSelectedElements = useCallback(async (
    modelIds: string[],
    categoryIds: string[],
    filters: TableFilter[],
    availFields: Field[],
    classNames: string[],
    schemaNames: string[]
  ) => {
    
    const iModel = IModelApp.viewManager.selectedView?.iModel;
    if (!iModel) return;

    // Build query with filters
    const query = elementQuery(modelIds, categoryIds, filters, availFields, classNames, schemaNames);
    
    // If no query (no selection and no filters), clear selection/emphasis so UI (TableGrid) reflects empty state
    if (!query) {
      const nothingSelected =
        modelIds.length === 0 &&
        categoryIds.length === 0 &&
        filters.length === 0 &&
        classNames.length === 0 &&
        schemaNames.length === 0;
      if (nothingSelected) {
        // Clear selection unconditionally when all selection criteria are cleared
        clearSelectionAndEmphasis();
        setTotalSelectedCount(0);
      }
      return;
    }

    const queryReader = iModel.createQueryReader(query, undefined, { rowFormat: QueryRowFormat.UseECSqlPropertyNames});
    const elements = await queryReader.toArray();
    setTotalSelectedCount(elements.length);
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
  }, [clearSelectionAndEmphasis]);

  useEffect(() => {
    void updateSelectedElements(
      selectedModelIds,
      selectedCategoryIds,
      tableFilters,
      availableFieldsRef.current,
      selectedClassNames,
      selectedSchemaNames
    );
  }, [selectedModelIds, selectedCategoryIds, tableFilters, selectedClassNames, selectedSchemaNames, updateSelectedElements]);

  // Update category/model selection handlers to pass availableFields
  const onSelectionChange = (type: "category" | "model", ids: string[]) => {
    if (type === "category") {
      setSelectedCategoryIds(ids);
      if (ids.length === 0) setCategoryLabels({});
    } else {
      setSelectedModelIds(ids);
      if (ids.length === 0) setModelLabels({});
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
        categoryLabels,
        setCategoryLabels,
        modelLabels,
        setModelLabels,
        tableFilters,
        setTableFilters,
        availableFields,
        setAvailableFields,
        selectedClassNames,
        setSelectedClassNames,
        selectedSchemaNames,
        setSelectedSchemaNames,
        clearAllFilters,
        totalSelectedCount,
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

