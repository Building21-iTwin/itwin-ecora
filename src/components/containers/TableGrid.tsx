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
import { ProgressRadial, Table as UiTable } from "@itwin/itwinui-react";
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
  React.useEffect(() => {
    return () => {
    };
  }, []);

  React.useEffect(() => {
  }, [iModel, width, height]);


  const { columns, rows, isLoading, loadMoreRows } =
    usePresentationTableWithUnifiedSelection({
      imodel: iModel,
      ruleset: ruleSet,
      pageSize: 1000, // Show up to 1000 elements at once
      columnMapper: mapColumns,
      rowMapper: mapRows,
    });

  // Counter for number of elements (rows)
  const elementCount = rows ? rows.length : 0;

  // Track total count of available elements (even if not all are loaded)
  const [totalCount, setTotalCount] = React.useState<number | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    async function fetchTotalCount() {
      if (!iModel) {
        setTotalCount(null);
        return;
      }
      try {
        // This query should match the ruleset's selection logic for the table
        // For most use cases, this will be the count of selected node instances
        const query = `SELECT COUNT(*) as count FROM bis.GeometricElement3d WHERE ECInstanceId IN (SELECT ECInstanceId FROM bis.GeometricElement3d)`;
        const reader = iModel.createQueryReader(query);
        const countRows = await reader.toArray();
        if (!cancelled && countRows && countRows[0] && typeof countRows[0].count === "number") {
          setTotalCount(countRows[0].count);
        } else if (!cancelled) {
          setTotalCount(null);
        }
      } catch {
        if (!cancelled) setTotalCount(null);
      }
    }
    void fetchTotalCount();
    return () => { cancelled = true; };
  }, [iModel]);

  React.useEffect(() => {
  }, [columns, rows]);

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
      <div style={{ padding: "0.5rem", fontWeight: 500, fontSize: "0.95rem", color: "#333" }}>
        Showing {elementCount} of {totalCount !== null ? totalCount : "..."} element{(totalCount === 1 || elementCount === 1) ? "" : "s"}
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <UiTable
          columns={columns}
          data={rows}
          enableVirtualization={true}
          emptyTableContent={noRowsState?.() ?? <>No rows.</>}
          onBottomReached={loadMoreRows}
          isLoading={isLoading}
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
    Header: columnDefinitions.label,
    Cell: cellRenderer,
    width: 225,
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
