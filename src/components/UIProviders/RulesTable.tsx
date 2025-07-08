import * as React from "react";
import { IModelApp, IModelConnection } from "@itwin/core-frontend";
import { Table } from "../UIProviders/TableGrid";
import { UnifiedSelectionContextProvider } from "@itwin/presentation-components";
import { useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";

function RulesTable() {
  const [iModel, setIModel] = React.useState<IModelConnection | undefined>(
    undefined
  );

  useEffect(() => {
    setIModel(IModelApp.viewManager.selectedView?.iModel);
  }, [iModel]);

  if (!iModel) {
    return (
      <div>
        <span>No iModel selected</span>
      </div>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ResetPage}>
      <UnifiedSelectionContextProvider imodel={iModel}>
        <Table width={800} height={600} iModel={iModel} />
      </UnifiedSelectionContextProvider>
    </ErrorBoundary>
  );
}

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
