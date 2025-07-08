import {
  StagePanelLocation,
  StagePanelSection,
  StageUsage,
} from "@itwin/appui-react";
import type { UiItemsProvider, Widget } from "@itwin/appui-react";
import RulesTable from "./RulesTable"

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
      stageUsage === StageUsage.General &&
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
