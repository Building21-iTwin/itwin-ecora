/* eslint-disable no-duplicate-imports */
/**
 * This is the component that renders a table at the bottom for description grid.
 */
/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/
import * as React from "react";
import { PropertyRecord } from "@itwin/appui-abstract";
import { IModelConnection } from "@itwin/core-frontend";
import { Button, Flex, ProgressRadial, Text, Table as UiTable } from "@itwin/itwinui-react";
import {
  TableCellRenderer,
  usePresentationTableWithUnifiedSelection,
} from "@itwin/presentation-components";
import type {
  TableColumnDefinition,
  TableRowDefinition,
} from "@itwin/presentation-components";
import { useSelection } from "../shared/SelectionContext";
import { ActiveFiltersDisplay, ColumnFilter } from "./TableFilter";

// Component to show warnings for selected categories and models
function SelectionWarnings() {
  const { selectedCategoryIds, selectedModelIds, selectedClassName, setSelectedCategoryIds, setSelectedModelIds, setSelectedClassName } = useSelection();
  
  const hasSelections = selectedCategoryIds.length > 0 || selectedModelIds.length > 0 || selectedClassName;
  
  if (!hasSelections) {
    return null;
  }

  const clearAllSelections = () => {
    setSelectedCategoryIds([]);
    setSelectedModelIds([]);
    setSelectedClassName(undefined);
  };

  return (
    <div style={{ 
      padding: "0.5rem", 
      backgroundColor: "#fff3cd", 
      border: "1px solid #ffeaa7", 
      borderRadius: "4px",
      marginBottom: "0.5rem"
    }}>
      <Flex alignItems="center" gap="sm" justifyContent="space-between">
        <Flex alignItems="center" gap="sm">
          <Text variant="small" style={{ fontWeight: 500, color: "#856404" }}>
            ⚠️ Active selections filtering results:
          </Text>
          <Flex gap="xs" style={{ flexWrap: "wrap" }}>
            {selectedCategoryIds.length > 0 && (
              <Text variant="small" style={{ 
                backgroundColor: "#fd7e14", 
                color: "white", 
                padding: "2px 6px", 
                borderRadius: "4px",
                fontSize: "11px"
              }}>
                {selectedCategoryIds.length} categor{selectedCategoryIds.length === 1 ? 'y' : 'ies'}
              </Text>
            )}
            {selectedModelIds.length > 0 && (
              <Text variant="small" style={{ 
                backgroundColor: "#20c997", 
                color: "white", 
                padding: "2px 6px", 
                borderRadius: "4px",
                fontSize: "11px"
              }}>
                {selectedModelIds.length} model{selectedModelIds.length === 1 ? '' : 's'}
              </Text>
            )}
            {selectedClassName && (
              <Text variant="small" style={{ 
                backgroundColor: "#6f42c1", 
                color: "white", 
                padding: "2px 6px", 
                borderRadius: "4px",
                fontSize: "11px"
              }}>
                Class: {selectedClassName.split('.').pop() || selectedClassName}
              </Text>
            )}
          </Flex>
        </Flex>
        <Button 
          size="small" 
          styleType="borderless" 
          onClick={clearAllSelections}
          style={{ color: "#856404" }}
        >
          Clear selections
        </Button>
      </Flex>
    </div>
  );
}

export interface TableProps {
  /** Width of the property grid element. */
  width: number;

  /** Height of the property grid element. */
  height: number;

  /** Connection to an iModel from which to pull property data. */
  iModel: IModelConnection;

  /** Component to be rendered while Table content is being loaded. */
  loadingContentState?: (() => React.ReactElement) | undefined;

  /** Component to be rendered if there is no content to be displayed in the table. */
  noContentState?: (() => React.ReactElement) | undefined;

  /** Component to be rendered if there are no rows to be rendered in the table. */
  noRowsState?: (() => React.ReactElement) | undefined;
}

/**
 * Displays properties of selected elements in a Table format. This component updates itself when {@linkcode EditableRuleset} content
 * changes.
 */

