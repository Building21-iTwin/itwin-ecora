/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { 
  Flex, 
  IconButton,
  Input, 
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
  const [localValue, setLocalValue] = useState("");
  const [isApplied, setIsApplied] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

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

  // Debounced filter application
  const applyFilter = useCallback((value: string) => {
    const trimmedValue = value.trim();
    
    if (trimmedValue) {
      // Add or update filter
      const newFilter: TableFilter = {
        id: columnId,
        value: trimmedValue,
        field
      };
      
      const updatedFilters = tableFilters.filter(filter => filter.id !== columnId);
      setTableFilters([...updatedFilters, newFilter]);
      setIsApplied(true);
    } else {
      // Remove filter if value is empty
      const updatedFilters = tableFilters.filter(filter => filter.id !== columnId);
      setTableFilters(updatedFilters);
      setLocalValue("");
      setIsApplied(false);
    }
  }, [columnId, field, tableFilters, setTableFilters]);

  const removeFilter = useCallback(() => {
    const updatedFilters = tableFilters.filter(filter => filter.id !== columnId);
    setTableFilters(updatedFilters);
    setLocalValue("");
    setIsApplied(false);
  }, [columnId, tableFilters, setTableFilters]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setLocalValue(value);

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer for debounced filter application
    const timer = setTimeout(() => {
      applyFilter(value);
    }, 300); // 300ms debounce

    setDebounceTimer(timer);
  }, [applyFilter, debounceTimer]);

  const handleKeyPress = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        setDebounceTimer(null);
      }
      applyFilter(localValue);
    } else if (event.key === "Escape") {
      removeFilter();
    }
  }, [applyFilter, removeFilter, localValue, debounceTimer]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  // Check if field supports filtering
  const isFilterable = useMemo(() => {
    if (!field?.isPropertiesField()) {
      return false;
    }
    
    // For now, only support string properties for LIKE queries
    const property = field.properties?.[0]?.property;
    return property?.type === "string";
  }, [field]);

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
    <Flex alignItems="center" gap="xs" style={{ padding: "2px 4px", minWidth: "120px" }}>
      <div style={{ position: "relative", flex: 1 }}>
        <Input
          value={localValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          placeholder={placeholder || `Filter ${columnLabel}...`}
          size="small"
          style={{ 
            paddingRight: isApplied ? "24px" : "8px",
            fontSize: "12px"
          }}
        />
        
        {isApplied && (
          <IconButton
            size="small"
            styleType="borderless"
            onClick={removeFilter}
            style={{
              position: "absolute",
              right: "2px",
              top: "50%",
              transform: "translateY(-50%)",
              padding: "2px",
              minHeight: "16px",
              minWidth: "16px"
            }}
            label="Clear filter"
          >
            <SvgClose style={{ fontSize: "10px" }} />
          </IconButton>
        )}
      </div>
      
      {isApplied && (
        <span>
          <SvgFilter style={{ fontSize: "8px", color: "primary" }} />
        </span>
      )}
    </Flex>
  );
}

// Component to show active filters summary
export function ActiveFiltersDisplay() {
  const { tableFilters, setTableFilters } = useSelection();

  const clearAllFilters = useCallback(() => {
    setTableFilters([]);
  }, [setTableFilters]);

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
