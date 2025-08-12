import {
  StagePanelLocation,
  StagePanelSection,
  StageUsage,
  type UiItemsProvider,
  type Widget,
} from "@itwin/appui-react";
import { CategoryModelComponent } from "../shared/CategoryModelComponent";
import { SchemaBrowser } from "../containers/ClassBrowser";
import { IModelApp, type IModelConnection } from "@itwin/core-frontend";
import { ProgressRadial, Text } from "@itwin/itwinui-react";
import { useEffect, useState } from "react";

function SchemaBrowserWrapper() {
  const [iModel, setIModel] = useState<IModelConnection | undefined>(undefined);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkForIModel = () => {
      const currentIModel = IModelApp.viewManager.selectedView?.iModel;
      if (currentIModel) {
        setIModel(currentIModel);
        setIsChecking(false);
      } else {
        // Keep checking until iModel is available
        setTimeout(checkForIModel, 100);
      }
    };

    checkForIModel();
  }, []);

  if (isChecking) {
    return (
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center", 
        height: "200px",
        gap: "1rem"
      }}>
        <ProgressRadial size="large" indeterminate={true} />
        <Text>Waiting for iModel to load...</Text>
      </div>
    );
  }
  
  if (!iModel) {
    return (
      <div style={{ 
        padding: "2rem", 
        textAlign: "center",
        backgroundColor: "#f5f5f5",
        borderRadius: "4px"
      }}>
        <Text>No iModel available. Please load an iModel first.</Text>
      </div>
    );
  }
  
  return <SchemaBrowser iModel={iModel} />;
}

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

    const thirdWidget: Widget = {
        id: "ThirdWidget",
    label: "Classes",
        content: <SchemaBrowserWrapper />,
      };
      widgets.push(thirdWidget);


      return widgets;
    }
    return [];
  }
}