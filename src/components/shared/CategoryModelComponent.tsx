import { SelectableListComponent } from "../utils/SelectableListComponent";

type ComponentType = "model" | "category";

interface CategoryModelComponentProps {
  type: ComponentType;
  onSelectionChange?: (elementIds: string[]) => void;
}

export function CategoryModelComponent({
  type,
  onSelectionChange,
}: CategoryModelComponentProps) {
  if (type === "model") {
    return (
      <SelectableListComponent
        query={`SELECT m.ECInstanceId as ECInstanceId, COALESCE(p.UserLabel, p.CodeValue, 'Unnamed Model') as label FROM bis.PhysicalModel m JOIN bis.PhysicalPartition p ON p.ECInstanceId = m.ModeledElement.Id WHERE m.ECInstanceId IN (SELECT DISTINCT Model.Id FROM bis.GeometricElement3d WHERE Model.Id IS NOT NULL) ORDER BY label`}
        labelKey="label"
        idKey="ECInstanceId"
        className="BisCore:PhysicalModel"
        selectionName="ModelComponent"
        elementQuery={(ids: string[]) =>
          `SELECT ECInstanceId FROM bis.GeometricElement3d WHERE Model.Id IN (${ids
            .map((id: string) => `${id}`)
            .join(",")}) LIMIT 1000`
        }
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
      elementQuery={(ids: string[]) =>
        `SELECT ECInstanceId FROM bis.GeometricElement3d WHERE Category.Id IN (${ids
          .map((id: string) => `${id}`)
          .join(",")}) LIMIT 1000`
      }
      onSelectionChange={onSelectionChange}
      placeholder="Search Categories"
    />
  );
}