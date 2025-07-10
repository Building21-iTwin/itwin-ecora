import * as React from "react";
import { IModelApp, IModelConnection } from "@itwin/core-frontend";
import { Table } from "./TableGrid";
import { ErrorBoundary } from "react-error-boundary";
import { useSelection } from "../shared/SelectionContext";
import { UnifiedSelectionContextProvider } from "@itwin/unified-selection-react";

const RulesTable: React.FC = () => {
  const iModel: IModelConnection | undefined = IModelApp.viewManager.selectedView?.iModel;
  const { selectedKeys } = useSelection();

  if (!iModel) {
    return (
      <div>
        <span>No iModel selected</span>
      </div>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ResetPage}>
      {/* @ts-expect-error: storage prop expects SelectionStorage, but we want to pass undefined */}
      <UnifiedSelectionContextProvider storage={undefined}>
        <Table
          width={800}
          height={600}
          iModel={iModel}
          selectedKeys={selectedKeys}
        />
      </UnifiedSelectionContextProvider>
    </ErrorBoundary>
  );
};

function ResetPage(props: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <p style={{ color: "red" }}>
        Something went wrong. Please try refreshing the page.
      </p>
      <button onClick={props.resetErrorBoundary}>Refresh</button>
    </div>
  );
}

export default RulesTable;
