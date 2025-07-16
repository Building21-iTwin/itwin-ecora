import { SelectableListComponent } from "../utils/SelectableListComponent";
import { useSelection } from "../shared/SelectionContext";

type ComponentType = "model" | "category";

interface CategoryModelComponentProps {
  type: ComponentType;
  onSelectionChange?: (elementIds: string[]) => void;
}

export function CategoryModelComponent({
  type,
  onSelectionChange,
}: CategoryModelComponentProps) {
  const {
    selectedModelIds,
    setSelectedModelIds,
    selectedCategoryIds,
    setSelectedCategoryIds,
  } = useSelection();


//note: we may want to have a single element query function that can handle both models and categories
// Note: This will help if we need to add another thing to a selectable list in the future

  if (type === "model") {
    return (
      <SelectableListComponent
        query={`SELECT m.ECInstanceId as ECInstanceId, COALESCE(p.UserLabel, p.CodeValue, 'Unnamed Model') as label FROM bis.PhysicalModel m JOIN bis.PhysicalPartition p ON p.ECInstanceId = m.ModeledElement.Id WHERE m.ECInstanceId IN (SELECT DISTINCT Model.Id FROM bis.GeometricElement3d WHERE Model.Id IS NOT NULL) ORDER BY label`}
        labelKey="label"
        idKey="ECInstanceId"
        className="BisCore:PhysicalModel"
        selectionName="ModelComponent"
        selectedIds={selectedModelIds}
        setSelectedIds={setSelectedModelIds}
        filterIds={selectedCategoryIds}
        elementQuery={(modelIds: string[], categoryIds?: string[]) => {
          if (categoryIds && categoryIds.length > 0) {
            // AND filter: both model and category
            return `SELECT ECInstanceId FROM bis.GeometricElement3d WHERE Model.Id IN (${modelIds.map((id) => `${id}`).join(",")}) AND Category.Id IN (${categoryIds.map((id) => `${id}`).join(",")}) `;
          }
          return `SELECT ECInstanceId FROM bis.GeometricElement3d WHERE Model.Id IN (${modelIds.map((id) => `${id}`).join(",")}) `;
        }}
        onSelectionChange={onSelectionChange}
        placeholder="Search Models"
      />
    );
  }

  // Default to category
  return (
    <SelectableListComponent
      query={`SELECT ECInstanceId, COALESCE(UserLabel, CodeValue, 'Unnamed Category') as label FROM bis.SpatialCategory WHERE ECInstanceId IN (SELECT DISTINCT Category.Id FROM bis.GeometricElement3d WHERE Category.Id IS NOT NULL) ORDER BY label`}
      labelKey="label"
      idKey="ECInstanceId"
      className="BisCore:SpatialCategory"
      selectionName="CategoryComponent"
      selectedIds={selectedCategoryIds}
      setSelectedIds={setSelectedCategoryIds}
      filterIds={selectedModelIds}
      elementQuery={(categoryIds: string[], modelIds?: string[]) => {
        if (modelIds && modelIds.length > 0) {
          // AND filter: both category and model
          return `SELECT ECInstanceId FROM bis.GeometricElement3d WHERE Category.Id IN (${categoryIds.map((id) => `${id}`).join(",")}) AND Model.Id IN (${modelIds.map((id) => `${id}`).join(",")}) `;
        }
        return `SELECT ECInstanceId FROM bis.GeometricElement3d WHERE Category.Id IN (${categoryIds.map((id) => `${id}`).join(",")}) `;
      }}
      onSelectionChange={onSelectionChange}
      placeholder="Search Categories"
    />
  );
}