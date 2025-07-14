import * as React from "react";
import { Table } from "./TableGrid";
import { ErrorBoundary } from "react-error-boundary";
import { useActiveIModelConnection } from "@itwin/appui-react";

/**
 * RulesTable renders the bottom grid (description grid) and connects it to the active iModel.
 *
 * It uses the useActiveIModelConnection hook from @itwin/appui-react to reliably obtain
 * the current iModel connection, instead of accessing IModelApp.viewManager.selectedView directly.
 *
 * This ensures the table will render as soon as the iModel is available, and will update
 * automatically if the active iModel changes.
 */
const RulesTable: React.FC = () => {
  // Log every render for debugging
  console.log("[RulesTable] RENDER");

  // Get the current active iModel connection from the iTwin UI framework
  // This hook will update the component when the iModel becomes available or changes
  const iModel = useActiveIModelConnection();

  // Log whenever the iModel changes (for debugging and development)
  React.useEffect(() => {
    console.log("[RulesTable] iModel changed:", iModel);
  }, [iModel]);

  // If there is no iModel yet, show a placeholder and log the state
  if (!iModel) {
    console.log("[RulesTable] No iModel selected");
    return (
      <div>
        <span>No iModel selected</span>
      </div>
    );
  }

  // Render the Table component inside an error boundary for robustness
  return (
    <ErrorBoundary FallbackComponent={ResetPage}>
      <Table
        width={800}
        height={600}
        iModel={iModel}
      />
    </ErrorBoundary>
  );
};

/**
 * Error boundary fallback UI for the RulesTable.
 * Logs the error and provides a refresh button for the user.
 */
function ResetPage(props: { error: Error; resetErrorBoundary: () => void }) {
  console.log("[RulesTable] ErrorBoundary fallback", props.error);
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
