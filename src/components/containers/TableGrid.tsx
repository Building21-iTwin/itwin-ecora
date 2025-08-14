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
import { Button, IconButton, ProgressRadial, Text, Table as UiTable } from "@itwin/itwinui-react";
import { SvgClose } from "@itwin/itwinui-icons-react";
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
// useSelection already imported above

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
  categoryLabels,
  modelLabels,
    tableFilters,
    setTableFilters,
    clearAllFilters,
  } = useSelection();
  
  const [isVisible, setIsVisible] = React.useState(true);
  const [expandedCategories, setExpandedCategories] = React.useState(false);
  const [expandedModels, setExpandedModels] = React.useState(false);
  const [expandedClasses, setExpandedClasses] = React.useState(false);
  const [expandedTableFilters, setExpandedTableFilters] = React.useState(false);
  
  // Labels come from SelectionContext now
  
  const hasSelections =
    selectedCategoryIds.length > 0 ||
    selectedModelIds.length > 0 ||
    selectedClassNames.length > 0 ||
    selectedSchemaNames.length > 0;
    
  const hasColumnFilters = tableFilters.length > 0;
  const hasAnyFilters = hasSelections || hasColumnFilters;
  
  // No re-query here; labels are pushed from the selection lists
  
  if (!hasAnyFilters) {
    return null;
  }

  const clearAllSelections = () => {
    setSelectedCategoryIds([]);
    setSelectedModelIds([]);
    setSelectedClassNames([]);
    clearAllFilters();
  };

  // Individual removal functions
  const removeCategoryFilter = () => {
    setSelectedCategoryIds([]);
    setExpandedCategories(false);
  };

  const removeModelFilter = () => {
    setSelectedModelIds([]);
    setExpandedModels(false);
  };

  const removeClassFilter = () => {
    setSelectedClassNames([]);
    setExpandedClasses(false);
  };

  const removeTableFilter = (filterId: string) => {
    const updatedFilters = tableFilters.filter(filter => filter.id !== filterId);
    setTableFilters(updatedFilters);
  };

  // Remove individual category
  const removeCategory = (categoryId: string) => {
    const updatedIds = selectedCategoryIds.filter(id => id !== categoryId);
    setSelectedCategoryIds(updatedIds);
  };

  // Remove individual model
  const removeModel = (modelId: string) => {
    const updatedIds = selectedModelIds.filter(id => id !== modelId);
    setSelectedModelIds(updatedIds);
  };

  // Remove individual class
  const removeClass = (className: string) => {
    const updatedNames = selectedClassNames.filter(name => name !== className);
    setSelectedClassNames(updatedNames);
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
    gap: "4px",
    cursor: "pointer",
    position: "relative"
  };

  // Style for the close button that appears on hover
  const closeButtonStyle: React.CSSProperties = {
    padding: "1px",
    minHeight: "12px",
    minWidth: "12px",
    color: "white",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: "50%",
    opacity: 0,
    transition: "opacity 0.2s ease"
  };

  const individualItemStyle: React.CSSProperties = {
    ...badgeStyle,
    fontSize: "0.65rem",
    minHeight: "20px",
    height: "20px",
    margin: "1px"
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
              {/* Selection filters with X buttons */}
              {selectedCategoryIds.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <button 
                    style={{ 
                      ...badgeStyle, 
                      backgroundColor: "#fd7e14",
                      border: "none"
                    }}
                    onClick={() => setExpandedCategories(!expandedCategories)}
                    onMouseEnter={(e) => {
                      const closeBtn = e.currentTarget.querySelector('.close-button') as HTMLElement;
                      if (closeBtn) closeBtn.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      const closeBtn = e.currentTarget.querySelector('.close-button') as HTMLElement;
                      if (closeBtn) closeBtn.style.opacity = '0';
                    }}
                  >
                    <span>
                      {selectedCategoryIds.length} {pluralize(selectedCategoryIds.length, "Category", "Categories")}
                      {expandedCategories ? " ▲" : " ▼"}
                    </span>
                    <IconButton
                      className="close-button"
                      size="small"
                      styleType="borderless"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCategoryFilter();
                      }}
                      style={closeButtonStyle}
                    >
                      <SvgClose style={{ fontSize: "8px" }} />
                    </IconButton>
                  </button>
                  {expandedCategories && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "2px", marginLeft: "10px" }}>
                      {selectedCategoryIds.map(categoryId => (
                        <span 
                          key={categoryId}
                          style={{
                            ...individualItemStyle,
                            backgroundColor: "#fd7e14"
                          }}
                          onMouseEnter={(e) => {
                            const closeBtn = e.currentTarget.querySelector('.close-button') as HTMLElement;
                            if (closeBtn) closeBtn.style.opacity = '1';
                          }}
                          onMouseLeave={(e) => {
                            const closeBtn = e.currentTarget.querySelector('.close-button') as HTMLElement;
                            if (closeBtn) closeBtn.style.opacity = '0';
                          }}
                        >
                          <span>
                            {categoryLabels[categoryId] || `Category ${categoryId}`}
                          </span>
                          <IconButton
                            className="close-button"
                            size="small"
                            styleType="borderless"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeCategory(categoryId);
                            }}
                            style={closeButtonStyle}
                          >
                            <SvgClose style={{ fontSize: "6px" }} />
                          </IconButton>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {selectedModelIds.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <button 
                    style={{ 
                      ...badgeStyle, 
                      backgroundColor: "#20c997",
                      border: "none"
                    }}
                    onClick={() => setExpandedModels(!expandedModels)}
                    onMouseEnter={(e) => {
                      const closeBtn = e.currentTarget.querySelector('.close-button') as HTMLElement;
                      if (closeBtn) closeBtn.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      const closeBtn = e.currentTarget.querySelector('.close-button') as HTMLElement;
                      if (closeBtn) closeBtn.style.opacity = '0';
                    }}
                  >
                    <span>
                      {selectedModelIds.length} {pluralize(selectedModelIds.length, "Model")}
                      {expandedModels ? " ▲" : " ▼"}
                    </span>
                    <IconButton
                      className="close-button"
                      size="small"
                      styleType="borderless"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeModelFilter();
                      }}
                      style={closeButtonStyle}
                    >
                      <SvgClose style={{ fontSize: "8px" }} />
                    </IconButton>
                  </button>
                  {expandedModels && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "2px", marginLeft: "10px" }}>
                      {selectedModelIds.map(modelId => (
                        <span 
                          key={modelId}
                          style={{
                            ...individualItemStyle,
                            backgroundColor: "#20c997"
                          }}
                          onMouseEnter={(e) => {
                            const closeBtn = e.currentTarget.querySelector('.close-button') as HTMLElement;
                            if (closeBtn) closeBtn.style.opacity = '1';
                          }}
                          onMouseLeave={(e) => {
                            const closeBtn = e.currentTarget.querySelector('.close-button') as HTMLElement;
                            if (closeBtn) closeBtn.style.opacity = '0';
                          }}
                        >
                          <span>
                            {modelLabels[modelId] || `Model ${modelId}`}
                          </span>
                          <IconButton
                            className="close-button"
                            size="small"
                            styleType="borderless"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeModel(modelId);
                            }}
                            style={closeButtonStyle}
                          >
                            <SvgClose style={{ fontSize: "6px" }} />
                          </IconButton>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {selectedClassNames.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <button 
                    style={{ 
                      ...badgeStyle, 
                      backgroundColor: "#6f42c1",
                      border: "none"
                    }}
                    onClick={() => setExpandedClasses(!expandedClasses)}
                    onMouseEnter={(e) => {
                      const closeBtn = e.currentTarget.querySelector('.close-button') as HTMLElement;
                      if (closeBtn) closeBtn.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      const closeBtn = e.currentTarget.querySelector('.close-button') as HTMLElement;
                      if (closeBtn) closeBtn.style.opacity = '0';
                    }}
                  >
                    <span>
                      {selectedClassNames.length} {pluralize(selectedClassNames.length, "Class", "Classes")}
                      {expandedClasses ? " ▲" : " ▼"}
                    </span>
                    <IconButton
                      className="close-button"
                      size="small"
                      styleType="borderless"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeClassFilter();
                      }}
                      style={closeButtonStyle}
                    >
                      <SvgClose style={{ fontSize: "8px" }} />
                    </IconButton>
                  </button>
                  {expandedClasses && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "2px", marginLeft: "10px" }}>
                      {selectedClassNames.map(className => (
                        <span 
                          key={className}
                          style={{
                            ...individualItemStyle,
                            backgroundColor: "#6f42c1"
                          }}
                          onMouseEnter={(e) => {
                            const closeBtn = e.currentTarget.querySelector('.close-button') as HTMLElement;
                            if (closeBtn) closeBtn.style.opacity = '1';
                          }}
                          onMouseLeave={(e) => {
                            const closeBtn = e.currentTarget.querySelector('.close-button') as HTMLElement;
                            if (closeBtn) closeBtn.style.opacity = '0';
                          }}
                        >
                          <span>
                            {className}
                          </span>
                          <IconButton
                            className="close-button"
                            size="small"
                            styleType="borderless"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeClass(className);
                            }}
                            style={closeButtonStyle}
                          >
                            <SvgClose style={{ fontSize: "6px" }} />
                          </IconButton>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}          
              
              {/* Column filters with expandable functionality */}
              {tableFilters.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <button 
                    style={{ 
                      ...badgeStyle, 
                      backgroundColor: "#17a2b8",
                      border: "none"
                    }}
                    onClick={() => setExpandedTableFilters(!expandedTableFilters)}
                    onMouseEnter={(e) => {
                      const closeBtn = e.currentTarget.querySelector('.close-button') as HTMLElement;
                      if (closeBtn) closeBtn.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      const closeBtn = e.currentTarget.querySelector('.close-button') as HTMLElement;
                      if (closeBtn) closeBtn.style.opacity = '0';
                    }}
                  >
                    <span>
                      {tableFilters.length} {pluralize(tableFilters.length, "Filter")}
                      {expandedTableFilters ? " ▲" : " ▼"}
                    </span>
                    <IconButton
                      className="close-button"
                      size="small"
                      styleType="borderless"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearAllFilters();
                        setExpandedTableFilters(false);
                      }}
                      style={closeButtonStyle}
                    >
                      <SvgClose style={{ fontSize: "8px" }} />
                    </IconButton>
                  </button>
                  {expandedTableFilters && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "2px", marginLeft: "10px" }}>
                      {tableFilters.map((filter) => (
                        <span 
                          key={filter.id}
                          style={{
                            ...individualItemStyle,
                            backgroundColor: "#17a2b8"
                          }}
                          onMouseEnter={(e) => {
                            const closeBtn = e.currentTarget.querySelector('.close-button') as HTMLElement;
                            if (closeBtn) closeBtn.style.opacity = '1';
                          }}
                          onMouseLeave={(e) => {
                            const closeBtn = e.currentTarget.querySelector('.close-button') as HTMLElement;
                            if (closeBtn) closeBtn.style.opacity = '0';
                          }}
                        >
                          <span>
                            &ldquo;{filter.value}&rdquo;
                          </span>
                          <IconButton
                            className="close-button"
                            size="small"
                            styleType="borderless"
                            onClick={() => removeTableFilter(filter.id)}
                            style={closeButtonStyle}
                          >
                            <SvgClose style={{ fontSize: "6px" }} />
                          </IconButton>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
  const { tableFilters, setAvailableFields, selectedCategoryIds, selectedModelIds, totalSelectedCount } = useSelection();
  
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

  const totalCount = totalSelectedCount;

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
      {/* Total count display */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "2px 6px 4px",
        fontSize: "0.65rem",
        color: "#444",
        borderBottom: "1px solid #e1e5ea"
      }}>
      <span style={{ fontWeight: 500 }}>Total:</span>&nbsp;{totalCount.toLocaleString()} element{totalCount === 1 ? "" : "s"}
      </div>
      
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