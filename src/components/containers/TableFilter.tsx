/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/

import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  Button, 
  Flex,
  IconButton, 
  Input,
  Popover,
  Text,
  Tooltip
} from "@itwin/itwinui-react";
import { SvgClose, SvgFilter } from "@itwin/itwinui-icons-react";
import type { Field } from "@itwin/presentation-common";
import { type TableFilter, useSelection } from "../shared/SelectionContext";
import { getFieldTypeInfo } from "../utils/FieldTypeInfo";

export interface TableFilterProps {
  columnId: string;
  columnLabel: string;
  field?: Field;
  placeholder?: string;
}


export function ColumnFilter({ columnId, columnLabel, field, placeholder }: TableFilterProps) {
  const { tableFilters, setTableFilters } = useSelection();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [localValue, setLocalValue] = useState("");
  const [isApplied, setIsApplied] = useState(false);

// Find existing filter for this column
  const existingFilter = useMemo(() =>
    tableFilters.find(filter => filter.id === columnId),
    [tableFilters, columnId]
  );

  // Sync local value with existing filter
  useEffect(() => {
    if (existingFilter) {
      setLocalValue(existingFilter.value);
      setIsApplied(true);
    } else {
      setLocalValue("");
      setIsApplied(false);
    }
  }, [existingFilter]);

  // Check if field supports filtering (string property or nav prop)
  const { isFilterable } = useMemo(() => getFieldTypeInfo(field), [field]);

  const applyFilter = useCallback(() => {
    const trimmedValue = localValue.trim();
    if (trimmedValue) {
      const newFilter: TableFilter = {
        id: columnId,
        value: trimmedValue,
        field,
        columnId: undefined
      };
      const updatedFilters = tableFilters.filter(filter => filter.id !== columnId);
      setTableFilters([...updatedFilters, newFilter]);
      setIsApplied(true);
      setPopoverOpen(false);
    } else {
      // Remove filter if value is empty
      const updatedFilters = tableFilters.filter(filter => filter.id !== columnId);
      setTableFilters(updatedFilters);
      setLocalValue("");
      setIsApplied(false);
      setPopoverOpen(false);
    }
  }, [columnId, field, tableFilters, setTableFilters, localValue]);

  const removeFilter = useCallback(() => {
    const updatedFilters = tableFilters.filter(filter => filter.id !== columnId);
    setTableFilters(updatedFilters);
    setLocalValue("");
    setIsApplied(false);
    setPopoverOpen(false);
  }, [columnId, tableFilters, setTableFilters]);

  if (!isFilterable) {
    return (
      <Tooltip content="This column cannot be filtered">
        <div style={{ padding: "4px", opacity: 0.3 }}>
          <SvgFilter />
        </div>
      </Tooltip>
    );
  }

  return (
    <Popover
      content={
        <div style={{
          minWidth: 240,
          backgroundColor: "white",
          border: "1px solid #e1e5e9",
          borderRadius: "6px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          padding: "16px",
          display: "flex",
          flexDirection: "column"
        }}>
          <div style={{ marginBottom: "12px" }}>
            <Text variant="small" style={{ 
              fontWeight: 600, 
              marginBottom: "8px", 
              color: "#333",
              display: "block"
            }}>
              Filter {columnLabel}
            </Text>
            <Input
              value={localValue}
              onChange={e => setLocalValue(e.target.value)}
              placeholder={placeholder || `Enter filter value...`}
              size="small"
              style={{ 
                fontSize: "12px",
                width: "100%"
              }}
              onKeyDown={e => {
                if (e.key === "Enter") applyFilter();
                if (e.key === "Escape") setPopoverOpen(false);
              }}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
          </div>
          <div style={{
            borderTop: "1px solid #e1e5e9",
            paddingTop: "12px",
            marginTop: "0"
          }}>
            <Flex gap="xs" justifyContent="flex-end" style={{ width: "100%" }}>
              <Button size="small" styleType="borderless" onClick={() => setPopoverOpen(false)}>
                Cancel
              </Button>
              <Button size="small" onClick={applyFilter} disabled={!localValue.trim()}>
                Apply
              </Button>
              {isApplied && (
                <Button size="small" styleType="borderless" onClick={removeFilter}>
                  <SvgClose />
                </Button>
              )}
            </Flex>
          </div>
        </div>
      }
      placement="bottom"
      visible={popoverOpen}
      onVisibleChange={setPopoverOpen}
      // manual control, no trigger prop
    >
      <IconButton
        size="small"
        styleType={isApplied ? "high-visibility" : "borderless"}
        onClick={() => setPopoverOpen(true)}
        label={isApplied ? "Edit filter" : "Add filter"}
        style={{ minHeight: "20px", minWidth: "20px" }}
      >
        <SvgFilter style={{ fontSize: "14px" }} />
      </IconButton>
    </Popover>
  );
}

// Component to show active filters summary
export function ActiveFiltersDisplay() { 
  const { tableFilters, setTableFilters, clearAllFilters } = useSelection();
  const [isVisible, setIsVisible] = useState(true);

  if (tableFilters.length === 0) {
    return null;
  }

  return (
    <div style={{ 
      padding: "0.2rem 0.4rem", 
      backgroundColor: "#f8f9fa", 
      borderLeft: "2px solid #0073e6",
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
            {tableFilters.length} filter{tableFilters.length === 1 ? "" : "s"} active
          </span>
          
          {isVisible && (
            <div style={{ 
              display: "flex", 
              gap: "0.2rem", 
              flexWrap: "wrap", 
              marginLeft: "0.5rem"
            }}>
              {tableFilters.map((filter) => (
                <span 
                  key={filter.id}
                  style={{ 
                    backgroundColor: "#0073e6", 
                    color: "white", 
                    fontSize: "0.6rem", 
                    padding: "1px 4px",
                    borderRadius: "8px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "2px",
                    fontWeight: 500,
                    maxWidth: "100px",
                    overflow: "hidden"
                  }}
                >
                  <span style={{ 
                    overflow: "hidden", 
                    textOverflow: "ellipsis", 
                    whiteSpace: "nowrap" 
                  }}>
                    {filter.id}: &ldquo;{filter.value}&rdquo;
                  </span>
                  <IconButton
                    size="small"
                    styleType="borderless"
                    onClick={() => {
                      const updatedFilters = tableFilters.filter(f => f.id !== filter.id);
                      setTableFilters(updatedFilters);
                    }}
                    style={{ 
                      padding: "1px",
                      minHeight: "10px",
                      minWidth: "10px",
                      color: "white",
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                      borderRadius: "50%"
                    }}
                  >
                    <SvgClose style={{ fontSize: "6px" }} />
                  </IconButton>
                </span>
              ))}
            </div>
          )}
        </div>
        
        <Button 
          size="small" 
          styleType="borderless" 
          onClick={clearAllFilters}
          style={{ 
            color: "#0056b3",
            fontSize: "0.6rem",
            padding: "0.1rem 0.3rem",
            minHeight: "auto"
          }}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
