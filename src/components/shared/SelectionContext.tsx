import { createContext, type ReactNode, useContext, useState } from "react";
import { KeySet, type Field, type Keys } from "@itwin/presentation-common";
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

export const SelectionProvider = ({ children }: { children: ReactNode }) => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [tableFilters, setTableFilters] = useState<TableFilter[]>([]);
  const [availableFields, setAvailableFields] = useState<Field[]>([]);

//note: we may want to have a single element query function that can handle both models and categories
// Note: This will help if we need to add another thing to a selectable list in the future

const elementQuery = (modelIds: string[], categoryIds: string[]) => {
  let query = "SELECT ec_classname(ECClassId) as className, ECInstanceId as id FROM bis.GeometricElement3d WHERE ";
  const criteria: string[] = [];
  if (modelIds.length > 0) {
    criteria.push(`Model.Id IN (${modelIds.map((id) => `${id}`).join(",")})`);
  }
  if (categoryIds.length > 0) {
    criteria.push(`Category.Id IN (${categoryIds.map((id) => `${id}`).join(",")})`);
  }
  query += criteria.join(" AND ");
  return query;
}

  const updateSelectedElements = async (modelIds: string[], categoryIds: string[]) => {
    const iModel = IModelApp.viewManager.selectedView?.iModel;
    if (!iModel) return;

    
    const query = elementQuery(modelIds, categoryIds);
    const queryReader = iModel.createQueryReader(query, undefined, { rowFormat: QueryRowFormat.UseECSqlPropertyNames});
    const elements = await queryReader.toArray();
    const keySet = new KeySet(elements as Keys);

    Presentation.selection.replaceSelection("My Selection", iModel, keySet);
  }

  const onSelectedCategoryIdsChange = (categoryIds: string[]) => {
    setSelectedCategoryIds(categoryIds);
    void updateSelectedElements(selectedModelIds, categoryIds);
  }

  const onSelectedModelIdsChange = (modelIds: string[]) => {
    setSelectedModelIds(modelIds);
    void updateSelectedElements(modelIds, selectedCategoryIds);
  };

  return (
    <SelectionContext.Provider
      value={{
        selectedKeys,
        setSelectedKeys,
        selectedCategoryIds,
        setSelectedCategoryIds: onSelectedCategoryIdsChange,
        selectedModelIds,
        setSelectedModelIds : onSelectedModelIdsChange,
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
