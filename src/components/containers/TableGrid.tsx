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
import { Flex, ProgressRadial, Text, Table as UiTable } from "@itwin/itwinui-react";
import type { Ruleset } from "@itwin/presentation-common";
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
import { useCallback, useEffect, useMemo, useState } from "react";

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
  const { tableFilters, availableFields, setAvailableFields } = useSelection();
  const [filteredRuleset, setFilteredRuleset] = useState<Ruleset>(ruleSet);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);

  // Create filtered ruleset based on active filters
  const createFilteredRuleset = useCallback((filters: typeof tableFilters): Ruleset => {
    if (filters.length === 0) {
      return ruleSet;
    }

    // Build WHERE clause for filters
    const whereConditions: string[] = [];
    filters.forEach((filter) => {
      if (filter.field?.isPropertiesField()) {
        const property = filter.field.properties[0]?.property;
        if (property && property.type === "string") {
          // Escape single quotes in filter value
          const escapedValue = filter.value.replace(/'/g, "''");
          whereConditions.push(`e.$->${property.name} LIKE '%${escapedValue}%'`);
        }
      }
    });

    if (whereConditions.length === 0) {
      return ruleSet;
    }

    // Clone the ruleset and inject the WHERE clause into the specification
    const filteredRuleSet = JSON.parse(JSON.stringify(ruleSet));
    if (filteredRuleSet && filteredRuleSet[0] && filteredRuleSet[0].specifications && filteredRuleSet[0].specifications[0]) {
      // Only works for a single specification (simple case)
      filteredRuleSet[0].specifications[0].query =
        filteredRuleSet[0].specifications[0].query.replace(
          /WHERE[\s\S]*?(ORDER BY|$)/i,
          (_: string, orderBy: string) => {
            // Remove existing WHERE, add new WHERE
            return `WHERE ${whereConditions.join(" AND ")} ${orderBy || ''}`;
          }
        );
    }
    return filteredRuleSet;
  }, []);

  // Update ruleset when filters change
  useEffect(() => {
    setIsApplyingFilters(true);
    const newRuleset = createFilteredRuleset(tableFilters);
    setFilteredRuleset(newRuleset);
    
    // Loading screen
    const timer = setTimeout(() => {
      setIsApplyingFilters(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [tableFilters, createFilteredRuleset]);

  const { columns, rows, isLoading, loadMoreRows } =
    usePresentationTableWithUnifiedSelection({
      imodel: iModel,
      ruleset: filteredRuleset,
      pageSize: 1000,
      columnMapper: mapColumns,
      rowMapper: mapRows,
    });

  // Update available fields when columns change
  useEffect(() => {
    if (columns) {
      const fields = columns.map(column => column.field).filter(Boolean);
      if (fields.length !== availableFields.length) {
        setAvailableFields(fields);
      }
    }
  }, [columns, availableFields.length, setAvailableFields]);

  // Enhanced loading state that accounts for filter application
  const isTableLoading = isLoading || isApplyingFilters;

  // Apply client-side filtering if filters are active
  const filteredRows = useMemo(() => {
    if (tableFilters.length === 0) {
      return rows;
    }

    return rows.filter(row => {
      return tableFilters.every(filter => {
        const cellValue = row[filter.id];
        if (!cellValue || !cellValue.value) {
          return false;
        }

        // Extract display value from PropertyRecord
        let displayValue = "";
        if (cellValue.value !== undefined && cellValue.value !== null) {
          if (typeof cellValue.value === "string" || typeof cellValue.value === "number") {
            displayValue = String(cellValue.value);
          } else if (cellValue.value && typeof cellValue.value === "object" && "displayValue" in cellValue.value) {
            displayValue = String((cellValue.value as any).displayValue);
          } else {
            displayValue = JSON.stringify(cellValue.value);
          }
        }
        return displayValue.toLowerCase().includes(filter.value.toLowerCase());
      });
    });
  }, [rows, tableFilters]);

  // Counter for number of elements (rows)
  const displayCount = filteredRows ? filteredRows.length : 0;
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
            Showing {displayCount} of {totalCount} element{totalCount === 1 ? "" : "s"}
          </Text>
          {tableFilters.length > 0 && displayCount !== totalCount && (
            <Text variant="small" style={{ color: "#666" }}>
              (filtered)
            </Text>
          )}
          {isApplyingFilters && (
            <ProgressRadial size="small" indeterminate={true} />
          )}
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
          isLoading={isTableLoading}
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

const ruleSet: Ruleset = {
  id: "Ruleset1",
  rules: [
    {
      ruleType: "Content",
      specifications: [
        {
          specType: "SelectedNodeInstances",
        },
      ],
    },
  ],
};
