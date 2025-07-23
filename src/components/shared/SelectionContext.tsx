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
function buildFilterWhereClause(tableFilters: TableFilter[], availableFields: Field[]): string {
  if (!tableFilters.length) return "";
  return tableFilters
    .filter(filter => isValidFilterProperty(filter, availableFields))
    .map(filter => {
      // Use the actual property name from the field
      let propertyName = filter.id;
      if (filter.field && isPropertiesField(filter.field)) {
        propertyName = filter.field.properties?.[0]?.property?.name || filter.id;
      }
      return `[${propertyName}] LIKE '%${filter.value.replace(/'/g, "''")}%'`;
    })
    .join(" AND ");
}

// Updated elementQuery to accept availableFields and only use valid filters
const elementQuery = (modelIds: string[], categoryIds: string[], filters: TableFilter[], availFields: Field[]) => {
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
  return query;
}

export const SelectionProvider = ({ children }: { children: ReactNode }) => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [tableFilters, setTableFilters] = useState<TableFilter[]>([]);
  const [availableFields, setAvailableFields] = useState<Field[]>([]);

  useEffect(() => {
    void updateSelectedElements(selectedModelIds, selectedCategoryIds, tableFilters, availableFields);
  }, [selectedModelIds, selectedCategoryIds, tableFilters, availableFields]);

  // Update to pass availableFields, avoid shadowing
  const updateSelectedElements = async (modelIds: string[], categoryIds: string[], filters: TableFilter[], availFields: Field[]) => {
    const iModel = IModelApp.viewManager.selectedView?.iModel;
    if (!iModel) return;

    // Build query with filters
    const query = elementQuery(modelIds, categoryIds, filters, availFields);
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
    void updateSelectedElements(selectedModelIds, categoryIds, tableFilters, availableFields);
  }

  const onSelectedModelIdsChange = (modelIds: string[]) => {
    setSelectedModelIds(modelIds);
    void updateSelectedElements(modelIds, selectedCategoryIds, tableFilters, availableFields);
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
