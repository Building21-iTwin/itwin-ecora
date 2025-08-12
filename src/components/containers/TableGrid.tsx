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
import { Button, ProgressRadial, Text, Table as UiTable } from "@itwin/itwinui-react";
import {
  TableCellRenderer,
  usePresentationTableWithUnifiedSelection,
} from "@itwin/presentation-components";
import type {
  TableColumnDefinition,
  TableRowDefinition,
} from "@itwin/presentation-components";
import { useSelection } from "../shared/SelectionContext";
import { ColumnFilter } from "./TableFilter";

// Unified component to show all active filters (selections + column filters)
function UnifiedFiltersDisplay() {
  const {
    selectedCategoryIds,
    selectedModelIds,
    selectedClassNames,
    selectedSchemaNames,
    setSelectedCategoryIds,
    setSelectedModelIds,
    setSelectedClassNames,
    tableFilters,
    clearAllFilters,
  } = useSelection();
  
  const [isVisible, setIsVisible] = React.useState(true);
  
  const hasSelections =
    selectedCategoryIds.length > 0 ||
    selectedModelIds.length > 0 ||
    selectedClassNames.length > 0 ||
    selectedSchemaNames.length > 0;
    
  const hasColumnFilters = tableFilters.length > 0;
  const hasAnyFilters = hasSelections || hasColumnFilters;
  
  if (!hasAnyFilters) {
    return null;
  }

  const clearAllSelections = () => {
    setSelectedCategoryIds([]);
    setSelectedModelIds([]);
    setSelectedClassNames([]);
    clearAllFilters();
  };

  const totalFilters = selectedCategoryIds.length + selectedModelIds.length + selectedClassNames.length + tableFilters.length;

  // Helper function for singular/plural
  const pluralize = (count: number, singular: string, plural?: string) => {
    if (count === 1) return singular;
    return plural || `${singular}s`;
  };

  // Shared badge style for all filter/selection bubbles
  const badgeStyle: React.CSSProperties = {
    color: "white",
    padding: "1px 6px",
    borderRadius: "8px",
    fontSize: "0.7rem",
    fontWeight: 500,
    display: "inline-flex",
    alignItems: "center",
    lineHeight: "1",
    minHeight: "22px",
    height: "22px",
    gap: "2px"
  };

  return (
    <div style={{ 
      padding: "0.2rem 0.4rem", 
      backgroundColor: "#f8f9fa", 
      borderLeft: "2px solid #007bff", 
      borderRadius: "0 3px 3px 0",
      marginBottom: "0.15rem",
      fontSize: "0.7rem"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flex: 1 }}>
          <Button
            size="small"
            styleType="borderless"
            onClick={() => setIsVisible(!isVisible)}
            style={{ 
              minHeight: "16px",
              minWidth: "16px",
              padding: "0",
              color: "#0056b3",
              fontSize: "0.6rem"
            }}
          >
            {isVisible ? "−" : "+"}
          </Button>
          <span style={{ 
            fontWeight: 600, 
            color: "#0056b3"
          }}>
            {totalFilters} active {pluralize(totalFilters, "filter")}
          </span>
          
          {isVisible && (
            <div style={{ 
              display: "flex", 
              gap: "0.2rem", 
              flexWrap: "wrap", 
              marginLeft: "0.5rem"
            }}>
              {/* Selection filters */}
              {selectedCategoryIds.length > 0 && (
                <span style={{ ...badgeStyle, backgroundColor: "#fd7e14" }}>
                  {selectedCategoryIds.length} {pluralize(selectedCategoryIds.length, "Category", "Categories")}
                </span>
              )}
              {selectedModelIds.length > 0 && (
                <span style={{ ...badgeStyle, backgroundColor: "#20c997" }}>
                  {selectedModelIds.length} {pluralize(selectedModelIds.length, "Model")}
                </span>
              )}
              {selectedClassNames.length > 0 && (
                <span style={{ ...badgeStyle, backgroundColor: "#6f42c1" }}>
                  {selectedClassNames.length} {pluralize(selectedClassNames.length, "Class", "Classes")}
                </span>
              )}          
              {/* Column filters */}
              {tableFilters.map((filter) => (
                <span 
                  key={filter.id}
                  style={{ ...badgeStyle, backgroundColor: "#17a2b8" }}
                >
                  <span>
                    &ldquo;{filter.value}&rdquo;
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
        
        <Button 
          size="small" 
          styleType="borderless" 
          onClick={clearAllSelections}
          style={{ 
            color: "#0056b3",
            fontSize: "0.6rem",
            padding: "0.1rem 0.3rem",
            minHeight: "auto"
          }}
        >
          Clear All
        </Button>
      </div>
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
  const { tableFilters, setAvailableFields, selectedCategoryIds, selectedModelIds } = useSelection();
  
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
  // const totalCount = rows ? rows.length : 0;

  if (columns === undefined) {
    return (
      loadingContentState?.() ?? (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
          {/* Unified Filters Display */}
          <UnifiedFiltersDisplay />
          
          {/* Loading Message Row */}
          <div style={{ padding: "1rem", display: "flex", justifyContent: "center", alignItems: "center", flex: 1 }}>
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
          {/* Unified Filters Display */}
          <UnifiedFiltersDisplay />
          
          {/* No Content Message Row */}
          <div style={{ padding: "1rem", display: "flex", justifyContent: "center", alignItems: "center", flex: 1 }}>
            <Text>
              {tableFilters.length > 0 || selectedCategoryIds.length > 0 || selectedModelIds.length > 0 
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
      {/* Unified Filters Display */}
      <UnifiedFiltersDisplay />
      
      {/* Table - Takes up most of the space */}
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