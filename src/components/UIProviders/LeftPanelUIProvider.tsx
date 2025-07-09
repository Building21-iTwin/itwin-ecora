import {
  StagePanelLocation,
  StagePanelSection,
  StageUsage,
  type UiItemsProvider,
  type Widget,
} from "@itwin/appui-react";
import { CategoryComponent } from "../shared/CategoryComponent";
import { ModelComponent } from "../shared/ModelComponent";


export class LeftPanelUIProvider implements UiItemsProvider {
  public readonly id = "LeftPanelUIProvider";

  public provideWidgets(
    _stageId: string,
    stageUsage: string,
    location: StagePanelLocation,
    section?: StagePanelSection
  ): ReadonlyArray<Widget> {
    const widgets: Widget[] = [];
    if (
      stageUsage === StageUsage.General.valueOf() &&
      location === StagePanelLocation.Left &&
      section === StagePanelSection.Start
    ) {
      const firstWidget: Widget = {
        id: "FirstWidget",
        label: "Category",
        content: <CategoryComponent />,
      };
      widgets.push(firstWidget);

      const secondWidget: Widget = {
        id: "SecondWidget",
        label: "Models",
        content: <ModelComponent />,
      };
      widgets.push(secondWidget);

      return widgets;
    }
    return [];
  }
}   