export function Table({ iModel, width: _width, height: _height, loadingContentState, noContentState, noRowsState }: TableProps) {
  const { tableFilters, setAvailableFields, selectedCategoryIds, selectedModelIds, selectedClassName } = useSelection();
  
  // Track loading state for initial data fetch
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  
  const ruleset = React.useMemo(() => ({
    id: "SelectedElementsRuleset",
    rules: [
      {
        ruleType: "Content" as const,
        specifications: [
          {
            specType: "SelectedNodeInstances" as const,
          },
        ],
      },
    ],
  }), []);

  const { columns, rows, isLoading, loadMoreRows } =
    usePresentationTableWithUnifiedSelection({
      imodel: iModel,
      ruleset,
      pageSize: 1000,
      columnMapper: mapColumns,
      rowMapper: mapRows,
    });

  // Reset loading state when selection changes (when columns become undefined)
  React.useEffect(() => {
    if (columns === undefined) {
      setIsInitialLoading(true);
    }
  }, [columns]);

  // Update available fields when columns change and track loading state
  React.useEffect(() => {
    if (columns && columns.length > 0) {
      const fields = columns.map(col => (col as any).field).filter(Boolean);
      setAvailableFields(fields);
      // Data has loaded, stop initial loading
      setIsInitialLoading(false);
    } else if (columns === undefined) {
      // Still loading, keep initial loading state
      setIsInitialLoading(true);
    }
  }, [columns, setAvailableFields]);

  // Counter for number of elements (rows) - using actual rows since filtering is done on backend
  const totalCount = rows ? rows.length : 0;

  if (columns === undefined) {
    return (
      loadingContentState?.() ?? (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
          {/* Selection Warnings - Always shown */}
          <SelectionWarnings />
          
          {/* Active Filters Display - Always shown */}
          <div style={{ padding: "0.5rem" }}>
            <ActiveFiltersDisplay />
          </div>
          
          {/* Element Count Display */}
          <div style={{ padding: "0.5rem", fontWeight: 500, fontSize: "0.95rem", color: "#333" }}>
            <Flex alignItems="center" gap="sm">
              <Text>Loading...</Text>
            </Flex>
          </div>
          
          {/* Loading Message Row */}
          <div style={{ padding: "2rem", display: "flex", justifyContent: "center", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
              <ProgressRadial size="large" indeterminate={true} />
              <Text>Loading table content...</Text>
            </div>
          </div>
        </div>
      )
    );
  }

  if (columns.length === 0) {
    return (
      noContentState?.() ?? (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
          {/* Selection Warnings - Always shown */}
          <SelectionWarnings />
          
          {/* Active Filters Display - Always shown */}
          <div style={{ padding: "0.5rem" }}>
            <ActiveFiltersDisplay />
          </div>
          
          {/* Element Count Display */}
          <div style={{ padding: "0.5rem", fontWeight: 500, fontSize: "0.95rem", color: "#333" }}>
            <Flex alignItems="center" gap="sm">
              <Text>Showing 0 elements</Text>
            </Flex>
          </div>
          
          {/* No Content Message Row */}
          <div style={{ padding: "2rem", display: "flex", justifyContent: "center", alignItems: "center", flex: 1 }}>
            <Text>
              {tableFilters.length > 0 || selectedCategoryIds.length > 0 || selectedModelIds.length > 0 || selectedClassName
                ? "No elements match the current filters or selections. Clear filters/selections above to see data." 
                : "There is no content for current selection."}
            </Text>
          </div>
        </div>
      )
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Selection Warnings */}
      <SelectionWarnings />
      
      {/* Active Filters Display - Always shown */}
      <div style={{ padding: "0.5rem" }}>
        <ActiveFiltersDisplay />
      </div>
      
      {/* Element Count Display */}
      <div style={{ padding: "0.5rem", fontWeight: 500, fontSize: "0.95rem", color: "#333" }}>
        <Flex alignItems="center" gap="sm">
          <Text>
            Showing  {totalCount} element{totalCount === 1 ? "" : "s"}
          </Text>
        </Flex>
      </div>
      
      {/* Table */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {isInitialLoading || isLoading ? (
          <div style={{ padding: "2rem", display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
              <ProgressRadial size="large" indeterminate={true} />
              <Text>Loading table data...</Text>
            </div>
          </div>
        ) : (
          <UiTable
            columns={columns}
            data={rows}
            enableVirtualization={true}
            emptyTableContent={
              tableFilters.length > 0 ? 
                <>No elements match the current filters.</> : 
                noRowsState?.() ?? <>No rows.</>
            }
            onBottomReached={loadMoreRows}
            density="extra-condensed"
            styleType="zebra-rows"
            style={{ width: "100%", height: "100%" }}
          />
        )}
      </div>
    </div>
  );
}

function mapColumns(columnDefinitions: TableColumnDefinition) {
  return {
    id: columnDefinitions.name,
    accessor: columnDefinitions.name,
    Header: () => (
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <Text variant="small" style={{ fontWeight: 600 }}>
          {columnDefinitions.label}
        </Text>
        <ColumnFilter
          columnId={columnDefinitions.name}
          columnLabel={columnDefinitions.label}
          field={columnDefinitions.field}
        />
      </div>
    ),
    Cell: cellRenderer,
    width: 225,
    field: columnDefinitions.field, // Include field for filtering
  };
}

function mapRows(rowDefinition: TableRowDefinition) {
  const newRow: { [key: string]: PropertyRecord } = {};
  rowDefinition.cells.forEach((cell) => {
    newRow[cell.key] = cell.record;
  });
  return newRow;
}

function cellRenderer(cellProps: { value?: PropertyRecord }) {
  if (!cellProps.value) return null;

  return <TableCellRenderer record={cellProps.value} />;
}