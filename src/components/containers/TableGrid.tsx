/* eslint-disable no-duplicate-imports */

/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/
import * as React from "react";
import { PropertyRecord } from "@itwin/appui-abstract";
import { IModelConnection } from "@itwin/core-frontend";
import { Flex, ProgressRadial, Text, Table as UiTable } from "@itwin/itwinui-react";
import { PropertyValueFormat } from "@itwin/appui-abstract";
import {
  TableCellRenderer,
  usePresentationTableWithUnifiedSelection,
} from "@itwin/presentation-components";
import type {
  TableColumnDefinition,
  TableRowDefinition,
} from "@itwin/presentation-components";
import { CenteredContent } from "../UIProviders/CenteredContext";
import { useSelection } from "../shared/SelectionContext";
import { ActiveFiltersDisplay, ColumnFilter } from "./TableFilter";

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

export function Table({ iModel, width, height, loadingContentState, noContentState, noRowsState }: TableProps) {
  const { tableFilters, setAvailableFields } = useSelection();

  // Define ruleset before usage
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

  // Get columns and rows from presentation table hook
  const { columns, rows, isLoading: _isLoading, loadMoreRows } =
    usePresentationTableWithUnifiedSelection({
      imodel: iModel,
      ruleset,
      pageSize: 1000,
      columnMapper: mapColumns,
      rowMapper: mapRows,
    });

  // Filter rows after rows are available
  const filteredRows = React.useMemo(() => {
    if (!rows) return [];
    return rows.filter(row => {
      for (const filter of tableFilters) {
        // Only use displayValue for PrimitiveValue
        const value = row[filter.columnId]?.value;
        const cellValue =
          value?.valueFormat === PropertyValueFormat.Primitive
            ? value.displayValue
            : undefined;
        if (typeof cellValue !== "string" || !cellValue.toLowerCase().includes(filter.value.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [rows, tableFilters]);

  // Update available fields when columns change
  React.useEffect(() => {
    if (columns && columns.length > 0) {
      const fields = columns.map(col => (col as any).field).filter(Boolean);
      setAvailableFields(fields);
    }
  }, [columns, setAvailableFields]);

  // Counter for number of elements (rows) - using actual rows since filtering is done on backend
  const totalCount = rows ? rows.length : 0;

  if (columns === undefined) {
    return (
      loadingContentState?.() ?? (
        <CenteredContent width={width} height={height}>
          <ProgressRadial size="large" indeterminate={true} />
          Loading table content...
        </CenteredContent>
      )
    );
  }

  if (columns.length === 0) {
    return (
      noContentState?.() ?? (
        <CenteredContent width={width} height={height}>
          There is no content for current selection.
        </CenteredContent>
      )
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Active Filters Display */}
      {tableFilters.length > 0 && (
        <div style={{ padding: "0.5rem" }}>
          <ActiveFiltersDisplay />
        </div>
      )}
    
      
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
        <UiTable
          columns={columns}
          data={filteredRows}
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
