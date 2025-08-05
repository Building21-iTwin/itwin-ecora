/* eslint-disable @typescript-eslint/no-deprecated */
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { type Field, type Keys, KeySet } from "@itwin/presentation-common";
import { Presentation } from "@itwin/presentation-frontend";
import { IModelApp } from "@itwin/core-frontend";
import { QueryRowFormat } from "@itwin/core-common";
import { getFieldTypeInfo } from "../containers/TableFilter";

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
  clearAllFilters: () => void;
}

const SelectionContext = createContext<SelectionState | undefined>(undefined);


// Build WHERE clause from tableFilters (simple LIKE filter)
export function buildFilterWhereClause(tableFilters: TableFilter[]): string {
  if (!tableFilters.length) return "";
  return tableFilters
    .map(filter => {
      const escapedValue = filter.value.replace(/'/g, "''");
      return `${filter.id} LIKE '%${escapedValue}%'`;
    })
    .join(" AND ");
}


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
const elementQuery = (
  modelIds: string[],
  categoryIds: string[],
  filters: TableFilter[],
  _availFields: Field[]
) => {
  
  // If no models, categories, and no filters, return empty string (no query)
  if (modelIds.length === 0 && categoryIds.length === 0 && filters.length === 0) {
    
    return "";
  }

  // Split filters into primitive field filters and navigation property filters
  // If field is missing, treat as primitive string filter
  const fieldPropFilters = filters.filter(f => {
    if (!f.field) return !!f.value;
    const info = getFieldTypeInfo(f.field);
    return info.type === "string" && !info.isNavigation && f.value;
  });
  // Navigation property filters: category, model, typedefinition, parent
  const navPropFilters = filters.filter(f => {
    if (!f.field) return false;
    const info = getFieldTypeInfo(f.field);
    return info.isNavigation && f.value;
  });
  // ...existing code...

  // Main table and alias
  const baseTable = "bis.GeometricElement3d";
  const baseAlias = "e";
  // Always select id and label, plus any primitive field filters
  const selectFields = [
    "e.ECInstanceId as id",
    "e.UserLabel as label",
    ...fieldPropFilters.map(f => `e.${f.id}`)
  ];

  // Only add joins if navPropFilters exist
  let joins: { table: string; alias: string; joinOn: string }[] = [];
  if (navPropFilters.length > 0) {
    // Always join Model and Category if nav props are present
    joins = [
      { table: "bis.Model", alias: "m", joinOn: "e.Model.Id = m.ECInstanceId" },
      { table: "bis.Category", alias: "c", joinOn: "e.Category.Id = c.ECInstanceId" }
    ];
    // Add additional joins for nav prop filters (e.g., TypeDefinition, Parent)
    for (const f of navPropFilters) {
      const fieldName = f.id.toLowerCase();
      if (fieldName.includes("typedefinition") && !joins.some(j => j.alias === "t")) {
        joins.push({ table: "bis.PhysicalType", alias: "t", joinOn: "e.TypeDefinition.Id = t.ECInstanceId" });
      }
      if (fieldName.includes("parent") && !joins.some(j => j.alias === "p")) {
        joins.push({ table: "bis.Element", alias: "p", joinOn: "e.Parent.Id = p.ECInstanceId" });
      }
    }
  }

  // Build WHERE clause
  const whereClauses: string[] = [];
  // Primitive field filters (string properties)
  for (const f of fieldPropFilters) {
    whereClauses.push(`e.${f.id} LIKE '%${f.value.replace(/'/g, "''")}%'`);
  }
  // Category id filter
  if (categoryIds.length > 0) {
    whereClauses.push(`e.Category.Id IN (${categoryIds.join(",")})`);
  }
  // Model id filter
  if (modelIds.length > 0) {
    whereClauses.push(`e.Model.Id IN (${modelIds.join(",")})`);
  }
  // Navigation property filters (if any)
  if (navPropFilters.length > 0) {
    for (const f of navPropFilters) {
      const fieldName = f.id.toLowerCase();
      if (fieldName.includes("category") || fieldName === "category") {
        whereClauses.push(`c.UserLabel LIKE '%${f.value.replace(/'/g, "''")}%'`);
      } else if (fieldName.includes("model") || fieldName === "model") {
        whereClauses.push(`m.UserLabel LIKE '%${f.value.replace(/'/g, "''")}%'`);
      } else if (fieldName.includes("typedefinition") || fieldName === "typedefinition") {
        whereClauses.push(`t.UserLabel LIKE '%${f.value.replace(/'/g, "''")}%'`);
      } else if (fieldName.includes("parent") || fieldName === "parent") {
        whereClauses.push(`p.UserLabel LIKE '%${f.value.replace(/'/g, "''")}%'`);
      }
    }
  }

  // Build query string
  let query = `SELECT ${selectFields.join(", ")} FROM ${baseTable} ${baseAlias}`;
  for (const join of joins) {
    query += ` JOIN ${join.table} ${join.alias} ON ${join.joinOn}`;
  }
  if (whereClauses.length > 0) {
    query += ` WHERE ${whereClauses.join(" AND ")}`;
  }
  return query;
};

export const SelectionProvider = ({ children }: { children: ReactNode }) => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  
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
    void updateSelectedElements(selectedModelIds, selectedCategoryIds, tableFilters, availableFields);
  }, [selectedModelIds, selectedCategoryIds, tableFilters, availableFields]);

  // Update selected elements based on model, category, and filters
  const updateSelectedElements = async (modelIds: string[], categoryIds: string[], filters: TableFilter[], availFields: Field[]) => {
    const iModel = IModelApp.viewManager.selectedView?.iModel;
    if (!iModel) return;

    // Build query with filters
    const query = elementQuery(modelIds, categoryIds, filters, availFields);
    
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

