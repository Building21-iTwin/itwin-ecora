import { SelectableListComponent } from "../utils/SelectableListComponent";
import { useSelection } from "../shared/SelectionContext";

type ComponentType = "model" | "category";

interface CategoryModelComponentProps {
  type: ComponentType;
}

export function CategoryModelComponent({
  type,
}: CategoryModelComponentProps) {
  const {
    selectedModelIds,
    setSelectedModelIds,
    selectedCategoryIds,
    setSelectedCategoryIds,
  } = useSelection();



  if (type === "model") {
    return (
      <SelectableListComponent
        query={`SELECT m.ECInstanceId as ECInstanceId, COALESCE(p.$->UserLabel, p.$->CodeValue, 'Unnamed Model') as label FROM bis.PhysicalModel m JOIN bis.PhysicalPartition p ON p.ECInstanceId = m.ModeledElement.Id WHERE m.ECInstanceId IN (SELECT DISTINCT Model.Id FROM bis.GeometricElement3d WHERE Model.Id IS NOT NULL) ORDER BY label`}
        labelKey="label"
        idKey="ECInstanceId"
        className="BisCore:PhysicalModel"
        selectedIds={selectedModelIds}
        setSelectedIds={setSelectedModelIds}
        placeholder="Search Models"
      />
    );
  }

  // Default to category
  return (
    <SelectableListComponent
      query={`SELECT ECInstanceId, COALESCE($->UserLabel, $->CodeValue, 'Unnamed Category') as label FROM bis.SpatialCategory WHERE ECInstanceId IN (SELECT DISTINCT Category.Id FROM bis.GeometricElement3d WHERE Category.Id IS NOT NULL) ORDER BY label`}
      labelKey="label"
      idKey="ECInstanceId"
      className="BisCore:SpatialCategory"
      selectedIds={selectedCategoryIds}
      setSelectedIds={setSelectedCategoryIds}
      placeholder="Search Categories"
    />
  );
}