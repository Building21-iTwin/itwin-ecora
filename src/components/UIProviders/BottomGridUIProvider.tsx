import {
  StagePanelLocation,
  StagePanelSection,
  StageUsage,
  type UiItemsProvider,
  type Widget,
} from "@itwin/appui-react";
import RulesTable from "../containers/RulesTable"

export class BottomGridUIProvider implements UiItemsProvider {
  public readonly id = "BottomGridUIProvider";
  
 
  public provideWidgets(
    _stageId: string,
    stageUsage: string,
    location: StagePanelLocation,
    section?: StagePanelSection
  ): ReadonlyArray<Widget> {
    const widgets: Widget[] = [];
    if (
      stageUsage === StageUsage.General.toString() &&
      location === StagePanelLocation.Bottom &&
      section === StagePanelSection.Start
    ) {
      const bottomGrid: Widget = {
        id: "BottomGrid",
        label: "Description Grid",
        content: (
          <RulesTable />
      ),
    };
    widgets.push(bottomGrid);
  }
  return widgets;
};
}
