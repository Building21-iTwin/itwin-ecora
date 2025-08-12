/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/

import React, { useEffect, useState } from "react";
import { Button, Flex, Input, ProgressRadial } from "@itwin/itwinui-react";
import { IModelConnection } from "@itwin/core-frontend";
import { QueryRowFormat } from "@itwin/core-common";
import { schemaDiscoveryQuery } from "../utils/QueryBuilders";
import { useSelection } from "../shared/SelectionContext";

export interface SchemaBrowserProps {
  iModel: IModelConnection;
}

interface SchemaClass {
  className: string;
  schemaName: string;
  schemaLabel: string;
  classLabel: string;
  elementCount: number;
}

export function SchemaBrowser({ iModel }: SchemaBrowserProps) {
  const { selectedClassNames, setSelectedClassNames } = useSelection();
  const [schemaClasses, setSchemaClasses] = useState<SchemaClass[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchString, setSearchString] = useState<string>("");

  // Fetch schema classes whenever iModel changes
  useEffect(() => {
    let cancelled = false;
    const loadSchemaClasses = async () => {
      if (!iModel) {
        if (!cancelled) {
          setSchemaClasses([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const query = schemaDiscoveryQuery();
        const results: SchemaClass[] = [];
        const queryReader = iModel.createQueryReader(query, undefined, { rowFormat: QueryRowFormat.UseECSqlPropertyNames });
        
        for await (const row of queryReader) {
          results.push({
            className: row.className as string,
            schemaName: row.schemaName as string,
            schemaLabel: row.schemaLabel as string,
            classLabel: row.classLabel as string,
            elementCount: row.elementCount as number
          });
        }
        
        if (!cancelled) {
          setSchemaClasses(results);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setSchemaClasses([]);
          setIsLoading(false);
        }
      }
    };

    void loadSchemaClasses();
    return () => {
      cancelled = true;
    };
  }, [iModel]);

  // Handle checkbox toggle for a class
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const className = event.target.id;
    const isSelected = selectedClassNames.includes(className);
    const newSelectedClassNames = isSelected
      ? selectedClassNames.filter((name) => name !== className)
      : [...selectedClassNames, className];
    setSelectedClassNames(newSelectedClassNames);
  };

  // Clear all selections
  const handleClearAll = () => {
    if (selectedClassNames.length > 0) {
      setSelectedClassNames([]);
    }
  };

  // Filter classes by search string (case-insensitive)
  const searchTextLower = searchString.toLowerCase();
  const filteredClasses = schemaClasses.filter((schemaClass) => 
    schemaClass.classLabel.toLowerCase().includes(searchTextLower) ||
    schemaClass.schemaLabel.toLowerCase().includes(searchTextLower) ||
    schemaClass.className.toLowerCase().includes(searchTextLower)
  );

  // Render each class as a checkbox list entry
  const classElements = filteredClasses.map((schemaClass) => (
    <li
      key={schemaClass.className}
      style={{
        listStyle: "none",
        margin: "0.25rem 0",
        padding: "0.25rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        borderRadius: "4px",
        backgroundColor: selectedClassNames.includes(schemaClass.className) ? "#f0f8ff" : "transparent",
      }}
    >
      <label
        htmlFor={schemaClass.className}
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          width: "100%",
        }}
        title={`${schemaClass.schemaLabel}:${schemaClass.classLabel} (${schemaClass.elementCount.toLocaleString()} elements)`}
        aria-label={`Toggle ${schemaClass.classLabel} class selection`}
      >
        <input
          type="checkbox"
          id={schemaClass.className}
          name="class"
          checked={selectedClassNames.includes(schemaClass.className)}
          onChange={handleChange}
          style={{ cursor: "pointer" }}
        />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontSize: "0.875rem", fontWeight: "500" }}>
            {schemaClass.classLabel}
          </span>
          <span style={{ fontSize: "0.75rem", color: "#666" }}>
            {schemaClass.schemaLabel} • {schemaClass.elementCount.toLocaleString()} elements
          </span>
        </div>
      </label>
    </li>
  ));

  // Handle search input change
  const searchInputChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchString(event.target.value);
  };

  // Main render: search bar, clear button, and list of classes
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
            placeholder="Search classes and schemas..."
            value={searchString}
            onChange={searchInputChanged}
          />
          <Button
            size="small"
            onClick={handleClearAll}
            disabled={selectedClassNames.length === 0}
          >
            Clear
          </Button>
        </Flex>
        {selectedClassNames.length > 0 && (
          <div style={{ fontSize: "0.75rem", color: "#666" }}>
            {selectedClassNames.length} selected
          </div>
        )}
      </Flex>
      <div style={{ flex: 1, overflow: "auto", padding: "0.25rem" }}>
        {isLoading ? (
          <div style={{ 
            padding: "2rem", 
            textAlign: "center", 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            gap: "1rem" 
          }}>
            <ProgressRadial size="large" indeterminate={true} />
            <div style={{ color: "#666", fontSize: "0.875rem" }}>
              Loading classes...
            </div>
          </div>
        ) : schemaClasses.length === 0 ? (
          <div style={{ padding: "1rem", textAlign: "center", color: "#666" }}>
            {iModel ? "No classes found" : "No iModel loaded"}
          </div>
        ) : (
          <ul style={{ padding: 0, margin: 0 }}>{classElements}</ul>
        )}
      </div>
    </div>
  );
}
