import {
  StagePanelLocation,
  StagePanelSection,
  StageUsage,
  type UiItemsProvider,
  type Widget,
} from "@itwin/appui-react";
import { CategoryModelComponent } from "../shared/CategoryModelComponent";


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
        content: <CategoryModelComponent type="category" />,
      };
      widgets.push(firstWidget);

      const secondWidget: Widget = {
        id: "SecondWidget",
        label: "Models",
        content: <CategoryModelComponent type="model" />,
      };
      widgets.push(secondWidget);

      return widgets;
    }
    return [];
  }
}