/* eslint-disable @typescript-eslint/no-deprecated */
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { type Field, type Keys, KeySet } from "@itwin/presentation-common";
import { Presentation } from "@itwin/presentation-frontend";
import { IModelApp } from "@itwin/core-frontend";
import { QueryRowFormat } from "@itwin/core-common";

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

// Type guard to check if a Field has 'properties' (PropertiesField)
function isPropertiesField(field: Field): field is Field & { properties: any[] } {
  return typeof (field as any).properties !== 'undefined';
}

// Helper to check if a property is valid for filtering (exists on bis.GeometricElement3d)
function isValidFilterProperty(filter: TableFilter, availableFields: Field[]): boolean {
  if (!filter.field || !isPropertiesField(filter.field)) return false;
  // Only allow properties that are direct properties of bis.GeometricElement3d
  // and are string type (as per TableFilter.tsx logic)
  const property = filter.field.properties?.[0]?.property;
  return !!property && property.type === "string" && availableFields.some(f => f.name === filter.field?.name);
}

// Build WHERE clause from tableFilters, only using valid properties
export function buildFilterWhereClause(tableFilters: TableFilter[], availableFields: Field[]): string {
  if (!tableFilters.length) return "";
  return tableFilters
    .filter(filter => isValidFilterProperty(filter, availableFields))
    .map(filter => {
      // Use the actual property name from the field
      let propertyName = filter.id;
      if (filter.field && isPropertiesField(filter.field)) {
        const property = filter.field.properties?.[0]?.property;
        if (property?.name) {
          propertyName = property.name;
        }
      }
      // Escape single quotes in the filter value and use proper SQL LIKE syntax
      const escapedValue = filter.value.replace(/'/g, "''");
      return `[${propertyName}] LIKE '%${escapedValue}%'`;
    })
    .join(" AND ");
}

// Updated elementQuery to accept availableFields and only use valid filters
const elementQuery = (modelIds: string[], categoryIds: string[], filters: TableFilter[], availFields: Field[]) => {
  // If neither model nor category is selected, return empty query (do not run)
  if (modelIds.length === 0 && categoryIds.length === 0) {
    return "";
  }
  let query = "SELECT ec_classname(ECClassId) as className, ECInstanceId as id FROM bis.GeometricElement3d";
  const criteria: string[] = [];
  if (modelIds.length > 0) {
    criteria.push(`Model.Id IN (${modelIds.map((id) => `${id}`).join(",")})`);
  }
  if (categoryIds.length > 0) {
    criteria.push(`Category.Id IN (${categoryIds.map((id) => `${id}`).join(",")})`);
  }
  const filterClause = buildFilterWhereClause(filters, availFields);
  if (filterClause) {
    criteria.push(filterClause);
  }
  if (criteria.length > 0) {
    query += ` WHERE ${criteria.join(" AND ")}`;
  }
  // If a model or category is selected, run the query as normal
  return query;
}

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

  useEffect(() => {
    void updateSelectedElements(selectedModelIds, selectedCategoryIds, tableFilters, availableFields);
  }, [selectedModelIds, selectedCategoryIds, tableFilters, availableFields]);

  // Update to pass availableFields, avoid shadowing
  const updateSelectedElements = async (modelIds: string[], categoryIds: string[], filters: TableFilter[], availFields: Field[]) => {
    const iModel = IModelApp.viewManager.selectedView?.iModel;
    if (!iModel) return;

    // Build query with filters
    const query = elementQuery(modelIds, categoryIds, filters, availFields);
    // If no models or categories selected, clear selection and emphasis
    if (!query) {
      // Clear selection
      const emptyKeySet = new KeySet();
      Presentation.selection.replaceSelection("My Selection", iModel, emptyKeySet);

      // Clear any emphasized elements
      const viewport = IModelApp.viewManager.selectedView;
      if (viewport) {
        const { EmphasizeElements } = await import("@itwin/core-frontend");
        const emphasize = EmphasizeElements.getOrCreate(viewport);
        emphasize.clearEmphasizedElements(viewport);
      }
      return;
    }
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

  // Update category/model selection handlers to pass availableFields
  const onSelectedCategoryIdsChange = (categoryIds: string[]) => {
    setSelectedCategoryIds(categoryIds);
  }

  const onSelectedModelIdsChange = (modelIds: string[]) => {
    setSelectedModelIds(modelIds);
  };

  return (
    <SelectionContext.Provider
      value={{
        selectedKeys,
        setSelectedKeys,
        selectedCategoryIds,
        setSelectedCategoryIds: onSelectedCategoryIdsChange,
        selectedModelIds,
        setSelectedModelIds: onSelectedModelIdsChange,
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
