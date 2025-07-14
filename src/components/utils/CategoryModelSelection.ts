/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-deprecated */
/**
 * 
 * Utility for handling combined category/model selection in the iTwin.js viewer.
 * Builds ECSQL queries to find elements matching selected categories and/or models.
 * Updates Presentation selection and emphasizes elements in the 3D viewport.
 * Used by the main App context for cross-filtering and highlighting.
 * SelectableListComponent.tsx is for UI selection of a single type (category or model).
 * categoryModelSelection.ts is for applying the combined selection to the 3D view and Presentation system.
 * 
 * @param categoryIds Array of category ECInstanceIds
 * @param modelIds Array of model ECInstanceIds
 * @param querySelectionContext Base ECSQL query string (e.g. 'SELECT ECInstanceId, ClassName FROM bis.GeometricElement3d WHERE ')
 */
import { EmphasizeElements, IModelApp } from "@itwin/core-frontend";
import { Presentation } from "@itwin/presentation-frontend";
import { QueryBinder, QueryRowFormat } from "@itwin/core-common";

export async function categoryModelSelection(
  categoryIds: string[],
  modelIds: string[],
  querySelectionContext: string
) {
  const iModel = IModelApp.viewManager.selectedView?.iModel;
  if (!iModel) return;

  let query = querySelectionContext;
  let queryParams: any[] = [];

  // If nothing selected, clear selection and emphasis
  if (categoryIds.length === 0 && modelIds.length === 0) {
    Presentation.selection.clearSelection("category/model", iModel, 0);
    const emphasize = EmphasizeElements.getOrCreate(IModelApp.viewManager.selectedView!);
    emphasize.clearEmphasizedElements(IModelApp.viewManager.selectedView!);
    return;
  } else if (categoryIds.length > 0 && modelIds.length > 0) {
    // Both categories and models selected: filter by both
    query += "InVirtualSet(?, Category.Id) AND InVirtualSet(?, Model.Id)";
    queryParams = [categoryIds, modelIds];
  } else if (modelIds.length > 0) {
    // Only models selected
    query += "InVirtualSet(?, Model.Id)";
    queryParams = [modelIds];
  } else if (categoryIds.length > 0) {
    // Only categories selected
    query += "InVirtualSet(?, Category.Id)";
    queryParams = [categoryIds];
  }

  // Query for matching elements
  const queryReader = iModel.createQueryReader(
    query,
    QueryBinder.from(queryParams),
    { rowFormat: QueryRowFormat.UseECSqlPropertyNames }
  );
  const elements = await queryReader.toArray();

  // Update Presentation selection with found elements
  Presentation.selection.replaceSelection(
    "category/model",
    iModel,
    elements.map((element: any) => ({
      id: element.id || element.ECInstanceId,
      className: element.classname || element.ClassName,
    }))
  );

  // Emphasize elements in the active viewport for visual feedback
  const vp = IModelApp.viewManager.selectedView;
  if (vp && elements.length > 0) {
    const emphasize = EmphasizeElements.getOrCreate(vp);
    emphasize.clearEmphasizedElements(vp);
    emphasize.emphasizeElements(
      elements.map((el: any) => el.id || el.ECInstanceId),
      vp,
      undefined,
      true
    );
  }
}
