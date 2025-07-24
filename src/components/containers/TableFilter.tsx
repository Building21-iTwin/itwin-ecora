/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/

import  { useCallback, useEffect, useMemo, useState } from "react";
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

  // Check if field supports filtering
  const isFilterable = useMemo(() => {
    if (!field?.isPropertiesField()) {
      return false;
    }
    // For now, only support string properties for LIKE queries
    const property = field.properties?.[0]?.property;
    return property?.type === "string";
  }, [field]);

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
        <Flex flexDirection="column" gap="sm" style={{ minWidth: 220 }}>
          <Input
            value={localValue}
            onChange={e => setLocalValue(e.target.value)}
            placeholder={placeholder || `Filter ${columnLabel}...`}
            size="small"
            style={{ fontSize: "12px" }}
            onKeyDown={e => {
              if (e.key === "Enter") applyFilter();
              if (e.key === "Escape") setPopoverOpen(false);
            }}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          <Flex gap="xs" justifyContent="flex-end">
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
        </Flex>
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

  if (tableFilters.length === 0) {
    return null;
  }

  return (
    <Flex alignItems="center" gap="sm" style={{ padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "4px" }}>
      <Text variant="small" style={{ fontWeight: 500 }}>
        Active filters:
      </Text>
      <Flex gap="xs" style={{ flexWrap: "wrap" }}>
        {tableFilters.map((filter) => (
          <span 
            key={filter.id}
            style={{ 
              backgroundColor: "#0073e6", 
              color: "white", 
              fontSize: "11px", 
              padding: "2px 6px",
              borderRadius: "4px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            {filter.id}: &ldquo;{filter.value}&rdquo;
            <IconButton
              size="small"
              styleType="borderless"
              onClick={() => {
                const updatedFilters = tableFilters.filter(f => f.id !== filter.id);
                setTableFilters(updatedFilters);
              }}
              style={{ 
                marginLeft: "4px", 
                padding: "1px",
                minHeight: "14px",
                minWidth: "14px",
                color: "white"
              }}
            >
              <SvgClose style={{ fontSize: "8px" }} />
            </IconButton>
          </span>
        ))}
      </Flex>
      <IconButton
        size="small"
        styleType="borderless"
        onClick={clearAllFilters}
        label="Clear all filters"
      >
        <SvgClose />
      </IconButton>
    </Flex>
  );
}
