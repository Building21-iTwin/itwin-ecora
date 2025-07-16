/* eslint-disable @typescript-eslint/no-deprecated */
/**
 *   Component for displaying a selectable list of items (e.g., categories, models).
 * - Fetches items from an ECSQL query against the current iModel.
 * - Searching, multi-select, and clearing selection.
 * - Updates iModel and Presentation selection state.
 * .
 * 
 * SelectableListComponent.tsx is for UI selection of a single type (category or model).
 * categoryModelSelection.ts is for applying the combined selection to the 3D view and Presentation system.
 *
 */
import React, { useEffect, useState } from "react";
import { IModelApp } from "@itwin/core-frontend";
import { Button, Flex, Input } from "@itwin/itwinui-react";
import { KeySet } from "@itwin/presentation-common";
import { Presentation } from "@itwin/presentation-frontend";

interface SelectableListProps {
  query: string;
  labelKey: string;
  idKey: string;
  className: string;
  selectionName: string;
  elementQuery?: (ids: string[], filterIds?: string[]) => string;
  onSelectionChange?: (elementIds: string[]) => void;
  placeholder?: string;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  filterIds?: string[];
}
export function SelectableListComponent(props: SelectableListProps) {
  const {
    query,
    labelKey,
    idKey,
    className,
    selectionName,
    elementQuery,
    onSelectionChange,
    placeholder = "Search...",
    selectedIds,
    setSelectedIds,
    filterIds,
  } = props;
  // List of items to display (id/label pairs)
  const [items, setItems] = useState<{ id: string; label: string }[]>([]);
  // Search filter string
  const [searchString, setSearchString] = useState<string>("");
  // Current iModel reference (updates on viewport change)
  const [iModel, setIModel] = useState(() => IModelApp.viewManager.selectedView?.iModel);

  // Listen for viewport changes to update iModel reference
  useEffect(() => {
    const updateIModel = () => {
      const newIModel = IModelApp.viewManager.selectedView?.iModel;
      setIModel(newIModel);
      if (!newIModel) {
        setItems([]);
        setSelectedIds([]);
      }
    };
    IModelApp.viewManager.onSelectedViewportChanged.addListener(updateIModel);
    updateIModel();
    return () => {
      IModelApp.viewManager.onSelectedViewportChanged.removeListener(updateIModel);
    };
  }, [setSelectedIds]);

  // Fetch items from ECSQL query whenever iModel or query changes
  useEffect(() => {
    let cancelled = false;
    const getItems = async () => {
      if (!iModel) {
        if (!cancelled) setItems([]);
        return;
      }
      try {
        const queryReader = iModel.createQueryReader(query);
        const rows = await queryReader.toArray();
        if (cancelled) return;
        // Map rows to {id, label} objects for display
        const list = rows.map((row: any) => ({
          id: row[idKey] || row[0],
          label: row[labelKey] || row[1] || `${className} ${row[idKey] || row[0]}`,
        }));
        setItems(list);
      } catch {
        if (!cancelled) setItems([]);
      }
    };
    void getItems();
    return () => {
      cancelled = true;
    };
  }, [iModel, query, idKey, labelKey, className]);

  // Update iModel and Presentation selection when selectedIds changes
  useEffect(() => {
    if (!iModel) return;
    let cancelled = false;
    const updateSelection = async () => {
      try {
        if (selectedIds.length > 0) {
          iModel.selectionSet.emptyAll();
          const keySet = new KeySet();
          for (const id of selectedIds) {
            try {
              keySet.add({ className, id: String(id) });
            } catch {}
          }
          Presentation.selection.replaceSelection(selectionName, iModel, keySet);
          if (elementQuery) {
            try {
              const queryStr = elementQuery(selectedIds, filterIds);
              const queryReader = iModel.createQueryReader(queryStr);
              const elements = await queryReader.toArray();
              if (cancelled) return;
              const elementIds = elements.map((row: any) => row.ECInstanceId || row[0]);
              if (elementIds.length > 0) {
                iModel.selectionSet.replace(elementIds);
              }
              onSelectionChange?.(elementIds);
            } catch {
              onSelectionChange?.(selectedIds);
            }
          } else {
            onSelectionChange?.(selectedIds);
          }
        } else {
          iModel.selectionSet.emptyAll();
          Presentation.selection.clearSelection(selectionName, iModel);
          onSelectionChange?.([]);
        }
      } catch {}
    };
    void updateSelection();
    return () => {
      cancelled = true;
    };
  }, [selectedIds, filterIds, iModel, className, selectionName, elementQuery, onSelectionChange]);

  // Handle checkbox toggle for an item
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const id = event.target.id;
    const isSelected = selectedIds.includes(id);
    const newSelectedIds = isSelected
      ? selectedIds.filter((sid) => sid !== id)
      : [...selectedIds, id];
    setSelectedIds(newSelectedIds);
  };

  // Clear all selections
  const handleClearAll = () => {
    setSelectedIds([]);
  };

  // Filter items by search string (case-insensitive)
  const searchTextLower = searchString.toLowerCase();
  const filteredItems = items.filter((item) => item.label.toLowerCase().includes(searchTextLower));

  // Render each item as a checkbox list entry
  const itemElements = filteredItems.map((item) => (
    <li
      key={item.id}
      style={{
        listStyle: "none",
        margin: "0.25rem 0",
        padding: "0.25rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        borderRadius: "4px",
        backgroundColor: selectedIds.includes(item.id) ? "#f0f8ff" : "transparent",
      }}
    >
      <label
        htmlFor={item.id}
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          width: "100%",
        }}
        title={`Toggle: ${item.label}`}
      >
        <input
          type="checkbox"
          id={item.id}
          name="item"
          checked={selectedIds.includes(item.id)}
          onChange={handleChange}
          style={{ cursor: "pointer" }}
        />
        <span style={{ fontSize: "0.875rem" }}>{item.label}</span>
      </label>
    </li>
  ));

  // Handle search input change
  const searchInputChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchString(event.target.value);
  };

  // Main render: search bar, clear button, and list of items
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Flex
        style={{
          position: "sticky",
          top: 0,
          width: "100%",
          padding: "0.5rem",
          zIndex: 1,
          background: "white",
          borderBottom: "1px solid #e0e0e0",
        }}
        flexDirection="column"
        gap="xs"
      >
        <Flex gap="xs" alignItems="center">
          <Input
            style={{ flex: 1 }}
            placeholder={placeholder}
            value={searchString}
            onChange={searchInputChanged}
          />
          <Button
            size="small"
            onClick={handleClearAll}
            disabled={selectedIds.length === 0}
          >
            Clear
          </Button>
        </Flex>
        {selectedIds.length > 0 && (
          <div style={{ fontSize: "0.75rem", color: "#666" }}>
            {selectedIds.length} selected
          </div>
        )}
      </Flex>
      <div style={{ flex: 1, overflow: "auto", padding: "0.25rem" }}>
        {items.length === 0 ? (
          <div style={{ padding: "1rem", textAlign: "center", color: "#666" }}>
            {iModel ? "No items found" : "No iModel loaded"}
          </div>
        ) : (
          <ul style={{ padding: 0, margin: 0 }}>{itemElements}</ul>
        )}
      </div>
    </div>
  );
}
